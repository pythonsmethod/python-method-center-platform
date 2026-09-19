// Anham message reactions v1.
//
// A small human gesture, like a reaction in a messenger: the person says
// "I finally walked 5000 steps today" and Anham puts 👏 on that message before
// answering in words. The reaction belongs to the person's message, never to
// the reply text, and it never replaces the reply.
//
// Architecture, deliberately narrow:
// - The model proposes a reaction only through one structured marker,
//   `[[reaction:key]]`, on the first line of its reply. It is the same
//   `[[...]]` protocol family the server already uses for action receipts.
// - The server accepts only keys from the closed allowlist below and maps them
//   to emoji itself. Free emoji, HTML or unknown keys are dropped, never shown.
// - Safety is decided here, on the server, from the person's own words and
//   from the delivered reply, and it always wins: a message that mentions
//   pain, an emergency, medication, self-harm, grief or a diagnosis gets no
//   reaction at all, whatever the model proposed. When in doubt, none.
// - At most one reaction per person's message.
//
// This module is pure and shared with the browser: no database, no provider.

export const ANHAM_REACTIONS = [
  "heart",
  "clap",
  "celebrate",
  "thumbs_up",
  "eyes",
  "smile",
  "thanks",
  "strength"
] as const;

export type AnhamReaction = (typeof ANHAM_REACTIONS)[number];

// The only emoji that can ever appear as a reaction. The key is what travels
// through the API and the database; the glyph exists only in this table.
export const ANHAM_REACTION_EMOJI: Record<AnhamReaction, string> = {
  heart: "❤️",
  clap: "👏",
  celebrate: "🥳",
  thumbs_up: "👍",
  eyes: "👀",
  smile: "😄",
  thanks: "🙏",
  strength: "💪"
};

// The public site is not the personal Anham. A visitor gets, at most, a quiet
// acknowledgement of thanks or of a useful clarification.
export const GUEST_REACTIONS: readonly AnhamReaction[] = ["heart", "thanks", "thumbs_up"];

export type ReactionTier = "guest" | "registered" | "client";

export function isAnhamReaction(value: unknown): value is AnhamReaction {
  return typeof value === "string" && (ANHAM_REACTIONS as readonly string[]).includes(value);
}

/**
 * The allowlist gate. Accepts a key from the closed list (case and `-`/`_`
 * tolerant), returns null for everything else: emoji, HTML, "none", prose.
 */
export function normalizeReaction(value: unknown): AnhamReaction | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase().replace(/-/g, "_");
  return isAnhamReaction(key) ? key : null;
}

// `[[reaction:clap]]`, with tolerance for spacing, a missing value and any
// text the model might put inside. Everything the pattern matches is removed
// from the reply so a malformed marker cannot leak to the reader either.
const REACTION_MARKER = /\[\[\s*reaction(?:\s*:\s*([^\]\n]{0,60}?))?\s*\]\]/giu;

export type ExtractedReaction = {
  reply: string;
  // The first proposed key that passes the allowlist; null when the model
  // proposed nothing or something outside the list.
  reaction: AnhamReaction | null;
  // How many markers were present, for tests and diagnostics only.
  markers: number;
};

/** Splits the model's reply into prose and its (optional) reaction proposal. */
export function extractReactionMarker(reply: string): ExtractedReaction {
  let reaction: AnhamReaction | null = null;
  let markers = 0;

  const stripped = reply.replace(REACTION_MARKER, (_match, value: string | undefined) => {
    markers += 1;
    // Only the first marker counts: one message, one reaction at most.
    if (markers === 1) reaction = normalizeReaction(value ?? "");
    return "";
  });

  return {
    reply: markers ? stripped.replace(/^[ \t]*\n+/, "").replace(/\n{3,}/g, "\n\n").trim() : reply,
    reaction,
    markers
  };
}

