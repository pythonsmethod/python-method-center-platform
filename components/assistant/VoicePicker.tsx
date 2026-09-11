"use client";
import { useEffect, useRef, useState } from "react";
import { builtinVoiceOptions, voiceSelectionCopy, type VoiceOption } from "@/lib/assistant/voice-options";
import type { Locale } from "@/lib/i18n/locale";

export function useVoiceChoice(locale: Locale, scope: "staff" | "client", caseId?: string) {
  const [voices, setVoices] = useState<VoiceOption[]>(builtinVoiceOptions);
  const [selected, setSelected] = useState("marin");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const storageKey = useRef<string | null>(null);
  useEffect(() => {
    const abort = new AbortController(); storageKey.current = null; setLoading(true); setUnavailable(false);
    const query = new URLSearchParams({ locale, scope }); if (caseId) query.set("caseId", caseId);
    void (async () => {
      try {
        const response = await fetch(`/api/assistant/realtime/voices?${query}`, { credentials: "same-origin", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]) });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!Array.isArray(data.voices) || typeof data.preferenceKey !== "string" || !data.preferenceKey.startsWith("anham-voice-v1:")) throw new Error();
        if (abort.signal.aborted) return;
        storageKey.current = data.preferenceKey;
        let saved: string | null = null;
        try { saved = localStorage.getItem(data.preferenceKey); } catch { /* Private browsers may refuse storage. */ }
        setVoices(data.voices);
        setLive(data.live === true);
        setSelected(data.voices.some((v: VoiceOption) => v.available && v.id === saved) ? saved! : data.defaultVoice);
      } catch { if (!abort.signal.aborted) { setVoices(builtinVoiceOptions); setSelected("marin"); setLive(false); setUnavailable(true); } }
      finally { if (!abort.signal.aborted) setLoading(false); }
    })();
    return () => abort.abort();
  }, [locale, scope, caseId]);
  function choose(id: string) {
    if (!voices.some(v => v.id === id && v.available)) return;
    setSelected(id);
    try { if (storageKey.current) localStorage.setItem(storageKey.current, id); } catch { /* Selection still works without persistence. */ }
  }
  return { voices, selected, choose, loading, live, unavailable };
}

type Props = { locale: Locale; scope: "staff" | "client"; caseId?: string; voices: VoiceOption[]; selected: string; onChange: (id: string) => void; onBusy: (busy: boolean) => void };
export function VoicePicker({ locale, scope, caseId, voices, selected, onChange, onBusy }: Props) {
  const copy = voiceSelectionCopy[locale];
  const [playing, setPlaying] = useState(false), [error, setError] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null), url = useRef<string | null>(null), request = useRef<AbortController | null>(null);
  const busyCallback = useRef(onBusy); useEffect(() => { busyCallback.current = onBusy; }, [onBusy]);
  function dispose() {
    request.current?.abort(); request.current = null;
    if (player.current) { player.current.onended = null; player.current.onerror = null; player.current.pause(); player.current.src = ""; player.current = null; }
    if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
  }
  function stop() { dispose(); setPlaying(false); busyCallback.current(false); }
  useEffect(() => () => { dispose(); busyCallback.current(false); }, []);
  async function preview() {
    if (playing) { stop(); return; }
    const abort = new AbortController(); request.current = abort;
    setError(false); setPlaying(true); busyCallback.current(true);
    try {
      const response = await fetch("/api/assistant/realtime/voices/preview", { method: "POST", credentials: "same-origin", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(25000)]), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale, scope, caseId, voice: selected }) });
      if (!response.ok) throw new Error();
      const blob = await response.blob(); if (abort.signal.aborted) return;
      const source = URL.createObjectURL(blob); url.current = source;
      const audio = new Audio(source); player.current = audio;
      audio.onended = stop; audio.onerror = () => { setError(true); stop(); };
      await audio.play();
    } catch { if (!abort.signal.aborted) { setError(true); stop(); } }
  }
  return <section className="anham-voices" aria-label={copy.label}>
    <h3>{copy.label}</h3>
    <div className="anham-voices__options" role="radiogroup" aria-label={copy.label}>
      {voices.map(v => <label className={`anham-voices__option${selected === v.id ? " is-selected" : ""}${!v.available ? " is-unavailable" : ""}`} key={v.id}>
        <input type="radio" name="anham-voice" value={v.id} checked={selected === v.id} disabled={!v.available} onChange={() => { stop(); setError(false); onChange(v.id); }} />
        <span>{v.name}{!v.available ? <small>{copy.pending}</small> : null}</span>
      </label>)}
    </div>
    <button className="anham-voices__preview" type="button" onClick={() => void preview()}>{playing ? copy.previewStop : copy.preview}</button>
    {error ? <p role="alert">{copy.previewError}</p> : null}
    <p>{copy.next} {copy.device}</p>
    {scope === "staff" ? <details><summary>{copy.customTitle}</summary><p>{copy.customInfo}</p><p>{copy.customIdentity}</p></details> : null}
  </section>;
}
