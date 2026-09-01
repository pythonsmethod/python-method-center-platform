"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { IconEyeOfHorus, IconLotus, IconWingedSun } from "@/components/EgyptianIcons";
import {
  designCopy, designHref, designTabs, designResultCount, designChartMax, formatDesignValue, parseDesignValue,
  type DesignCopy, type DesignLocale, type DesignTab,
} from "@/lib/design-model";

type GlyphName = "vitamins" | "analyses" | "plan" | "user" | "bell" | "history" | "plus" | "upload" | "clip" | "mic" | "send" | "chat" | "chevron" | "close" | "check";
const glyphPaths: Record<GlyphName, ReactNode> = {
  vitamins: <><path d="M8 3h8v3H8zM8 8h8l2 3v9H6v-9z" /><path d="m12 12 2 3-2 3-2-3zM8 1h8" /></>,
  analyses: <><path d="M9 2h6M10 2v7l-6 11h16L14 9V2M7 15h10" /><circle cx="12" cy="17" r=".6" /><circle cx="13" cy="12" r=".6" /></>,
  plan: <><path d="M8 4H5v17h14V4h-3M9 2h6v4H9zM12 11h4M12 16h4M7 10l1 1 2-2M7 15l1 1 2-2" /></>,
  user: <><circle cx="12" cy="8" r="3" /><path d="M5 20v-2a7 7 0 0 1 14 0v2" /></>,
  bell: <><path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4zM10 20h4M12 2v2" /></>,
  history: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 2v6M16 2v6M4 11h16M8 15h2M14 15h2M8 18h2" /></>,
  plus: <><circle cx="12" cy="12" r="9" /><path d="M7 12h10M12 7v10" /></>,
  upload: <><path d="M14 3H6v18h12V7zM14 3v4h4M12 17V10m-3 3 3-3 3 3" /></>,
  clip: <path d="m8 15 7-8a2 2 0 0 1 3 3l-8 9a4 4 0 0 1-6-6L13 3a5 5 0 0 1 7 7L11 20" />,
  mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
  send: <path d="m5 4 16 8-16 8 3-8-3-8Zm3 8h13" />,
  chat: <><path d="M4 4h16v13H10l-6 4z" /><path d="M8 10h.1M12 10h.1M16 10h.1" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 5 5L20 7" />,
};

function Glyph({ name }: { name: GlyphName }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">{glyphPaths[name]}</svg>;
}

function AnhamFace({ large = false }: { large?: boolean }) {
  return <span className={`ad-anham-face${large ? " is-large" : ""}`}><Image src="/images/anham-master.png" alt="" width={128} height={128} unoptimized /></span>;
}

function Ornament() {
  return <div className="ad-ornament" aria-hidden="true"><i /><IconWingedSun /><i /></div>;
}

function Dialog({ title, closeLabel, onClose, children }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="ad-dialog" ref={ref} aria-labelledby={titleId} onCancel={onClose} onClose={onClose}>
    <div className="ad-dialog-head"><h2 id={titleId}>{title}</h2><button type="button" aria-label={closeLabel} onClick={onClose}><Glyph name="close" /></button></div>
    {children}
  </dialog>;
}

function NavIcon({ tab }: { tab: DesignTab }) {
  return tab === "anham" ? <AnhamFace large /> : tab === "professor" ? <IconEyeOfHorus /> : <Glyph name={tab} />;
}

type Vitamin = { id: string; name: string; time: string; detail: string };
type Lab = { id: string; name: string; unit: string; values: number[]; dates: string[] };
type Modal = "settings" | "vitamin" | "history" | "lab" | "voice" | "file" | null;
type Message = { text: string; tab: "anham" | "professor" };