// Russian is matched after lowercasing and ё→е folding, so the patterns are
// written with "е" only. JavaScript's \b is ASCII-only, so Cyrillic word
// starts are guarded with a lookbehind instead.
// `\\w` is ASCII-only in JavaScript, so Russian patterns spell it as [а-я].
const RU = (source: string) => new RegExp(`(?<![а-я])(?:${source.replace(/\\w/g, "[а-я]")})`, "u");
const EN = (source: string) => new RegExp(`\\b(?:${source})\\b`, "u");
const NUM = (source: string) => new RegExp(`(?<![\\d.,])(?:${source})(?![\\d.,])`, "u");

// Situations in which a reaction is forbidden, however warm the message
// otherwise sounds. Each entry is one reason from the policy; the list is
// deliberately generous, because a missed 👏 costs nothing and a misplaced one
// reads as dismissing what the person is going through.
const REACTION_SAFETY_PATTERNS: readonly RegExp[] = [
  // Pain and acute physical symptoms.
  RU("бол(?!ьш)(?:ь|и|ю|ей|ью|ит|ят|ел|ели|ело|ела|ею|еешь|еет|еем|еете|еют|еть|езн|ячк|ьн)|ноет|ломит|колет|спазм|мигрен|головокруж|тошнит|тошнот|рвот|температур|лихорад|озноб|жар(?![а-я])|заболе|простуд|кашл"),
  EN("pain|pains|painful|hurt|hurts|hurting|ache|aches|aching|agony|agoni[sz]ing|cramps?|cramping|spasms?|migraines?|nausea|nauseous|vomit(?:ing|ed)?|fever(?:ish)?|dizzy|dizziness"),
  // Worsening condition.
  RU("ухудш|хуже(?![а-я])|обострен|обострил|осложнен|приступ(?!и|а[юе])|резко стало|стало плохо|плохо себя чувству|мне плохо|очень плохо|совсем плохо"),
  EN("worse|worsen(?:ed|ing)?|deteriorat\\w*|flare-?ups?|flared|relapse[sd]?|attacks?|getting bad|feel(?:ing)? (?:really |very |so )?(?:bad|sick|ill|awful|terrible)|unwell"),
  // Breathing.
  RU("дыш|дыхан|дыхат|задыха|одышк|удуш|нехватк\\w* воздух|не хватает воздух"),
  EN("breath|breathe|breathing|breathless(?:ness)?|suffocat\\w*|chok(?:e|ed|ing)|asthma|wheez\\w*|short of breath"),
  // Bleeding.
  RU("кров(?:ь|и|ью|отеч|оточ|ав|ит|ян)|гематом"),
  EN("bleed(?:s|ing)?|bled|blood|bloody|ha?emorrhag\\w*|ha?ematoma"),
  // Consciousness.
  RU("сознани|обморок|отключ(?:ил|ал|аю)с[ья]|потемнело в глазах|спутанн"),
  EN("faint(?:ed|ing|s)?|pass(?:ed|ing)? out|unconscious|blackouts?|blacked out|black out|collapse[sd]?|collapsing|confus(?:ed|ion)|disoriented"),
  // Seizures and tremor.
  RU("судорог|судорож|припад|конвульс|эпилеп|трясет|дрож"),
  EN("seizures?|convuls\\w*|epilep\\w*|shaking|tremors?|trembling"),
  // Stroke and heart signs.
  RU("инфаркт|инсульт|сердечн\\w* приступ|давит в груди|в груди|онемел|онемени|асимметри|перекосил|аритми|сердцебиен|тахикард|давлени"),
  EN("heart attack|stroke|chest (?:pain|tightness|pressure)|numb(?:ness)?|palpitations?|arrhythmi\\w*|blood pressure|tachycardi\\w*"),
  // Allergy, poisoning.
  RU("анафилак|отек|аллерг|сыпь|крапивниц|отравл|интоксик"),
  EN("anaphyla\\w*|allerg\\w*|swelling|swollen|rash|hives|poison\\w*|intoxicat\\w*"),
  // Emergency and red-flag vocabulary.
  RU("скорая|скорую|скорой|неотложк|неотложн|экстренн|срочно|реанимац|приемн\\w* поко|травмпункт|спасат|вызвал[аи]? врача|вызов\\w* врача"),
  EN("emergency|ambulance|paramedics?|urgent(?:ly)?|urgent care|er|a&e|hospitali[sz]\\w*|intensive care|icu|resuscitat\\w*|first aid"),
  NUM("911|112|103|999"),
  // Medication and dosage.
  RU("лекарств|препарат|медикамент|таблет|капсул|дозировк|доз(?:а|ы|у|е|ой|ами)?(?![а-я])|передоз|антибиотик|инсулин|гормон|стероид|обезбол|анальгет|укол|инъекц|капельниц|рецепт|аптек|назначил|назначен|витамин|добавк|бад(?![а-я])|формул"),
  EN("medications?|medicines?|meds|drugs?|pills?|tablets?|capsules?|doses?|dosages?|dosing|overdos\\w*|antibiotics?|insulin|hormones?|steroids?|painkillers?|analgesics?|injections?|prescri\\w*|pharmac\\w*|supplements?|vitamins?|formula|ibuprofen|paracetamol|acetaminophen|aspirin|metformin|antidepressants?"),
  NUM("\\d+(?:[.,]\\d+)?\\s*(?:мг|мкг|ме|mg|mcg|µg|iu)(?![а-яa-z])"),
  // Self-harm.
  RU("суицид|самоубий|покончить с собой|покончу с собой|не хочу жить|не хочу больше жить|нет смысла жить|незачем жить|устал[а]? жить|хочу умереть|хочу исчезнуть|уйти из жизни|навред\\w* себе|причин\\w* себе|порез|режу себя|резать себя|самоповрежд|наглота"),
  EN("suicid\\w*|kill(?:ing)? myself|end (?:my|it) (?:life|all)|take my (?:own )?life|(?:don'?t|do not) want to (?:live|be here|exist|wake up)|want(?:ed)? to die|wish i (?:was|were) dead|better off dead|self-?harm\\w*|hurt(?:ing)? myself|cut(?:ting)? myself|harm(?:ing)? myself|no reason to live|can'?t go on"),
  // Emotional crisis, fear, violence.
  RU("паник|паническ|отчаян|депресс|тревог|тревож|страшно|боюсь|боимся|страх(?!ов)|ужас|кошмар|плач|плакал|рыда|слез(?:ы|ах|ами)(?![а-я])|не справля|срыв|истерик|безнадеж|одиноко|одиночеств|опустошен|выгоран|бессонниц|не сплю|не могу спать|насил|избил|бьет|ударил|угрожа|издева|травл"),
  EN("panic\\w*|despair\\w*|desperate|depress\\w*|anxiet\\w*|anxious|scared|afraid|fears?|terrif\\w*|frighten\\w*|dread\\w*|nightmares?|crying|cried|cry|tears|sobbing|can'?t cope|breakdown|overwhelm\\w*|hopeless\\w*|helpless\\w*|worthless|lonely|loneliness|burn(?:ed|t)? out|burnout|insomnia|can'?t sleep|trauma\\w*|abus\\w*|violence|violent|assault\\w*|rape[sd]?|harass\\w*"),
  // Fear for life.
  RU("умру|умира(?:ю|ем|ет|ешь)|боюсь умереть|страх за жизнь|за жизнь|опасно для жизни|угроз\\w* жизни|смертельн"),
  EN("going to die|gonna die|dying|die|life-?threatening|fear for (?:my|his|her|their) life|deadly|fatal(?:ly)?|lethal"),
  // Death and loss.
  RU("умер(?!енн)|погиб|скончал|похорон|утрат|соболезн|горе(?![а-я])|горю(?![а-я])|скорб|смерт|потерял[аи]? (?:мам|пап|муж|жен|сын|доч|брат|сестр|отц|мат|бабушк|дедушк|ребенк|друг|подруг|близк|любим|кот|собак)|выкидыш|замерш\\w* беременн|мертворожд|поминк|кладбищ|могил|хоспис|паллиатив|неизлечим|терминальн"),
  EN("died|deaths?|dead|passed away|pass away|funerals?|grief|grieving|grieve|mourn\\w*|bereave\\w*|condolences?|loss of (?:my|our|his|her)|lost (?:my|our|his|her) (?:mom|mum|mother|dad|father|husband|wife|son|daughter|brother|sister|child|baby|friend|grandm\\w*|grandf\\w*|grandp\\w*|partner|dog|cat)|miscarriage|stillbirth|stillborn|cemetery|grave|hospice|palliative|terminal(?:ly)?|incurable"),
  // Diagnosis and serious medical news.
  RU("диагноз|диагностир|онколог|рак(?:а|у|е|ом)?(?![а-я])|опухол|новообразован|злокачеств|метастаз|карцином|лимфом|лейкоз|лейкеми|саркома|меланом|кист(?:а|ы|у|е|ой)(?![а-я])|диабет|туберкул|гепатит|вич(?![а-я])|спид(?![а-я])|биопси|химиотерап|химия(?![а-я])|лучев\\w* терап|облучен|операци|хирург|госпитал|больниц|стационар|рассеянн\\w* склероз|паркинсон|альцгеймер|деменци|астм|аутоиммун|воспален|инфекци|вирус|ковид|пневмон|бронхит|грипп|беремен|положительн\\w* тест|плох(?:ие|ой|их|ая) (?:анализ|результат|новост)|обнаружил|выявил|подозрен|подозрева|гемоглобин|холестерин|глюкоз|сахар в крови|ферритин|ттг(?![а-я])|креатинин|билирубин|лейкоцит|тромбоцит|эритроцит|соэ(?![а-я])"),
  EN("diagnos\\w*|cancer\\w*|oncolog\\w*|tumou?rs?|malignan\\w*|metasta\\w*|carcinoma|lymphoma|leuka?emia|sarcoma|melanoma|cysts?|diabet\\w*|tuberculosis|hepatitis|hiv|aids|biopsy|chemo\\w*|radiation|radiotherapy|surgery|surgeon|surgical|operation|hospitals?|inpatient|multiple sclerosis|parkinson\\w*|alzheimer\\w*|dementia|epilep\\w*|asthma|autoimmune|inflammation|infections?|virus|viral|covid|pneumonia|bronchitis|flu|influenza|pregnan\\w*|positive (?:test|result)|(?:came back|tested|came out) (?:positive|bad|abnormal)|(?:bad|poor|abnormal|worrying|concerning|alarming) (?:test|lab|blood|results?|news)|found (?:a )?(?:lump|mass|nodule|tumou?r|spot)|lumps?|nodules?|suspect\\w*|ha?emoglobin|cholesterol|glucose|blood sugar|ferritin|tsh|creatinine|bilirubin|white blood|platelets?|a1c")
];

