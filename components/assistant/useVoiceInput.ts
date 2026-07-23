"use client";

import { useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in the TS dom lib).
type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

function getRecognitionConstructor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") {
    return null;
  }

  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Voice dictation via the browser's built-in speech recognition
// (Chrome, Safari, Edge; Russian by default). Final phrases are delivered
// through onFinalText; interim text is exposed for live preview.
export function useVoiceInput(onFinalText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalText);

  onFinalRef.current = onFinalText;

  useEffect(() => {
    setSupported(getRecognitionConstructor() !== null);

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  }

  function start() {
    const Ctor = getRecognitionConstructor();

    if (!Ctor || listening) {
      return;
    }

    const recognition = new Ctor();
    recognition.lang = document.documentElement.lang === "en" ? "en-US" : "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          if (transcript.trim()) {
            onFinalRef.current(transcript.trim());
          }
        } else {
          interimText += transcript;
        }
      }

      setInterim(interimText);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setListening(true);
    setInterim("");
    recognition.start();
  }

  function toggle() {
    if (listening) {
      stop();
    } else {
      start();
    }
  }

  return { supported, listening, interim, toggle };
}
