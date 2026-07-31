"use client";

import { useEffect, useRef, useState } from "react";
import { useVoiceInput } from "@/components/assistant/useVoiceInput";
import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENTS_TOTAL } from "@/lib/assistant/attachments";
import {
  prepareFiles,
  splitIntoBatches,
  type PreparedFile
} from "@/lib/assistant/prepare-files";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type AssistantChatProps = {
  endpoint: string;
  intro: string;
  placeholder?: string;
  suggestions?: string[];
  providerChoice?: boolean;
  // Team-only: photos and files for the assistant to look at. Never
  // enabled for the public widget.
  attachments?: boolean;
  caseId?: string;
  locale?: Locale;
};

// When the files do not fit one request, they are read in parts: each part
// is transcribed to the letter, and the full analysis is done afterwards on
// everything together.
const EXTRACT_INSTRUCTION = `Это часть присланных файлов (фотографии, сканы или PDF анализов и обследований).
Выпиши из них МАКСИМАЛЬНО ПОЛНО и дословно всё, что там написано: названия исследований, показатели, значения, единицы измерения, референсные диапазоны, даты, заключения врачей, назначения.
Ничего не интерпретируй, не оценивай и не добавляй от себя — только то, что действительно написано в файлах.
Указывай, из какого файла что взято. Если фрагмент нечитаем — так и напиши.`;

type Provider = "best" | "claude" | "gpt" | "both";

