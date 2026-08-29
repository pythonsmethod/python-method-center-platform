"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type VoiceRecorderProps = {
  labels: Dictionary["cabinet"]["voice"];
  caseId?: string;
  onSent?: () => void | Promise<void>;
};

type RecorderPhase = "idle" | "recording" | "preview" | "sending";

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    // Prefer AAC in an MP4 container whenever the browser can record it.
    // Safari/iOS plays this natively; choosing WebM first made voice notes
    // recorded by Karen hang forever in some clients' iPhone players.
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg"
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VoiceRecorder({ caseId, onSent, labels: t }: VoiceRecorderProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined"
    );

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm"
        });

        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase("preview");
      };

      recorderRef.current = recorder;
      durationRef.current = 0;
      setSeconds(0);
      setPhase("recording");
      recorder.start();

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setSeconds(durationRef.current);

        if (durationRef.current >= 600) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setError(t.errorMic);
      setPhase("idle");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function discard() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    blobRef.current = null;
    setPreviewUrl(null);
    setSeconds(0);
    setPhase("idle");
  }

  async function sendVoice() {
    const blob = blobRef.current;

    if (!blob) {
      return;
    }

    setPhase("sending");
    setError(null);

    const form = new FormData();
    form.append("audio", blob);
    form.append("duration", String(durationRef.current));

    if (caseId) {
      form.append("caseId", caseId);
    }

    try {
      const response = await fetch("/api/messages/audio", {
        method: "POST",
        body: form
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? t.errorSend);
        setPhase("preview");
        return;
      }

      discard();

      if (onSent) {
        await onSent();
      } else {
        router.refresh();
      }
    } catch {
      setError(t.errorNetwork);
      setPhase("preview");
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <div className="voice-recorder">
      {phase === "idle" ? (
        <button
          className="button button--secondary"
          onClick={() => void startRecording()}
          type="button"
        >
          {`🎙️ ${t.record}`}
        </button>
      ) : null}

      {phase === "recording" ? (
        <div className="voice-recorder__row">
          <span className="voice-recorder__live">● {t.recording} {formatSeconds(seconds)}</span>
          <button className="button" onClick={stopRecording} type="button">
            {`⏹ ${t.stop}`}
          </button>
        </div>
      ) : null}

      {phase === "preview" && previewUrl ? (
        <div className="voice-recorder__row voice-recorder__row--preview">
          <audio controls preload="metadata" src={previewUrl} />
          <div className="voice-recorder__preview-actions">
            <button className="button" onClick={() => void sendVoice()} type="button">
              {t.send}
            </button>
            <button
              className="button button--secondary"
              onClick={discard}
              type="button"
            >
              {t.discard}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "sending" ? (
        <p className="voice-recorder__status">{t.sending}</p>
      ) : null}

      {error ? <p aria-live="assertive" className="form-message form-message--error" role="alert">{error}</p> : null}
    </div>
  );
}