export function AnhamDesignStudio({ screen, locale, gallery }: { screen: DesignTab; locale: DesignLocale; gallery: boolean }) {
  const t = designCopy[locale];
  const [taken, setTaken] = useState<string[]>(["d"]);
  const [extras, setExtras] = useState<Vitamin[]>([]);
  const [reminders, setReminders] = useState(true);
  const [tasks, setTasks] = useState([true, false, false]);
  const [selectedLab, setSelectedLab] = useState("ferritin");
  const [extraLabs, setExtraLabs] = useState<Lab[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [voiceTarget, setVoiceTarget] = useState<"anham" | "professor">("anham");
  const [modalError, setModalError] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const vitamins: Vitamin[] = [
    { id: "d", name: t.vitaminD, time: "09:00", detail: t.breakfast },
    { id: "omega", name: t.omega, time: "13:00", detail: t.lunch },
    { id: "magnesium", name: t.magnesium, time: "21:30", detail: t.evening },
    ...extras,
  ];
  const dates = [t.may, t.july, t.august];
  const labs: Lab[] = [
    { id: "ferritin", name: t.ferritin, unit: t.ferritinUnit, values: [24, 38, 38], dates },
    { id: "d", name: t.vitaminD, unit: t.vitaminDUnit, values: [27, 31, 34], dates },
    { id: "hba1c", name: "HbA1c", unit: "%", values: [5.2, 5.2, 5.2], dates },
    ...extraLabs,
  ];
  const lab = labs.find((item) => item.id === selectedLab) ?? labs[0];
  const openModal = (value: Modal) => { setModalError(false); setModal(value); };
  const href = (tab: DesignTab) => designHref(tab, locale, gallery);
  const languageLinks = <div className="ad-language" aria-label={t.language}>
    {(["ru", "en"] as const).map((lang) => <Link key={lang} href={designHref(screen, lang, gallery)} aria-current={lang === locale ? "true" : undefined} onClick={() => setModal(null)}>{lang.toUpperCase()}</Link>)}
  </div>;

  function addVitamin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const time = String(form.get("time") ?? "");
    if (!name || !/^\d{2}:\d{2}$/.test(time)) { setModalError(true); return; }
    setExtras((previous) => [...previous, { id: `extra-${previous.length}`, name, time, detail: "" }]);
    setModal(null);
  }

  function addLab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const value = parseDesignValue(String(form.get("value") ?? ""));
    const date = String(form.get("date") ?? "");
    if (!name || value === null || !date) { setModalError(true); return; }
    const id = `lab-${extraLabs.length}`;
    setExtraLabs((previous) => [...previous, { id, name, unit: String(form.get("unit") ?? ""), values: [value], dates: [date] }]);
    setSelectedLab(id);
    setModal(null);
  }

  function phone(tab: DesignTab) {
    const chat = tab === "anham" || tab === "professor";
    return <section className={`ad-phone ad-phone--${tab}`} key={tab} aria-label={t.titles[tab]}>
      <div className="ad-edge ad-edge--left" aria-hidden="true" /><div className="ad-edge ad-edge--right" aria-hidden="true" />
      <header className="ad-head">
        <button type="button" className="ad-profile" aria-label={t.settings} onClick={() => openModal("settings")}><Glyph name="user" /></button>
        <h1>{t.titles[tab]}</h1><p>{t.subtitles[tab]}</p><Ornament />
      </header>
      <div className={`ad-content${chat ? " ad-content--chat" : ""}`}>
        {tab === "vitamins" && <>
          <section className="ad-card ad-vitamin-card">
            <h2 className="ad-intake-count" aria-live="polite">{t.today} · <span>{taken.length} {t.of} {vitamins.length} {t.taken}</span></h2>
            <div className="ad-vitamin-list">{vitamins.map((item) => <button key={item.id} type="button" role="checkbox" aria-checked={taken.includes(item.id)} aria-label={`${taken.includes(item.id) ? t.undoTaken : t.markTaken}: ${item.name}`} className="ad-vitamin-row" onClick={() => setTaken((previous) => previous.includes(item.id) ? previous.filter((id) => id !== item.id) : [...previous, item.id])}>
              <span className={`ad-check${taken.includes(item.id) ? " is-checked" : ""}`}>{taken.includes(item.id) && <Glyph name="check" />}</span>
              <span><strong>{item.name}{item.id.startsWith("extra") ? "" : <small> · {t.capsule}</small>}</strong><em>{item.time}{item.detail && ` · ${item.detail}`}</em></span>
            </button>)}</div>
          </section>
          <button type="button" className="ad-action is-green" onClick={() => openModal("vitamin")}><Glyph name="plus" />{t.addVitamin}</button>
          <button type="button" className="ad-action" onClick={() => openModal("history")}><Glyph name="history" />{t.history}</button>
          <button className="ad-reminders" type="button" role="switch" aria-checked={reminders} title={t.localOnly} onClick={() => setReminders((value) => !value)}><Glyph name="bell" />{t.reminders} {reminders ? t.on : t.off}</button>
          <p className="ad-footnote">{t.recommendation}</p><Ornament />
        </>}
        {tab === "analyses" && <>
          <div className="ad-inline-actions"><button className="ad-action is-green" type="button" onClick={() => fileRef.current?.click()}><Glyph name="upload" />{t.upload}</button><button className="ad-action is-green" type="button" onClick={() => openModal("lab")}><Glyph name="clip" />{t.manual}</button></div>
          <div className="ad-card ad-lab-list">{labs.map((item, index) => {
            const delta = item.values[item.values.length - 1] - item.values[0];
            return <button type="button" key={item.id} aria-pressed={item.id === selectedLab} className="ad-lab-row" onClick={() => setSelectedLab(item.id)}><span className="ad-lab-symbol">{index === 0 ? <Glyph name="analyses" /> : index === 1 ? <IconLotus /> : <IconEyeOfHorus />}</span><span>{item.name}</span><strong>{formatDesignValue(item.values[item.values.length - 1], locale)} <small>{item.unit}</small></strong><em>{delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${formatDesignValue(delta, locale)}`}</em></button>;
          })}</div>
          <LabChart lab={lab} locale={locale} t={t} />
          <Link className="ad-action ad-action--anham" href={href("anham")}><AnhamFace />{t.explain}<Glyph name="chevron" /></Link>
          <p className="ad-footnote">{t.assessment}</p><Ornament />
        </>}
        {tab === "plan" && <>
          <section className="ad-card ad-plan"><h2>Professor Python · {t.planDate}</h2><div className="ad-plan-steps">{[t.task1, t.task2, t.task3].map((task, index) => <button type="button" className={`ad-plan-step${tasks[index] ? " is-complete" : ""}`} aria-pressed={tasks[index]} aria-label={`${tasks[index] ? t.undo : t.complete}: ${task}`} key={index} onClick={() => setTasks((previous) => previous.map((value, i) => i === index ? !value : value))}><b>{tasks[index] ? <Glyph name="check" /> : index + 1}</b><span>{task}</span><Glyph name="chevron" /></button>)}</div><div className="ad-progress"><p aria-live="polite">{tasks.filter(Boolean).length}<span>/{tasks.length}</span></p><progress aria-label={t.progress} value={tasks.filter(Boolean).length} max={tasks.length} /></div></section>
          <Link className="ad-action is-green" href={href("anham")}><Glyph name="chat" />{t.discuss}<Glyph name="chevron" /></Link>
        </>}
        {chat && <>
          <Conversation tab={tab} t={t} messages={messages.filter((message) => message.tab === tab)} />
          {tab === "professor" && <Link className="ad-action" href={href("anham")}><Glyph name="chat" />{t.discussReply}<Glyph name="chevron" /></Link>}
          <Composer tab={tab} t={t} onVoice={() => { setVoiceTarget(tab); openModal("voice"); }} onFile={() => fileRef.current?.click()} onSend={(text) => setMessages((previous) => [...previous, { text, tab }])} />
        </>}
      </div>
      <nav className="ad-nav" aria-label={t.nav}>{designTabs.map((item) => <Link href={href(item)} key={item} aria-current={item === tab ? "page" : undefined} className={`ad-nav-item${item === "anham" ? " ad-nav-anham" : ""}`}><NavIcon tab={item} /><span>{t.tabs[item]}</span></Link>)}</nav>
      <div className="ad-home-indicator" aria-hidden="true" />
    </section>;
  }

  return <div className="anh-preview-studio" lang={locale}>
    <div className="ad-stage">{phone(screen)}</div>
    <input className="ad-hidden" ref={fileRef} type="file" accept=".pdf,image/*" aria-label={t.upload} onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); openModal("file"); } event.target.value = ""; }} />
    {modal && <Dialog title={modal === "settings" ? t.settings : modal === "vitamin" ? t.addVitamin : modal === "history" ? t.history : modal === "lab" ? t.manual : modal === "voice" ? t.voice : t.fileSelected} closeLabel={t.close} onClose={() => setModal(null)}>
      {modal === "settings" && <><p>{t.profileNote}</p><p>{t.previewNote}</p>{languageLinks}</>}
      {modal === "vitamin" && <form className="ad-form" onSubmit={addVitamin}><label>{t.name}<input name="name" required maxLength={80} autoFocus /></label><label>{t.time}<input name="time" type="time" defaultValue="09:00" required /></label>{modalError && <p role="alert">{t.invalidVitamin}</p>}<p>{t.localOnly}</p><button className="ad-action is-green" type="submit">{t.save}</button></form>}
      {modal === "history" && <>{vitamins.filter((item) => taken.includes(item.id)).map((item) => <p className="ad-history-row" key={item.id}><Glyph name="check" />{item.name}<span>{item.time}</span></p>)}{taken.length === 0 && <p>{t.historyEmpty}</p>}<p>{t.localOnly}</p></>}
      {modal === "lab" && <form className="ad-form" onSubmit={addLab}><label>{t.name}<input name="name" required maxLength={80} autoFocus /></label><label>{t.value}<input name="value" required inputMode="decimal" maxLength={15} /></label><label>{t.unit}<input name="unit" required maxLength={20} /></label><label>{t.date}<input name="date" type="date" required /></label>{modalError && <p role="alert">{t.invalid}</p>}<p>{t.localOnly}</p><button className="ad-action is-green" type="submit">{t.save}</button></form>}
      {modal === "voice" && <div className="ad-voice-preview">{voiceTarget === "anham" && <AnhamFace large />}<p>{voiceTarget === "anham" ? t.demoVoice : t.demoProfessorVoice}</p></div>}
      {modal === "file" && <><p className="ad-file-name">{fileName}</p><p>{t.fileNote}</p></>}
    </Dialog>}
  </div>;
}

export { AnhamDesignStudio as AnhamApp };

function LabChart({ lab, locale, t }: { lab: Lab; locale: DesignLocale; t: DesignCopy }) {
  const max = designChartMax(lab.values);
  const points = lab.values.map((value, index) => ({ x: lab.values.length === 1 ? 170 : 40 + index * 130, y: 157 - value / max * 120 }));
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  return <section className="ad-card ad-chart"><h2>{lab.name} · {designResultCount(lab.values.length, locale)}</h2><span>{lab.unit}</span><svg viewBox="0 0 340 195" role="img" aria-label={`${t.chart}: ${lab.name}. ${lab.values.map((value, i) => `${lab.dates[i]}: ${formatDesignValue(value, locale)}`).join("; ")}`}>
    <defs><linearGradient id={`ad-chart-fill-${lab.id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#477859" stopOpacity=".55" /><stop offset="1" stopColor="#092115" stopOpacity=".03" /></linearGradient></defs>
    {[0, 1, 2, 3].map((n) => <g key={n}><line x1="35" x2="310" y1={157 - n * 40} y2={157 - n * 40} className="ad-grid-line" /><text x="25" y={161 - n * 40} textAnchor="end">{formatDesignValue(max * n / 3, locale)}</text></g>)}
    <polygon points={`${points[0].x},157 ${line} ${points[points.length - 1].x},157`} fill={`url(#ad-chart-fill-${lab.id})`} /><polyline points={line} fill="none" stroke="#7baa8a" strokeWidth="1.5" />
    {points.map(({ x, y }, index) => <g key={index}><line x1={x} x2={x} y1={y} y2="157" className="ad-grid-line" /><circle cx={x} cy={y} r="4.5" fill="#eac564" /><text x={x} y={y - 13} textAnchor="middle" className="ad-chart-value">{formatDesignValue(lab.values[index], locale)}</text><text x={x} y="184" textAnchor="middle">{lab.dates[index]}</text></g>)}
  </svg></section>;
}

function Conversation({ tab, t, messages }: { tab: "anham" | "professor"; t: DesignCopy; messages: Message[] }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages.length]);
  const sample = tab === "anham" ? [t.greeting, t.userMessage, t.assistantMessage] : [t.professor1, t.client1, t.professor2];
  return <div className="ad-messages" role="log" aria-label={t.demonstration} aria-live="polite"><p className="ad-chat-date">{t.today}</p>{sample.map((text, index) => <div key={index} className={`ad-message${index === 1 ? " is-outgoing" : ""}`}>
    {index !== 1 && (tab === "anham" ? <AnhamFace /> : <span className="ad-professor-avatar" aria-hidden="true">P</span>)}<div className="ad-bubble"><p>{text}</p><small>09:{42 + index}{index === 1 && <span aria-hidden="true"> ✓✓</span>}</small></div>
  </div>)}{messages.map((message, index) => <div key={`sent-${index}`} className="ad-message is-outgoing"><div className="ad-bubble"><p>{message.text}</p><small>{t.demoSent}</small></div></div>)}<div ref={end} /></div>;
}

function Composer({ tab, t, onVoice, onFile, onSend }: { tab: "anham" | "professor"; t: DesignCopy; onVoice: () => void; onFile: () => void; onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }
  return <form className="ad-composer" onSubmit={submit}><div className="ad-composer-field"><button type="button" aria-label={t.attachment} onClick={onFile}><Glyph name="clip" /></button><input maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} aria-label={tab === "anham" ? t.write : t.writeProfessor} placeholder={tab === "anham" ? t.write : t.writeProfessor} /><button type="button" aria-label={tab === "anham" ? t.voice : t.microphone} onClick={onVoice}><Glyph name="mic" /></button></div><button type="submit" className="ad-send" disabled={!text.trim()} aria-label={t.send}><Glyph name="send" /></button></form>;
}