export function AssistantChat({
  endpoint,
  intro,
  placeholder,
  suggestions = [],
  providerChoice = false,
  attachments: allowAttachments = false,
  caseId,
  locale = "ru"
}: AssistantChatProps) {
  const t = getDictionary(locale).widget;
  const effectivePlaceholder = placeholder ?? t.placeholder;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("best");
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const voice = useVoiceInput((text) => {
    setInput((current) => (current ? `${current} ${text}` : text));
  });

  useEffect(() => {
    const node = scrollRef.current;

    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, pending]);

  async function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) {
      return;
    }

    const room = MAX_ATTACHMENTS_TOTAL - files.length;

    if (room <= 0) {
      setError(`За раз можно приложить не больше ${MAX_ATTACHMENTS_TOTAL} файлов.`);
      return;
    }

    const picked = Array.from(selected).slice(0, room);

    setError(null);
    setProgress(
      picked.length > 1
        ? `Готовлю ${picked.length} файлов…`
        : "Готовлю файл…"
    );

    // Photos are downscaled here, in the browser: thirty phone snapshots
    // would never fit a request at their original size.
    const result = await prepareFiles(picked, files.length);

    setProgress(null);

    if (result.errors.length > 0) {
      setError(result.errors.join(" "));
    }

    if (result.files.length > 0) {
      setFiles((current) => [...current, ...result.files]);
    }
  }

  // One call to the API. Returns the reply or throws with a message the
  // person can read.
  async function ask(
    history: ChatMessage[],
    batch: PreparedFile[] | null
  ): Promise<string> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history,
        ...(batch && batch.length
          ? {
              attachments: batch.map((file) => ({
                name: file.name,
                mediaType: file.mediaType,
                data: file.data
              }))
            }
          : {}),
        locale,
        ...(providerChoice ? { provider } : {}),
        ...(caseId ? { caseId } : {})
      })
    });

    const data = (await response.json().catch(() => null)) as
      | { reply?: string; error?: string }
      | null;

    if (!response.ok || !data?.reply) {
      throw new Error(data?.error ?? t.errorGeneric);
    }

    return data.reply;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    const attached = files;

    if ((!trimmed && attached.length === 0) || pending) {
      return;
    }

    const visible = attached.length
      ? `${trimmed}${trimmed ? "\n" : ""}📎 ${attached.map((file) => file.name).join(", ")}`
      : trimmed;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: visible }
    ];

    setMessages(nextMessages);
    setInput("");
    setFiles([]);
    setError(null);
    setPending(true);

    const question = trimmed || "Посмотри приложенные файлы.";

    try {
      if (attached.length === 0) {
        const reply = await ask(nextMessages, null);
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        return;
      }

      const batches = splitIntoBatches(attached);

      if (batches.length === 1) {
        const reply = await ask(
          [...messages, { role: "user", content: question }],
          batches[0]
        );
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        return;
      }

      // More files than one request can carry: read them part by part,
      // then do the whole analysis on the collected data at once.
      const extracts: string[] = [];
      let read = 0;

      for (const [index, batch] of batches.entries()) {
        setProgress(
          `Читаю файлы ${read + 1}–${read + batch.length} из ${attached.length}…`
        );

        const partReply = await ask(
          [
            {
              role: "user",
              content: `${EXTRACT_INSTRUCTION}\n\nЭто часть ${index + 1} из ${batches.length}. Файлы: ${batch
                .map((file) => file.name)
                .join(", ")}.`
            }
          ],
          batch
        );

        extracts.push(`— Часть ${index + 1} (${batch.length} файлов) —\n${partReply}`);
        read += batch.length;
      }

      setProgress("Собираю общий разбор…");

      const reply = await ask(
        [
          ...messages,
          {
            role: "user",
            content: `${question}\n\nНиже — выписки из ${attached.length} присланных файлов, прочитанных по частям. Работай с ними как с исходными данными кейса.\n\n${extracts.join(
              "\n\n"
            )}`
          }
        ],
        null
      );

      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch (sendError) {
      setError(
        sendError instanceof Error && sendError.message
          ? sendError.message
          : t.errorNetwork
      );
    } finally {
      setProgress(null);
      setPending(false);
    }
  }

  return (
    <div className="assistant-chat">
      <div className="assistant-chat__messages" ref={scrollRef}>
        <div className="assistant-msg assistant-msg--assistant">{intro}</div>
        {messages.map((message, index) => (
          <div
            className={`assistant-msg assistant-msg--${message.role}`}
            key={`${index}-${message.role}`}
          >
            {message.content}
          </div>
        ))}
        {!pending && progress ? (
          <div className="assistant-msg assistant-msg--assistant assistant-msg--pending">
            {progress}
          </div>
        ) : null}
        {pending ? (
          <div className="assistant-msg assistant-msg--assistant assistant-msg--pending">
            {progress ?? t.sending}
          </div>
        ) : null}
        {error ? <p className="form-message form-message--error">{error}</p> : null}
      </div>

      {messages.length === 0 && suggestions.length > 0 ? (
        <div className="assistant-chat__suggestions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => void send(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      {providerChoice ? (
        <label className="assistant-chat__provider">
          Кто отвечает
          <select
            onChange={(event) => setProvider(event.target.value as Provider)}
            value={provider}
          >
            <option value="best">Лучший ответ (арбитр выбирает)</option>
            <option value="claude">Claude</option>
            <option value="gpt">GPT</option>
            <option value="both">Оба вместе (совет)</option>
          </select>
        </label>
      ) : null}

      <form
        className="assistant-chat__form"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <textarea
          maxLength={4000}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          placeholder={voice.listening ? t.listening : effectivePlaceholder}
          rows={2}
          value={voice.interim ? `${input}${input ? " " : ""}${voice.interim}` : input}
        />
        {voice.listening ? (
          <p className="assistant-chat__voice-hint">
            {t.voiceHint}
          </p>
        ) : null}
        {allowAttachments && files.length > 0 ? (
          <ul className="assistant-chat__files">
            {files.map((file) => (
              <li key={file.id}>
                <span>📎 {file.name}</span>
                <button
                  aria-label={`Убрать ${file.name}`}
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((item) => item.id !== file.id)
                    )
                  }
                  type="button"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="assistant-chat__actions">
          {allowAttachments ? (
            <>
              <input
                accept={ACCEPT_ATTRIBUTE}
                className="assistant-chat__file-input"
                multiple
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                type="file"
              />
              <button
                aria-label="Прикрепить файл или фото"
                className="assistant-chat__mic"
                onClick={() => fileInputRef.current?.click()}
                title="Фото, PDF или текстовый файл — до 30 штук за раз. Снимки сжимаются автоматически, файлы не сохраняются на платформе."
                type="button"
              >
                📎
              </button>
            </>
          ) : null}
          {voice.supported ? (
            <button
              aria-label={voice.listening ? t.micStop : t.micStart}
              className={`assistant-chat__mic${voice.listening ? " assistant-chat__mic--on" : ""}`}
              onClick={voice.toggle}
              type="button"
            >
              🎤
            </button>
          ) : null}
          <button
            className="button"
            disabled={pending || (!input.trim() && files.length === 0)}
            type="submit"
          >
            {t.send}
          </button>
        </div>
      </form>
    </div>
  );
}