function fold(text: string): string {
  return text.toLowerCase().replace(/ё/g, "е");
}

/**
 * True when the person's message touches anything on the no-reaction list.
 * Reads the text only to answer yes or no; nothing about it is kept.
 */
export function isReactionBlockedBySafety(message: string): boolean {
  const text = fold(message);
  if (!text.trim()) return true;
  return REACTION_SAFETY_PATTERNS.some((pattern) => pattern.test(text));
}

// The delivered reply is the second witness. If Anham had to invoke the
// emergency protocol, refuse, or fall back to the honesty guard, the moment
// is not one for a reaction, whatever the person's message looked like.
const REPLY_SAFETY_PATTERNS: readonly RegExp[] = [
  NUM("911|112|103|999"),
  RU("экстренн|неотложн|скор(?:ую|ая|ой) (?:помощ|медицин)|приемн\\w* поко|горяч\\w* лини|немедленно обратит|не могу помочь с этим запросом|не могу это подтвердить"),
  EN("emergency|ambulance|urgent care|crisis (?:line|hotline|service)|hotline|contact .{0,40}emergency|can[’']?t help with that request|cannot help with that request|can[’']?t confirm this")
];

export function doesReplyBlockReaction(reply: string): boolean {
  const text = fold(reply);
  return REPLY_SAFETY_PATTERNS.some((pattern) => pattern.test(text));
}

