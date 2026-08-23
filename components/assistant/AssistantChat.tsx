"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useVoiceInput } from "@/components/assistant/useVoiceInput";
import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENTS_TOTAL } from "@/lib/assistant/attachments";
import { contextWindow } from "@/lib/assistant/context-window";
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
  // Photos and files for the assistant to read directly. Enabled for the
  // team and for paying clients; never for the public widget.
  attachments?: boolean;
  caseId?: string;
  locale?: Locale;
  // Where to read the previous conversation from. Passed only for people
  // with an account — for everyone else the thread starts empty every time,
  // because nothing about them is stored.
  historyEndpoint?: string;
  // A question handed in from outside — a ready first question someone
  // tapped instead of facing an empty box. Sent once, as soon as the window
  // exists to send it from.
  initialQuestion?: string | null;
  onInitialQuestionSent?: () => void;
  memoryCapture?: boolean;
};

// When the files do not fit one request, they are read in parts: each part
// is transcribed to the letter, and the full analysis is done afterwards on
// everything together.
const chatCopy = {
  ru: {
    tooMany: (count: number) => `За раз можно приложить не больше ${count} файлов.`,
    preparing: (count: number) => count > 1 ? `Готовлю ${count} файлов…` : "Готовлю файл…",
    inspectFiles: "Посмотри приложенные файлы.",
    reading: (from: number, to: number, total: number) => `Читаю файлы ${from}–${to} из ${total}…`,
    combining: "Собираю общий разбор…", history: "Ваша прошлая переписка", today: "Сегодня",
    provider: "Кто отвечает", best: "Лучший ответ (арбитр выбирает)", both: "Оба вместе (совет)",
    remove: (name: string) => `Убрать ${name}`, attach: "Прикрепить файл или фото",
    attachTitle: "Фото, PDF или текстовый файл — до 30 штук за раз. Снимки сжимаются автоматически, файлы не сохраняются на платформе.",
    extract: `Это часть присланных файлов (фотографии, сканы или PDF анализов и обследований).\nВыпиши из них максимально полно и дословно всё, что там написано. Ничего не интерпретируй и не добавляй от себя. Указывай источник каждого фрагмента.`
  },
  en: {
    tooMany: (count: number) => `You can attach no more than ${count} files at once.`,
    preparing: (count: number) => count > 1 ? `Preparing ${count} files…` : "Preparing file…",
    inspectFiles: "Please review the attached files.",
    reading: (from: number, to: number, total: number) => `Reading files ${from}–${to} of ${total}…`,
    combining: "Combining the full review…", history: "Your previous conversation", today: "Today",
    provider: "Who answers", best: "Best answer (selected by the arbiter)", both: "Both together (panel)",
    remove: (name: string) => `Remove ${name}`, attach: "Attach a file or photo",
    attachTitle: "Photos, PDFs, or text files — up to 30 at once. Images are compressed automatically and files are not stored on the platform.",
    extract: `This is one part of the attached files (photos, scans, or PDFs of test results and examinations).\nTranscribe everything in them as fully and literally as possible. Do not interpret, assess, or add anything. Identify the source file for each fragment.`
  }
} as const;

type Provider = "best" | "claude" | "gpt" | "both";

