# Y Combinator — application draft

Answers below are written in **English**, because the YC form is answered in
English and is read in English. Under each answer there is a Russian note
(«↳ по-русски») explaining what the answer is doing and what has to be
checked before it is submitted.

Everything marked `[[FILL: …]]` is a fact only the founders know. Do not
submit with a `[[FILL:]]` left in — grep for it:

```bash
grep -rn "\[\[FILL" docs/yc/
```

Every number that is already written in is taken from this repository or
from documents in it, and the source is named. Nothing here is invented.
YC checks what is checkable; an inflated number is the one thing that
cannot be repaired later.

---

## 1. Founders

### Who is on the application

Two founders, both listed on the application:

- **Anna Dubrovenko** — built and runs the platform (product, engineering,
  operations, payments, launch).
- **Karen Pashikyan** ("Professor Python") — the author of the method, the
  expert who reviews every case.

↳ по-русски: подавайтесь вдвоём. Заявка от одного технического основателя
без носителя метода читается как «сделала сайт для чужой практики»; заявка
от одного Карена — как «частная практика, которая захотела сайт». Сила
именно в паре: тот, кто владеет методом, и та, кто превратила его в
систему. YC отдельно спрашивает, почему вы работаете вместе, — ответ ниже.

### Founder bios

**Anna Dubrovenko.** Built Python Method end to end: the bilingual public
site, the client cabinet, the staff workspace, the payment flow, the
notification pipeline, and the AI runtime that sits under all of it —
production, not a prototype. Went from an empty repository to a live
platform taking real card payments in
`[[FILL: сколько месяцев ушло от первого коммита до первого живого платежа]]`.

`[[FILL: 2–3 предложения о том, что Анна делала до этого — образование,
работа, продукты. Если технического бэкграунда нет и всё это первый
проект — так и написать: «no engineering background; learned by building
this», это в YC читается как сила, а не слабость.]]`

**Karen Pashikyan.** Thirty years in rehabilitation. Graduate of the
Tashkent State Institute of Physical Culture; worked as a rehabilitation
specialist with national and Olympic teams; has worked with people in 34
countries. A multiple national, Asian and world champion in combat sports —
after being told in school, with hepatitis B and a nearly destroyed liver,
that he would never do sport again.

In 2024 his mother was diagnosed at stage four. Sitting beside her he saw
what almost nobody attends to: the illness damages a person from one side
and the treatment from the other — chemotherapy, surgery and long protocols
wear down the liver, kidneys, bone marrow and gut, and the oncologist's job
is the disease, not the body carrying it. He gave her his word that he
would help everyone who came to him. Since then he has worked almost
entirely with people at a severe stage of cancer, and has personally run
**480 paid cases by hand** — over WhatsApp and Telegram, with no system
underneath.

↳ по-русски: биография Карена — самая сильная часть заявки, и она уже
написана вами на сайте (`/professor`), проверять её не нужно, нужно только
не раздувать. Обещаний победы над болезнью в заявке нет и быть не должно —
ровно по той же причине, по которой их нет на странице профессора.

### Why you two, and how you know each other

`[[FILL: как вы познакомились и почему работаете вместе — 2–3 предложения.
YC спрашивает это всерьёз: они ищут пары, которые не развалятся. Если вы
родственники или знакомы много лет — это плюс, напишите прямо.]]`

### Equity split

`[[FILL: как делятся доли между Анной и Кареном. Если ещё не решено —
решите до подачи: YC спрашивает и на интервью, и в форме, и
неопределённость здесь — известный красный флаг.]]`

### "Tell us about the time you most successfully hacked some
(non-computer) system to your advantage."

`[[FILL: личная история, одна, конкретная, не про бизнес. Хорошая история —
короткая, с понятной системой и понятным обходом. Не берите сюда «сделала
акцию с бесплатным разбором» — это бизнес-решение, оно уже в других
ответах. Карену сюда хорошо ложится спортивная история: как он вернулся в
спорт с диагнозом, с которым не допускают.]]`

---

## 2. Company

### Company name

Python Method (legal entity: Pythons & Co)

### Describe what your company does in 50 characters or less

> Expert-led AI care for recovery after cancer

(44 characters.)

Alternatives, if you prefer a different emphasis:

- `AI platform for recovery after severe illness` (45)
- `We rebuild bodies wrecked by cancer treatment` (45)

