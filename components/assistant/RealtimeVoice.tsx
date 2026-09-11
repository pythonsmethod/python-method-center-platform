"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnhamAvatar } from "./AnhamAvatar";
import { VoiceWebResults } from "./VoiceWebResults";
import { VoicePicker, useVoiceChoice } from "./VoicePicker";
import { voiceSelectionCopy } from "@/lib/assistant/voice-options";
import { RealtimeBrowser } from "@/lib/assistant/realtime-browser";
import { LiveUsage } from "./LiveUsage";
import { LiveBrowser } from "@/lib/assistant/live-browser";
import { voiceCopy, voiceErrorMessage, type VoiceState } from "@/lib/assistant/realtime-contract";
import type { VoiceExchange, VoiceTranscript } from "@/lib/assistant/realtime-turns";
import type { Locale } from "@/lib/i18n/locale";

type Props = { locale: Locale; scope: "client" | "staff"; caseId?: string; disabled?: boolean; onActive: (active: boolean) => void; onExchange?: (pair: VoiceExchange) => void; onTranscript?: (text: VoiceTranscript, sessionId: string) => void };
export function RealtimeVoice({ locale, scope, caseId, disabled, onActive, onExchange, onTranscript }: Props) {
  const copy = voiceCopy[locale];
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [open, setOpen] = useState(false);
  const choice = useVoiceChoice(locale, scope, caseId);
  const [choosing, setChoosing] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [latest, setLatest] = useState<VoiceTranscript | null>(null);
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<"interrupted" | "duration" | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "saveError">("idle");
  const controller = useRef<RealtimeBrowser | LiveBrowser | null>(null);
  const [muted, setMuted] = useState(false);
  const [usage, setUsage] = useState({ seconds: 0, usd: 0, finalized: false });
  const callbacks = useRef({ onActive, onExchange, onTranscript });
  const pending = useRef<{ pair: VoiceExchange; receipt: string }[]>([]);
  const writing = useRef(false);
  const mounted = useRef(true);
  const running = useRef(false);
  const epoch = useRef(0);
  useEffect(() => { callbacks.current = { onActive, onExchange, onTranscript }; }, [onActive, onExchange, onTranscript]);
  const active = !["idle", "ended", "error", "paused"].includes(state);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, [open]);

  function close() {
    controller.current?.stop();
    dialogRef.current?.close();
    setOpen(false);
  }

  // Keyed by locale/scope/Case in AssistantChat; navigation always releases audio.
  useEffect(() => {
    mounted.current = true;
    const stop = () => controller.current?.stop();
    window.addEventListener("pagehide", stop);
    return () => {
      mounted.current = false;
      controller.current?.stop();
      callbacks.current.onActive(false);
      window.removeEventListener("pagehide", stop);
    };
  }, []);

  async function flush() {
    if (writing.current) return;
    writing.current = true;
    if (mounted.current) setSaving("saving");
    try {
      while (pending.current.length) {
        const entry = pending.current[0];
        const body = JSON.stringify({ ...entry.pair, webResults: undefined, receipt: entry.receipt, locale, scope, caseId });
        const response = await fetch("/api/assistant/realtime/transcript", {
          method: "POST", credentials: "same-origin", keepalive: new TextEncoder().encode(body).length < 60000,
          signal: AbortSignal.timeout(15_000),
          headers: { "Content-Type": "application/json", "Accept-Language": locale },
          body,
        });
        if (!response.ok || (await response.json()).saved !== true) throw new Error();
        pending.current.shift();
      }
      if (mounted.current) setSaving("saved");
    } catch { if (mounted.current) setSaving("saveError"); }
    finally { writing.current = false; }
  }

  function start() {
    if (running.current || disabled || pending.current.length || choice.loading || choice.unavailable || previewBusy) return;
    setChoosing(false);
    running.current = true;
    const sessionId = crypto.randomUUID();
    const generation = ++epoch.current;
    const isCurrent = () => mounted.current && epoch.current === generation;
    setError(null); setNotice(null); setLatest(null);
    callbacks.current.onActive(true);
    if (choice.live) {
      setMuted(false);
      setUsage({ seconds: 0, usd: 0, finalized: false }); setSaving("idle");
      controller.current = new LiveBrowser({ locale, scope, caseId, voice: choice.selected,
        onState: next => { if (isCurrent()) { running.current = !["idle", "ended", "error", "paused"].includes(next); setState(next); callbacks.current.onActive(running.current); } },
        onError: code => { if (isCurrent()) setError(voiceErrorMessage(code, locale)); },
        onTranscript: text => { if (mounted.current) { if (isCurrent()) setLatest(text); callbacks.current.onTranscript?.(text, sessionId); } },
        onSaving: next => { if (isCurrent()) setSaving(next); },
        onUsage: (seconds, usd, finalized) => { if (isCurrent()) setUsage({ seconds, usd, finalized }); },
      });
      void controller.current.start(); return;
    }
    controller.current = new RealtimeBrowser({
      locale, scope, caseId, voice: choice.selected,
      onState: next => { running.current = !["idle", "ended", "error"].includes(next); if (mounted.current) { setState(next); callbacks.current.onActive(running.current); } },
      onError: code => { if (mounted.current) setError(voiceErrorMessage(code, locale)); },
      onIncomplete: () => { if (mounted.current) setNotice("interrupted"); },
      onDuration: () => { if (mounted.current) setNotice("duration"); },
      onTranscript: text => { if (mounted.current) { setLatest(text); callbacks.current.onTranscript?.(text, sessionId); } },
      onExchange: (pair, receipt) => {
        pending.current.push({ pair, receipt });
        if (mounted.current) callbacks.current.onExchange?.(pair);
        void flush();
      },
    });
    void controller.current.start();
  }

  return <>
    <button className="assistant-voice-launcher" type="button" aria-label={copy.start} title={copy.start}
      aria-haspopup="dialog" aria-expanded={open} disabled={(disabled && !active) || choice.loading || choice.unavailable}
      onClick={() => { setOpen(true); if (!choice.live) start(); }}>
      <AnhamAvatar size={44} />
      {saving === "saveError" ? <span className="assistant-voice-launcher__notice" aria-label={copy.saveError}>!</span> : null}
    </button>
    {open ? createPortal(<dialog className="anham-call" ref={dialogRef} aria-labelledby={`${descriptionId}-title`}
      onCancel={event => { event.preventDefault(); close(); }}>
      <div className="anham-call__layout" data-state={state}>
        <header className="anham-call__header">
          <div><small>{copy.idle}</small><h2 id={`${descriptionId}-title`}>{locale === "ru" ? "Анхам" : "Anham"}</h2></div>
          <button className="anham-call__voice-choice" type="button" aria-expanded={choosing}
            onClick={() => { controller.current?.stop(); setChoosing(!choosing); }}>
            {voiceSelectionCopy[locale].label}: {choice.voices.find(v => v.id === choice.selected)?.name}
          </button>
          <button className="anham-call__close" type="button" aria-label={copy.close} title={copy.close} onClick={close}>×</button>
        </header>
        {choosing ? <VoicePicker locale={locale} scope={scope} caseId={caseId} voices={choice.voices} selected={choice.selected} onChange={choice.choose} onBusy={setPreviewBusy} /> : <><div className="anham-call__stage">
          <div className="anham-call__portrait" aria-hidden="true"><AnhamAvatar size={280} /></div>
          <p className="anham-call__state" role="status">{copy[state]}</p>
          <span className="anham-call__waves" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        </div>
        <div className="anham-call__transcript" tabIndex={0} aria-label={copy.conversationText}>
          {latest ? <>
            <p className="anham-call__user"><small>{locale === "ru" ? "Вы" : "You"}</small>{latest.user}</p>
            {latest.assistant ? <p><small>{locale === "ru" ? "Анхам" : "Anham"}</small>{latest.assistant}</p> : null}
            <VoiceWebResults results={latest.webResults} locale={locale} />
          </> : <p className="anham-call__hint">{copy.callHint}</p>}
        </div></>}
        <footer className="anham-call__footer">
          {choice.live ? <>
            <small>{locale === "ru" ? "При запуске звук и необходимый контекст передаются OpenAI. Расшифровка сохраняется в вашей истории ANHAM. Пауза завершает голосовое соединение." : "Starting sends audio and necessary context to OpenAI. Transcripts are saved in your ANHAM history. Pause ends the voice connection."}</small>
            <LiveUsage locale={locale} showCosts={choice.showLiveCosts} {...usage} />
            {active ? <div>
              <button type="button" onClick={() => { if (controller.current instanceof LiveBrowser) { controller.current.mute(); setMuted(!muted); } }}>{muted ? (locale === "ru" ? "Включить микрофон" : "Unmute microphone") : (locale === "ru" ? "Выключить микрофон" : "Mute microphone")}</button>
              <button type="button" onClick={() => { if (controller.current instanceof LiveBrowser) controller.current.pause(); }}>{locale === "ru" ? "Пауза" : "Pause"}</button>
            </div> : null}
          </> : null}
          {error ? <p role="alert" className="form-message form-message--error">{error}</p> : null}
          {notice ? <p role="status">{copy[notice]}</p> : null}
          {saving !== "idle" ? <p role="status">{copy[saving]} {saving === "saveError" && !choice.live ? <button type="button" onClick={() => void flush()}>{copy.retrySave}</button> : null}</p> : null}
          {active ? <button type="button" className="anham-call__end" onClick={close}><span aria-hidden="true">■</span> {copy.stop}</button>
            : <button type="button" className="anham-call__end" disabled={disabled || saving === "saving" || saving === "saveError" || previewBusy || choice.loading} onClick={start}>{state === "error" ? copy.retry : copy.start}</button>}
          <small>{copy.transcript}</small>
        </footer>
      </div>
    </dialog>, document.body) : null}
  </>;
}