export function AssistantChat({
  endpoint,
  intro,
  placeholder,
  suggestions = [],
  providerChoice = false,
  attachments: allowAttachments = false,
  caseId,
  locale = "ru",
  historyEndpoint,
  initialQuestion = null,
  onInitialQuestionSent,
  memoryCapture = false
}: AssistantChatProps) {
  const t = getDictionary(locale).widget;
  const c = chatCopy[locale];
  const effectivePlaceholder = placeholder ?? t.placeholder;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>("best");
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [memoryState, setMemoryState] = useState<"offer" | "saving" | "saved" | "dismissed">("dismissed");
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null);
  // How many of the messages on screen came from a previous visit — they get
  // a divider so it is clear where today's conversation starts.
  const [restored, setRestored] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const voice = useVoiceInput((text) => {
    setInput((current) => (current ? `${current} ${text}` : text));
  });

  // Keep a long draft visible like a messenger composer: grow until a
  // comfortable ceiling, then scroll inside the field.
  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(Math.max(composer.scrollHeight, 96), 240)}px`;
  }, [input, voice.interim]);

  // Where a new message should leave the reader.
  //
  // Scrolling to the very bottom is right for a short reply and wrong for a
  // long one: the assistant's answers run to several paragraphs, and
  // landing at the end of one means scrolling back up to find its first
  // line. So a reply that does not fit is shown from its beginning, and
  // everything else — the person's own message, the "thinking" line, a
  // short answer — goes to the bottom as before.
  useEffect(() => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    const last = node.querySelector<HTMLElement>(
      ".assistant-msg:not(.assistant-msg--pending):last-of-type"
    );
    const lastMessage = messages[messages.length - 1];
    const longAnswer =
      !pending &&
      lastMessage?.role === "assistant" &&
      last !== null &&
      last.offsetHeight > node.clientHeight * 0.8;

    if (longAnswer && last) {
      // A few pixels of the previous message stay visible, so it is obvious
      // this is a new answer starting rather than the top of the thread.
      node.scrollTop = Math.max(0, last.offsetTop - 12);
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  // Previous conversation of a signed-in person, so they can re-read what
  // they were told instead of asking again. Failures are silent: an empty
  // thread is a normal starting point, not an error worth showing.
  useEffect(() => {
    if (!historyEndpoint) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(historyEndpoint);

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { messages?: ChatMessage[] };
        const saved = Array.isArray(data.messages) ? data.messages : [];

        if (cancelled || saved.length === 0) {
          return;
        }

        setMessages((current) => (current.length > 0 ? current : saved));
        setRestored(saved.length);
      } catch {
        // Nothing to restore — the conversation simply starts fresh.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyEndpoint]);

  async function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) {
      return;
    }

    const room = MAX_ATTACHMENTS_TOTAL - files.length;

    if (room <= 0) {
      setError(c.tooMany(MAX_ATTACHMENTS_TOTAL));
      return;
    }

    const picked = Array.from(selected).slice(0, room);

    setError(null);
    setProgress(
      c.preparing(picked.length)
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
    batch: PreparedFile[] | null,
    // What to keep in the saved conversation: the text the person actually
    // typed, or nothing at all for the technical file-reading requests.
    save?: { displayText?: string; transient?: boolean }
  ): Promise<string> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: contextWindow(history),
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
        ...(caseId ? { caseId } : {}),
        ...(save?.transient ? { transient: true } : {}),
        ...(save?.displayText ? { displayText: save.displayText } : {})
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

  // Sent once per question handed in, and never while something else is in
  // flight — a double send would ask the same thing twice and charge for it
  // twice.
  const sentQuestion = useRef<string | null>(null);

  useEffect(() => {
    if (!initialQuestion || pending || sentQuestion.current === initialQuestion) {
      return;
    }

    sentQuestion.current = initialQuestion;
    void send(initialQuestion);
    onInitialQuestionSent?.();
    // `send` intentionally stays out of the dependencies: this effect owns
    // one initial hand-off, and sentQuestion prevents duplicate paid calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, pending, onInitialQuestionSent]);

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
    setMemoryState("dismissed");
    setMemoryMessage(null);

    const question = trimmed || c.inspectFiles;

    try {
      if (attached.length === 0) {
        const reply = await ask(nextMessages, null);
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        if (memoryCapture) setMemoryState("offer");
        return;
      }

      const batches = splitIntoBatches(attached);

      if (batches.length === 1) {
        const reply = await ask(
          [...messages, { role: "user", content: question }],
          batches[0],
          { displayText: visible }
        );
        setMessages([...nextMessages, { role: "assistant", content: reply }]);
        if (memoryCapture) setMemoryState("offer");
        return;
      }

      // More files than one request can carry: read them part by part,
      // then do the whole analysis on the collected data at once.
      const extracts: string[] = [];
      let read = 0;

      for (const [index, batch] of batches.entries()) {
        setProgress(
          c.reading(read + 1, read + batch.length, attached.length)
        );

        const partReply = await ask(
          [
            {
              role: "user",
              content: `${c.extract}\n\n${locale === "ru" ? "Это часть" : "This is part"} ${index + 1} ${locale === "ru" ? "из" : "of"} ${batches.length}. ${locale === "ru" ? "Файлы" : "Files"}: ${batch
                .map((file) => file.name)
                .join(", ")}.`
            }
          ],
          batch,
          // A working step, not part of the conversation: nothing to re-read.
          { transient: true }
        );

        extracts.push(`— Часть ${index + 1} (${batch.length} файлов) —\n${partReply}`);
        read += batch.length;
      }

      setProgress(c.combining);

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
        null,
        { displayText: visible }
      );

      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      if (memoryCapture) setMemoryState("offer");
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

  async function saveMemory(collection: "book" | "method" | "client_answers") {
    if (memoryState === "saving") return;
    setMemoryState("saving");
    setMemoryMessage(null);

    try {
      const response = await fetch("/api/assistant/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contextWindow(messages), collection })
      });
      const data = await response.json().catch(() => null) as { title?: string; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? t.errorGeneric);

      setMemoryState("saved");
      setMemoryMessage(locale === "ru" ? `Сохранено: ${data?.title ?? "новое знание"}` : `Saved: ${data?.title ?? "new knowledge"}`);
    } catch (memoryError) {
      setMemoryState("offer");
      setMemoryMessage(memoryError instanceof Error ? memoryError.message : t.errorNetwork);
    }
  }

  return (
    <div className="assistant-chat">
      <div className="assistant-chat__messages" ref={scrollRef}>
        <div className="assistant-msg assistant-msg--assistant">{intro}</div>
        {restored > 0 ? (
          <p className="assistant-chat__divider">{c.history}</p>
        ) : null}
        {messages.map((message, index) => (
          <Fragment key={`${index}-${message.role}`}>
            {restored > 0 && index === restored ? (
              <p className="assistant-chat__divider">{c.today}</p>
            ) : null}
            <div className={`assistant-msg assistant-msg--${message.role}`}>
              {message.content}
            </div>
          </Fragment>
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

      {memoryCapture && memoryState !== "dismissed" ? (
        <div className="assistant-memory" role="status">
          {memoryState === "saved" ? <p>{memoryMessage}</p> : (
            <>
              <strong>{locale === "ru" ? "Professor Python, сохранить результат этого разговора?" : "Professor Python, save the result of this conversation?"}</strong>
              <div className="assistant-memory__actions">
                <button disabled={memoryState === "saving"} onClick={() => void saveMemory("book")} type="button">{locale === "ru" ? "В книгу" : "To the book"}</button>
                <button disabled={memoryState === "saving"} onClick={() => void saveMemory("method")} type="button">{locale === "ru" ? "В метод" : "To the method"}</button>
                <button disabled={memoryState === "saving"} onClick={() => void saveMemory("client_answers")} type="button">{locale === "ru" ? "В память ответов клиентам" : "To client-answer memory"}</button>
                <button disabled={memoryState === "saving"} onClick={() => { setMemoryState("dismissed"); setMemoryMessage(null); }} type="button">{locale === "ru" ? "Не сохранять" : "Do not save"}</button>
              </div>
              {memoryMessage ? <p className="form-message form-message--error">{memoryMessage}</p> : null}
            </>
          )}
        </div>
      ) : null}

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
          {c.provider}
          <select
            onChange={(event) => setProvider(event.target.value as Provider)}
            value={provider}
          >
            <option value="best">{c.best}</option>
            <option value="claude">Claude</option>
            <option value="gpt">GPT</option>
            <option value="both">{c.both}</option>
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
          ref={composerRef}
          rows={4}
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
                aria-label={c.remove(file.name)}
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
                aria-label={c.attach}
                className="assistant-chat__mic"
                onClick={() => fileInputRef.current?.click()}
                title={c.attachTitle}
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
