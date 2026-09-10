"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { AssistantOutreachPreference } from "@/components/assistant/AssistantOutreachPreference";
import { useVoiceInput } from "@/components/assistant/useVoiceInput";
import { RealtimeVoice } from "./RealtimeVoice";
import { VoiceWebResults } from "./VoiceWebResults";
import { voiceCopy } from "@/lib/assistant/realtime-contract";
import { mergeVoiceTranscript, type VoiceChatMessage } from "@/lib/assistant/voice-chat";
import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENTS_TOTAL } from "@/lib/assistant/attachments";
import { contextWindow } from "@/lib/assistant/context-window";
import { memoryCollectionFromCommand, type MemoryCollection } from "@/lib/assistant/memory";
import {
  prepareFiles,
  splitIntoBatches,
  type PreparedFile
} from "@/lib/assistant/prepare-files";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/locale";
import { formatDateTime } from "@/lib/i18n/format";

type ChatMessage = VoiceChatMessage & {
  role: "user" | "assistant";
  content: string;
  id?: string;
  created_at?: string;
  message_sequence?: number;
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
  voiceScope?: "client" | "staff";
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
  onUseReply?: (text: string) => void;
  useReplyLabel?: string;
  replyUsedLabel?: string;
  // Optional structured context for a purpose-built endpoint. Generic chat
  // endpoints ignore it; the chess endpoint uses it for the live position.
  requestContext?: Record<string, string>;
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
    extract: `Это одна партия фотографий, сканов или PDF анализов. Выполни только точную расшифровку, без медицинского разбора. Для каждого файла отдельно выпиши все видимые строки: название показателя, результат, знак < или >, единицу, референс, дату и примечание. После первого чтения второй раз сверь каждую цифру и единицу с изображением. Не исправляй и не угадывай. Помечай [НЕЧИТАЕМО: файл, конкретная строка/поле] только если это место видно, но символ действительно нельзя различить. Отсутствующие на странице исследования не считай непрочитанными. Не повторяй замечания.`
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
    extract: `This is one batch of photos, scans, or PDFs of test results. Perform exact transcription only, without medical interpretation. For each file separately, record every visible row: test name, result, < or > sign, unit, reference range, date, and laboratory note. After the first reading, check every number and unit against the image a second time. Do not correct or guess. Use [UNREADABLE: file, exact row/field] only when the location is visible but a character truly cannot be distinguished. Do not call tests absent from the page unreadable. Do not repeat issues.`
  }
} as const;

type Provider = "best" | "claude" | "gpt" | "both";

export function AssistantChat(props: AssistantChatProps) {
  return <AssistantChatSession key={`${props.endpoint}:${props.caseId ?? "personal"}`} {...props} />;
}