↳ по-русски: в этой строке YC читает, поняли ли вы сами, что делаете.
Первый вариант рекомендую: в нём есть и эксперт, и ИИ, и рынок.

### Company URL

https://pythonmethodcenter.com

### Demo video

`[[FILL: ссылка на 2–3-минутную запись экрана. Что показывать — в
docs/yc/YC_VIDEO_SCRIPT.md]]`

### What is your company going to make?

Python Method is the platform that runs a recovery practice for people
whose bodies are being destroyed by cancer treatment.

Chemotherapy, surgery and long protocols wreck the liver, kidneys, bone
marrow and gut. The oncologist's job is the disease; almost nobody's job is
the body carrying it. Karen Pashikyan has spent thirty years on exactly
that, and since 2024 almost entirely on people mid-treatment. He has run
480 paid cases by hand, one WhatsApp thread at a time.

The platform turns that practice into a service that runs without him being
awake. A person signs up, fills in a questionnaire and uploads their labs
and discharge notes. The AI meets them, in Russian or English, at any hour,
and answers everything about the centre, the method and the next step —
and refuses, every time, to interpret their results, because that answer
comes from Karen. It structures the uploaded documents into a case file,
drafts his replies from the case's own history, watches every message for
signs of an emergency, and when it sees one it says "call 112 or 911" and
puts a flagged event at the top of the staff panel within seconds. Karen
reads, corrects and sends. He teaches the system by typing into a knowledge
base — no engineer in the loop — and the correction is live in the next
answer.

One rule holds the whole product together: **the AI does everything except
the judgement.** It never diagnoses, never prescribes, never promises an
outcome, and never answers in his voice. That boundary is not a disclaimer
at the bottom of a page; it is in the system prompts, enforced server-side
per tier, and held by tests that fail the build if the copy crosses it.

People pay for the programme: $1,440 for five weeks, $3,675 for one hundred
days, both including the formula he sends. Payment is live through Stripe,
from any country whose cards work.

↳ по-русски: этот ответ — сердце заявки. Он отвечает на три вопроса YC
сразу: что вы делаете, почему это не «ещё один AI-чат для здоровья» и
почему это вообще можно запускать в медицинской зоне. Правило «ИИ делает
всё, кроме решения» — ваша главная защита и на интервью тоже.

### Where do you live now, and where would the company be based after YC?

`[[FILL: где сейчас живут Анна и Карен — города и страны.]]`

Pythons & Co is already registered in the United States (Los Angeles, CA),
and the company would be based in the US after YC.

↳ по-русски: то, что юрлицо уже американское, — заметный плюс, укажите его
прямо. Если кто-то из основателей не может переехать в США на время
батча — напишите это честно здесь же, YC проводит батчи и удалённо-частично,
но узнать об этом на интервью им не понравится.

---

## 3. Progress

### How far along are you?

The platform is live in production and has taken a real card payment.

Working today at pythonmethodcenter.com:

- Bilingual public site (Russian and English), phone and desktop.
- Accounts, onboarding questionnaire that opens the case, consent and
  offer acceptance recorded with an audit trail.
- Client cabinet: case status, document upload into private storage, case
  history, and a messenger-style chat with Karen — text and **voice
  messages**, because he would rather speak than type.
- Three tiers of AI on one endpoint, resolved server-side from the
  visitor's session: a public consultant for guests, a personal assistant
  for registered users, and a case-aware AI for paying clients that reads
  the documents attached in chat. Claude and OpenAI both answer and an
  arbiter picks the stronger reply; system prompts are cached, so repeat
  reads of the rules cost a fraction of fresh tokens.
- Automatic red-flag escalation: the assistant tags an emergency, the
  server strips the marker, records the event, routes it (physical to
  Karen, psychological to support) and pushes a Telegram alert.
- Staff workspace: red-flag panel first on the page, case list and detail
  with chat, document intake, support queue, manual payment recording, a
  staff AI assistant that reads up to 30 attached photos or PDFs per
  message, and the knowledge base Karen edits himself.
- Payments: Stripe Payment Links behind a mandatory offer checkbox, plus a
  server-side webhook with signature verification and insert-first
  idempotency that records the payment, switches the service period on and
  alerts the team.
- A referral programme paying 5% of everything an invited person ever
  spends, denominated in capsules of the formula rather than dollars.
- Legal: public offer, privacy policy, refund terms, all published and
  version-locked; the binding version of the contract is recorded per
  client.

It costs about $50–70 a month to run, plus roughly $1 of AI per active
client, against a $1,440 ticket.