export type ResolveReactionInput = {
  // What the model proposed, already passed through the allowlist.
  proposed: AnhamReaction | null;
  // The person's own message, as sent to the model.
  question: string;
  // The reply that will actually be delivered.
  reply: string;
  tier: ReactionTier;
  // A provider policy refusal or any other reason the exchange is not a
  // conversational one.
  refusal?: boolean;
};

/**
 * The single decision point. Order matters and is the policy: nothing
 * proposed → nothing; tier not allowed → nothing; safety says no → nothing.
 * Only a proposal that survives every gate is shown.
 */
export function resolveAnhamReaction(input: ResolveReactionInput): AnhamReaction | null {
  const proposed = normalizeReaction(input.proposed);
  if (!proposed || input.refusal) return null;
  if (input.tier === "guest" && !GUEST_REACTIONS.includes(proposed)) return null;
  if (isReactionBlockedBySafety(input.question)) return null;
  if (doesReplyBlockReaction(input.reply)) return null;
  return proposed;
}

// Appended to the client route's system prompt only. Voice, staff and
// Professor Python conversations never see it, so no reaction can appear
// anywhere but next to a person's message in the Anham chat.
export function anhamReactionRule(tier: ReactionTier): string {
  const guest = tier === "guest"
    ? "\nНа публичном сайте реагируй особенно сдержанно: только heart, thanks или thumbs_up, и только на явную благодарность или полезное уточнение. Все остальные ключи здесь недопустимы.\nOn the public site react very rarely: only heart, thanks or thumbs_up, and only to clear gratitude or a useful clarification."
    : "";

  return `
## Реакция на сообщение человека / Message reaction
Иногда, редко, ты можешь отметить человеческий момент в сообщении собеседника одной реакцией, как в мессенджере. Это не часть текста ответа: сервер покажет её маленьким значком рядом с сообщением человека. Если реакция уместна, начни ответ с отдельной первой строки строго вида [[reaction:ключ]] и с новой строки дай обычный полный ответ. Ключ только из списка: heart (тёплая благодарность, доброе слово), thanks (благодарность в ответ на благодарность), clap (выполнил цель, сделал шаг, сообщил о прогрессе), celebrate (заметное достижение, которое человек сам празднует), strength (усилие, преодоление, настойчивость), thumbs_up (полезное уточнение, подтверждение важного факта), eyes (прислал документ или файл, просит посмотреть), smile (лёгкий юмор, тёплая шутка). Реакция не заменяет текстовый ответ и никогда не является ответом сама по себе.
Правила: не больше одной реакции; большинство обычных вопросов и сообщений остаются без реакции; реагируй на человеческий момент, а не на тему. Никогда не ставь реакцию, если в сообщении есть или может быть боль, ухудшение состояния, затруднённое дыхание, кровотечение, потеря сознания, судороги, любой красный флаг, вопрос о лекарстве или дозировке, возможная медицинская опасность, мысли о самоповреждении, эмоциональный кризис, страх за жизнь, смерть или утрата, диагноз, серьёзная медицинская новость, или если реакция может показаться обесцениванием состояния человека. При сомнении не ставь реакцию. Никогда не пиши эмодзи вместо ключа и не придумывай другие ключи: сервер отклонит всё, что не входит в список. Протокол безопасности всегда важнее реакции.
EN: Optionally, and rarely, begin the reply with one separate first line exactly [[reaction:key]] using only heart, thanks, clap, celebrate, strength, thumbs_up, eyes or smile, then give the normal full reply. At most one. Most messages get none. Never react when the message may involve pain, worsening, breathing trouble, bleeding, loss of consciousness, seizures, any red flag, medication or dosage, medical danger, self-harm, emotional crisis, fear for life, death or loss, a diagnosis or serious medical news. When unsure, do not react. Never output an emoji or any other key. Safety always outranks a reaction.${guest}
`;
}