function AssistantChatSession({
  endpoint,
  intro,
  placeholder,
  suggestions = [],
  providerChoice = false,
  attachments: allowAttachments = false,
  caseId,
  voiceScope,
  locale = "ru",
  historyEndpoint,
  initialQuestion = null,
  onInitialQuestionSent,
  memoryCapture = false,
  onUseReply,
  useReplyLabel,
  replyUsedLabel,
  requestContext
}: AssistantChatProps) {
  voiceScope ??= endpoint === "/api/assistant/staff" ? "staff" : undefined;
  historyEndpoint ??= endpoint === "/api/assistant/staff"
    ? `/api/assistant/history?scope=private${caseId ? `&caseId=${encodeURIComponent(caseId)}` : ""}`
    : undefined;
  const t = getDictionary(locale).widget;
  const c = chatCopy[locale];
  const effectivePlaceholder = placeholder ?? t.placeholder;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(Boolean(historyEndpoint));
  const [historyError, setHistoryError] = useState(false);
  const [historyRetry, setHistoryRetry] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const savedExchange = useRef<ChatMessage[] | null>(null);
  const [provider, setProvider] = useState<Provider>("best");
  const [files, setFiles] = useState<PreparedFile[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [memoryState, setMemoryState] = useState<"offer" | "saving" | "saved" | "dismissed">("dismissed");
  const [memoryMessage, setMemoryMessage] = useState<string | null>(null);
  // How many of the messages on screen came from a previous visit — they get
  // a divider so it is clear where today's conversation starts.
  const [restored, setRestored] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const olderScroll = useRef<{ height: number; top: number } | null>(null);
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
    if (olderScroll.current) {
      node.scrollTop = olderScroll.current.top + node.scrollHeight - olderScroll.current.height;
      olderScroll.current = null;
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

  // Restore before sending so a slow history request cannot lose the thread.
  useEffect(() => {
    if (!historyEndpoint) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setHistoryLoading(true);
      setHistoryError(false);
      try {
        const response = await fetch(historyEndpoint, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("HISTORY_UNAVAILABLE");
        }

        const data = (await response.json()) as { messages?: ChatMessage[]; hasMore?: boolean };
        const saved = Array.isArray(data.messages) ? data.messages : [];

        if (cancelled) {
          return;
        }

        setMessages((current) => (current.length > 0 ? current : saved));
        setRestored(saved.length);
        setHasMore(data.hasMore === true);
      } catch {
        if (!cancelled) setHistoryError(true);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [historyEndpoint, historyRetry]);

  async function loadEarlier() {
    if (!historyEndpoint || historyLoading || voiceActive) return;
    const before = messages[0]?.message_sequence;
    if (!before) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const response = await fetch(`${historyEndpoint}${historyEndpoint.includes("?") ? "&" : "?"}before=${before}`, { cache: "no-store" });
      if (!response.ok) throw new Error("HISTORY_UNAVAILABLE");
      const data = await response.json() as { messages: ChatMessage[]; hasMore: boolean };
      if (scrollRef.current) olderScroll.current = { height: scrollRef.current.scrollHeight, top: scrollRef.current.scrollTop };
      setMessages(current => [...data.messages.filter(item => !current.some(existing => existing.id === item.id)), ...current]);
      setRestored(current => current + data.messages.length);
      setHasMore(data.hasMore);
    } catch { setHistoryError(true); }
    finally { setHistoryLoading(false); }
  }

  function appendReply(current: ChatMessage[], reply: string) {
    const saved = savedExchange.current;
    setMessages(saved?.length === 2
      ? [...current.slice(0, -1), ...saved]
      : [...current, { role: "assistant", content: reply, created_at: new Date().toISOString() }]);
  }

  function downloadConversation() {
    const text = messages.map(message => `${message.created_at ? formatDateTime(message.created_at, locale) : ""} · ${message.role === "user" ? (locale === "ru" ? "Вы" : "You") : "Anham"}\n${message.content}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `anham-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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
    save?: { displayText?: string; transient?: boolean; memoryConfirmation?: boolean }
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
        ...(save?.memoryConfirmation ? { memoryConfirmation: true } : {}),
        ...(!save?.transient ? { displayText: save?.displayText ?? history[history.length - 1]?.content } : {}),
        ...(requestContext ? { requestContext } : {})
      })
    });

    const data = (await response.json().catch(() => null)) as
      | { reply?: string; error?: string; saved?: boolean; messages?: ChatMessage[] }
      | null;

    if (!response.ok || !data?.reply) {
      throw new Error(data?.error ?? t.errorGeneric);
    }

    if (!save?.transient) {
      savedExchange.current = data.saved ? data.messages ?? null : null;
      if (data.saved === false) setSaveFailed(true);
    }
    return data.reply;
  }

  // Sent once per question handed in, and never while something else is in
  // flight — a double send would ask the same thing twice and charge for it
  // twice.
  const sentQuestion = useRef<string | null>(null);

  useEffect(() => {
    if (!initialQuestion || pending || voiceActive || historyLoading || historyError || sentQuestion.current === initialQuestion) {
      return;
    }

    sentQuestion.current = initialQuestion;
    void send(initialQuestion);
    onInitialQuestionSent?.();
    // `send` intentionally stays out of the dependencies: this effect owns
    // one initial hand-off, and sentQuestion prevents duplicate paid calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, pending, voiceActive, historyLoading, historyError, onInitialQuestionSent]);

  async function send(text: string, baseMessages: ChatMessage[] = messages) {
    const trimmed = text.trim();
    const attached = files;

    if ((!trimmed && attached.length === 0) || pending || voiceActive || historyLoading || historyError) {
      return;
    }

    const requestedMemory = memoryCapture && attached.length === 0
      ? memoryCollectionFromCommand(trimmed)
      : null;

    if (requestedMemory) {
      const commandMessage: ChatMessage = { role: "user", content: trimmed, created_at: new Date().toISOString() };
      const next = [...baseMessages, commandMessage];
      setMessages(next);
      setInput("");
      setError(null);
      setMemoryState("offer");
      setMemoryMessage(null);
      setPending(true);
      try {
        const reply = await ask(next, null, { memoryConfirmation: true });
        appendReply(next, reply);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : t.errorNetwork);
      } finally { setPending(false); }
      return;
    }

    const visible = attached.length
      ? `${trimmed}${trimmed ? "\n" : ""}📎 ${attached.map((file) => file.name).join(", ")}`
      : trimmed;

    const nextMessages: ChatMessage[] = [
      ...baseMessages,
      { role: "user", content: visible, created_at: new Date().toISOString() }
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
        appendReply(nextMessages, reply);
        if (memoryCapture) setMemoryState("offer");
        return;
      }

      const batches = splitIntoBatches(attached);

      if (batches.length === 1) {
        const reply = await ask(
          [...baseMessages, { role: "user", content: question }],
          batches[0],
          { displayText: visible }
        );
        appendReply(nextMessages, reply);
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

        extracts.push(`${locale === "ru" ? "Партия" : "Batch"} ${index + 1} (${batch.length} ${locale === "ru" ? "файлов" : "files"}):\n${partReply}`);
        read += batch.length;
      }

      setProgress(c.combining);

      const reply = await ask(
        [
            ...baseMessages,
          {
            role: "user",
            content: locale === "ru"
              ? `${question}\n\nНиже — проверенные расшифровки ${attached.length} файлов, прочитанных партиями. Объедини их без потери показателей. Удали повторы. Не превращай отсутствующие исследования в «непрочитанные». В конце перечисли только уникальные пометки [НЕЧИТАЕМО] с точным именем файла и строкой; если их нет, напиши «Всё значимое читается».\n\n${extracts.join("\n\n")}`
              : `${question}\n\nBelow are verified transcriptions of ${attached.length} files read in batches. Combine them without dropping any results. Remove duplicates. Do not turn absent tests into “unreadable” items. At the end, list only unique [UNREADABLE] markers with the exact file and row; if there are none, write “All material information is readable.”\n\n${extracts.join("\n\n")}`
          }
        ],
        null,
        { displayText: visible }
      );

      appendReply(nextMessages, reply);
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

  async function saveMemory(collection: MemoryCollection, sourceMessages = messages): Promise<boolean> {
    if (memoryState === "saving") return false;
    setMemoryState("saving");
    setMemoryMessage(null);

    try {
      const response = await fetch("/api/assistant/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept-Language": locale },
        body: JSON.stringify({ messages: contextWindow(sourceMessages), collection })
      });
      const data = await response.json().catch(() => null) as { title?: string; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? t.errorGeneric);

      setMemoryState("saved");
      setMemoryMessage(locale === "ru" ? `Сохранено: ${data?.title ?? "новое знание"}` : `Saved: ${data?.title ?? "new knowledge"}`);
      return true;
    } catch (memoryError) {
      setMemoryState("offer");
      setMemoryMessage(memoryError instanceof Error ? memoryError.message : t.errorNetwork);
      return false;
    }
  }

  const [usedReplyIndex, setUsedReplyIndex] = useState<number | null>(null);

  return (
    <div className="assistant-chat">
      {historyEndpoint === "/api/assistant/history" ? <AssistantOutreachPreference locale={locale} /> : null}
      <div className="assistant-chat__messages" ref={scrollRef}>
        <div className="assistant-msg assistant-msg--assistant">{intro}</div>
        {historyLoading ? <p role="status">{locale === "ru" ? "Загружаю переписку…" : "Loading conversation…"}</p> : null}
        {hasMore ? <button type="button" disabled={historyLoading || pending || voiceActive} onClick={() => void loadEarlier()}>{locale === "ru" ? "Загрузить более ранние сообщения" : "Load earlier messages"}</button> : null}
        {restored > 0 ? (
          <p className="assistant-chat__divider">{c.history}</p>
        ) : null}
        {messages.map((message, index) => (
          <Fragment key={`${index}-${message.role}`}>
            {restored > 0 && index === restored ? (
              <p className="assistant-chat__divider">{c.today}</p>
            ) : null}
            <div className={`assistant-msg assistant-msg--${message.role}`}>
              {message.created_at ? <time className="assistant-log__meta" dateTime={message.created_at}>{formatDateTime(message.created_at, locale)}</time> : null}
              {message.content}
              {message.source === "voice_transcript" ? <small className="assistant-log__meta">{locale === "ru" ? "Голос · непроверенная расшифровка" : "Voice · unverified transcript"}</small> : null}
              {message.voice_state === "interrupted" ? <small className="assistant-log__meta">{locale === "ru" ? "Прервано · текст ответа мог прозвучать не полностью" : "Interrupted · reply text may not have been fully spoken"}</small> : null}
              {message.role === "assistant" ? <VoiceWebResults results={message.web_results} locale={locale} /> : null}
              {message.role === "assistant" && !message.voiceLive && onUseReply ? (
                <button
                  className="assistant-msg__use-reply"
                  onClick={() => {
                    onUseReply(message.content);
                    setUsedReplyIndex(index);
                  }}
                  type="button"
                >
                  {usedReplyIndex === index
                    ? (replyUsedLabel ?? (locale === "ru" ? "Перенесено в ответ" : "Added to reply"))
                    : (useReplyLabel ?? (locale === "ru" ? "Вставить в ответ клиенту" : "Insert into client reply"))}
                </button>
              ) : null}
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
        {error ? <p aria-live="assertive" className="form-message form-message--error" role="alert">{error}</p> : null}
      </div>

      {historyError ? <p role="alert">{locale === "ru" ? "Не удалось загрузить историю. Попробуйте ещё раз." : "Could not load history. Please try again."} <button type="button" onClick={() => setHistoryRetry(value => value + 1)}>{locale === "ru" ? "Повторить" : "Retry"}</button></p> : null}
      {saveFailed ? <p role="alert">{locale === "ru" ? "Не удалось подтвердить сохранение сообщения после повторных попыток. До закрытия страницы доступна копия переписки." : "Message storage could not be confirmed after retries. A copy is available until you close this page."} <button type="button" onClick={downloadConversation}>{locale === "ru" ? "Скачать копию" : "Download a copy"}</button></p> : null}
      {!historyEndpoint && endpoint === "/api/assistant/client" ? <p>{locale === "ru" ? "Чтобы переписка сохранялась между посещениями, войдите в аккаунт." : "Sign in to keep your conversation between visits."}</p> : null}

      {memoryCapture && memoryState !== "dismissed" ? (
        <div className="assistant-memory" role="status">
          {memoryState === "saved" ? <p>{memoryMessage}</p> : (
            <>
              <strong>{locale === "ru" ? "Professor Python, что сделать с этим результатом?" : "Professor Python, what should be done with this result?"}</strong>
              <div className="assistant-memory__actions">
                <button disabled={memoryState === "saving"} onClick={() => void saveMemory("book")} type="button">{locale === "ru" ? "В книгу" : "To the book"}</button>
                <button disabled={memoryState === "saving"} onClick={() => void saveMemory("method")} type="button">{locale === "ru" ? "В метод" : "To the method"}</button>
                <button disabled={memoryState === "saving"} onClick={() => void saveMemory("client_answers")} type="button">{locale === "ru" ? "В память ответов клиентам" : "To client-answer memory"}</button>
                <button disabled={memoryState === "saving"} onClick={() => { setMemoryState("dismissed"); setMemoryMessage(null); }} type="button">{locale === "ru" ? "Не сохранять" : "Do not save"}</button>
              </div>
              {memoryMessage ? <p aria-live="assertive" className="form-message form-message--error" role="alert">{memoryMessage}</p> : null}
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
          disabled={voiceActive}
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
                disabled={voiceActive}
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
              disabled={voiceActive || pending}
              className={`assistant-chat__mic${voice.listening ? " assistant-chat__mic--on" : ""}`}
              onClick={voice.toggle}
              type="button"
            >
              🎤
            </button>
          ) : null}
          {voiceScope ? <RealtimeVoice key={locale + ":" + voiceScope + ":" + (caseId ?? "own")}
            locale={locale} scope={voiceScope} caseId={caseId}
            disabled={pending || historyLoading || historyError || voice.listening || files.length > 0 || Boolean(progress)}
            onActive={setVoiceActive}
            onTranscript={(text, sessionId) => {
              setMessages(current => mergeVoiceTranscript(current, text, sessionId));
              if (memoryCapture && !text.live && text.assistant) { setMemoryState("offer"); setMemoryMessage(null); }
            }}
          /> : null}
          <button
            className="button"
            disabled={pending || voiceActive || historyLoading || historyError || (!input.trim() && files.length === 0)}
            type="submit"
          >
            {t.send}
          </button>
        </div>
      </form>
      {voiceScope ? <details className="assistant-voice-disclosure"><summary>{voiceCopy[locale].voiceDetails}</summary><p>{voiceScope === "staff" ? voiceCopy[locale].staffDisclosure : voiceCopy[locale].disclosure}</p></details> : null}
    </div>
  );
}