↳ по-русски: этот список — ваше главное преимущество перед типичной
заявкой. Большинство подающихся описывают, что построят. У вас всё это
уже работает, и это проверяемо по ссылке.

### How long have each of you been working on this? Full-time?

`[[FILL: с какого месяца Анна начала строить платформу и работает ли она
над этим full-time. То же по Карену — практика 30 лет, но именно над
этим проектом сколько.]]`

Karen has been running the practice this platform automates for thirty
years, and in its current form — people mid-cancer-treatment — since 2024.

### What tech stack are you using?

Next.js (App Router) and TypeScript on Vercel; Supabase for auth, Postgres
and private file storage, with row-level security scoped to the
authenticated user and all staff access going through a server-only service
role; Stripe for payments; Anthropic Claude and OpenAI for the AI runtime,
with a server-side arbiter; Telegram for team notifications, with a
delivery log that retries and de-duplicates.

### Are people using it?

`[[FILL: сколько человек зарегистрировалось, сколько заполнило анкету,
сколько загрузило документы, сколько получили разбор, сколько оплатили —
на дату подачи. Даже маленькие числа лучше, чем общие слова: YC читает
«12 зарегистрировались, 4 оплатили» гораздо лучше, чем «идёт пилот».]]`

Before the platform, Karen ran **480 paid cases** by hand over WhatsApp and
Telegram, out of roughly **2,000 consultations**. Those cases are the
practice the platform was built from, not platform revenue, and are
described that way here on purpose.

↳ по-русски: 480 и 2000 — цифры из ваших собственных документов
(`docs/safety/ЗАЩИТА_ПОМОЩНИКА_ОТ_НАПЛЫВА.md`). Обязательно пишите про них
именно так: «это практика до платформы». Если подать их как выручку
платформы и это вскроется на интервью — заявка закончится там же.

### Do you have revenue?

`[[FILL: выручка платформы на дату подачи — сумма и за какой период. Если
пока только тестовый живой платёж — напишите ровно это: «one live payment
processed to verify the flow; $X in programme revenue to date».]]`

Pricing that is live today: $1,440 for the five-week programme, $3,675 for
the hundred-day programme, and $1,000 for a standalone review of a
person's test results — currently given free to the centre's first clients
as the acquisition offer.

### Incubators / accelerators

`[[FILL: участвовали ли в других акселераторах. Если нет — «No».]]`

---

## 4. Idea

### Why did you pick this idea? Do you have domain expertise? How do you
know people need it?

Karen picked it beside his mother's bed in 2024, and the platform exists
because his practice had hit a wall that no amount of working harder could
move.

Two walls, in fact, and they are the whole business.

**The first is trust.** About 2,000 people came to him for a
consultation; 480 became paid cases. The method was not what leaked — the
proof was. People who have been told for years to beware of anyone
promising anything around cancer need to feel a place before they can pay
it. That is why the first thing on the site is a free assessment of your
resource state by him personally, and why an AI will talk to you for
fifteen messages before anyone asks you for a card.

**The second is his hours.** 480 cases, every one read personally, in
WhatsApp threads with the documents scattered through them. He is the
ceiling. He should be the ceiling on judgement — and on nothing else.

Everything in the product is one of those two walls: the free tier and the
free review are the first, and the AI, the case file, the drafts and the
red-flag watch are the second.

↳ по-русски: воронка 2000 → 480 — самый сильный аргумент в заявке, потому
что это не рассуждение, а измерение. Держите её и на интервью.

### Who are your competitors? What do you understand that they don't?

The real incumbent is WhatsApp plus a folder of photographs. That is how
this entire category of care is delivered today, worldwide, by every
practitioner who is good enough to have more people than hours.

Beyond that:

- **Functional-medicine telehealth** (Parsley, Function Health and the
  like): subscription panels of labs for broadly well people, US-only, and
  not built for somebody in the middle of chemotherapy.
- **Cancer supportive-care apps** (Belong, Jasper and similar): content,
  tracking and community. Nobody inside them is doing the work or
  accountable for the answer.
- **General AI health chatbots:** they give advice, which is exactly the
  thing this population will not act on from a machine, and which no one
  is accountable for.

What we understand that they don't: **in this category the sellable unit is
a named human who is accountable, and AI's job is to make his hours go
further — not to replace his answer.** Every product that puts the AI where
the judgement goes either gets stopped by regulation and payment
processors, or gets ignored by patients, or hurts somebody. Every product
that leaves the AI out entirely stays the size of one person's calendar. We
put the line exactly between them and enforce it in code.

The second thing: the bottleneck is trust, not demand. Competitors spend on
acquisition. We spend on proof — a free assessment by him, and an AI that
will refuse to interpret your labs and tell you to wait for Karen. Refusing
to answer is our conversion mechanism.

↳ по-русски: не смягчайте про конкурентов. YC любит ответ, в котором видно,
что вы точно знаете, кто рядом и почему у них не получается.

### How do or will you make money? How much could you make?

Today: programme fees — $1,440 for five weeks, $3,675 for a hundred days,
$1,000 for a standalone review. Gross margin is high: infrastructure runs
at $50–70 a month, AI at about $1 per active client; the real cost is
Karen's time and the formula he ships.

There are two more layers already built in. The formula itself becomes a
repeat product through the shop, and the referral programme pays 5% of
everything an invited person ever spends — paid in capsules, not cash, so
the reward costs us the product and returns the person to the shop.

The size of it: what one practitioner can do by hand is a ceiling of a few
hundred cases in a career — 480, in Karen's. The platform's job is to make
that a few hundred concurrently, and after that the same system runs for
other practitioners with the same problem: a real method, a real waiting
list, and WhatsApp. Roughly 20 million people are diagnosed with cancer
each year worldwide `[[FILL: проверить цифру перед подачей — источник WHO/
GLOBOCAN, дать актуальный год]]`, essentially all of them go through
treatment that damages the body, and almost none of them are offered
anybody whose job is that damage.

↳ по-русски: считайте снизу, от своих чисел, а не сверху от «рынка
здоровья на $X триллионов». YC верит арифметике, которую вы можете
защитить.

### Category

Healthcare / consumer health services (AI-assisted).

### Other ideas you considered

`[[FILL: если были — перечислить. Если нет — «No, this is the only thing
we want to work on», и это нормальный ответ.]]`

---

## 5. Legal / equity

- **Legal entity:** yes — Pythons & Co, registered in the United States
  (1331 Amherst Ave, Apt PH5, Los Angeles, CA 90025). `[[FILL: уточнить
  форму (LLC / C-Corp) и штат регистрации — YC спрашивает именно это, и
  для инвестиции им нужен Delaware C-Corp; если сейчас LLC, так и
  написать, это переоформляется.]]`
- **Investment taken:** `[[FILL: брали ли деньги. Если нет — «No».]]`
- **Currently fundraising:** `[[FILL: да/нет]]`

---

## 6. Curious

### What convinced you to apply to YC?

`[[FILL: своими словами, коротко и честно. Что реально нужно: выход на
американский рынок и на первых клиентов вне русскоязычного круга, деньги
на то, чтобы Анна занималась этим full-time, и люди, которые уже проводили
компании через медицинскую регуляторику и через платёжные системы. Не
пишите «мечтали с детства».]]`

### How did you hear about YC?

`[[FILL]]`

---

## 7. Things they will push on at the interview

Not part of the form. Prepare answers anyway — these are the holes a
partner finds in ten minutes.

1. **"What happens if Karen gets hit by a bus?"** Today the business stops.
   The honest answer is that the knowledge base is the beginning of the
   asset that outlives him, and that the second practitioner on the
   platform is the real test of the company. Say the plan, not that the
   risk isn't there.
2. **"Is this medicine?"** No — no diagnosis, no prescription, no
   cancellation of a doctor's orders, and the boundary is enforced in the
   product and held by tests. Bring the emergency flow: the assistant
   tells a person in danger to call 112 or 911, not to keep chatting.
3. **"Your audience is Russian-speaking and Russian cards don't work."**
   True, and it is written into the site. `[[FILL: как решается — какая
   доля клиентов платит нероссийскими картами, что предлагается
   остальным.]]`
4. **"480 cases — over what period, at what price, and where did the money
   go?"** `[[FILL: годы и средний чек по этим 480 кейсам.]]`
5. **"How many people has the platform actually served?"** Have the number
   ready, however small, and the week-by-week trend from launch.
6. **"Outcomes?"** Careful here: never claim the method treats disease.
   What can be claimed is what the practice measures — markers, weight,
   sleep, strength, completed treatment protocols. `[[FILL: есть ли
   собранные до/после показатели хотя бы по нескольким кейсам — это
   лучшее, что можно принести на интервью.]]`
