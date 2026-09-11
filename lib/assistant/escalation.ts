import {
  escalationTarget,
  unconfirmedReply,
  type EscalationTarget,
  type HonestyAudience
} from "@/lib/assistant/factual-honesty";

// Turning an honest refusal into a founder-readable signal — without
// carrying the question.
//
// Anham's most valuable sentence is "I can't confirm this, and I don't want
// to mislead you." It is also the only moment the platform reliably knows
// that the centre's own knowledge is missing something. Until now that
// moment left no trace: the same gap produced the same apology tomorrow.
//
// The founder needs to know WHICH knowledge is missing. They do not need,
// and must never be given, the client's words. So the question is reduced
// here to one value from a closed list of non-clinical subject areas, and
// only that value leaves this module. A question about a symptom becomes
// "medical_review" — the fact that Professor Python's domain came up, with
// no trace of what was asked.
//
// This is the same rule the voice diagnostics follow: enumerated codes, never
// the speech.

export const GAP_TOPICS = [
  "service_scope",
  "pricing_and_plans",
  "payment_or_refund",
  "access_or_account",
  "documents_and_uploads",
  "schedule_and_timing",
  "methodology",
  "medical_review",
  "unclassified"
] as const;

export type GapTopic = (typeof GAP_TOPICS)[number];

export type GapAudience = "client" | "staff";

export type GapSignal = {
  topic: GapTopic;
  audience: GapAudience;
  escalationTarget: EscalationTarget;
  locale: "ru" | "en";
};

// Matched against the question only to choose one enumerated bucket. The
// matched text is never returned, stored or logged. Ordered: the first
// pattern that matches wins, and the clinical bucket is tested last so a
// payment question that happens to mention a symptom is still a payment
// question for the founder's purposes.
const TOPIC_PATTERNS: ReadonlyArray<readonly [GapTopic, RegExp]> = [
  [
    "payment_or_refund",
    /оплат|плат[её]ж|платеж|возврат|счёт|счет|чек|карт[ыаеу]|перевод|тариф.*(?:оплат|стоим)|payment|refund|invoice|receipt|billing|charge|checkout/iu
  ],
  [
    "pricing_and_plans",
    /цен[аыеу]|стоимост|сколько стоит|прайс|тариф|подписк|пакет|price|pricing|cost|how much|plan|subscription|package/iu
  ],
  [
    "access_or_account",
    /доступ|вход|войти|логин|парол|аккаунт|кабинет|регистрац|подтвержден.*почт|access|login|log in|sign in|password|account|cabinet|register|verification email/iu
  ],
  [
    "documents_and_uploads",
    /загруз|выгруз|файл|документ|pdf|скан|фото.*(?:анализ|документ)|прикреп|upload|download|file|document|scan|attach/iu
  ],
  [
    "schedule_and_timing",
    /срок|когда|сколько ждать|график|расписан|длительност|период|дедлайн|deadline|when|how long|schedule|timeline|duration|waiting/iu
  ],
  [
    "methodology",
    /метод|подход|программ|протокол|как это работает|принцип|методолог|method|approach|programme|program|protocol|how does it work|principle/iu
  ],
  [
    "service_scope",
    /центр|услуг|что вы делаете|чем помога|сопровожден|консультац|формат работы|centre|center|service|what do you do|what you offer|support format|consultation/iu
  ],
  [
    "medical_review",
    /анализ|симптом|диагноз|лечени|дозиров|препарат|болит|самочувств|медицин|витамин|добавк|показател|кров|моч|diagnos|symptom|treatment|dosage|medicat|blood|urine|lab result|medical|supplement|vitamin|marker/iu
  ]
];

/**
 * One enumerated subject area for a question. The question text is read here
 * and nowhere else: only the returned value is ever persisted.
 */
export function classifyGapTopic(question: string): GapTopic {
  const text = question.trim();

  if (!text) {
    return "unclassified";
  }

  for (const [topic, pattern] of TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      return topic;
    }
  }

  return "unclassified";
}

// Every sentence the honesty guard can substitute for a rejected answer, in
// both languages and for every audience. Comparing against these exactly is
// what keeps the signal trustworthy: a gap is recorded when the platform
// itself replaced the answer, never when a model merely sounded unsure.
function guardReplies(): ReadonlySet<string> {
  const targets: EscalationTarget[] = ["karen", "support", "team", "clarify"];
  const audiences: HonestyAudience[] = ["client", "founder", "karen"];
  const replies = new Set<string>();

  for (const locale of ["ru", "en"] as const) {
    for (const target of targets) {
      for (const audience of audiences) {
        replies.add(unconfirmedReply(locale, target, audience));
      }
    }
  }

  return replies;
}

const GUARD_REPLIES = guardReplies();

/**
 * Whether a delivered reply is the honesty guard's own substitution rather
 * than a model answer. Exact match on purpose — see guardReplies above.
 */
export function isGuardEscalationReply(reply: string): boolean {
  return GUARD_REPLIES.has(reply.trim());
}

/**
 * The founder-facing signal for one exchange, or null when nothing is
 * missing. Returns enumerated values only; the question is not carried.
 *
 * "clarify" is deliberately not a gap: the assistant asking which figure the
 * person means is a good conversation, not missing knowledge, and recording
 * it would bury the real gaps under ordinary small talk.
 */
export function detectKnowledgeGap(input: {
  reply: string;
  question: string;
  audience: GapAudience;
  locale: "ru" | "en";
}): GapSignal | null {
  if (!isGuardEscalationReply(input.reply)) {
    return null;
  }

  const target = escalationTarget(input.question);

  if (target === "clarify") {
    return null;
  }

  return {
    topic: classifyGapTopic(input.question),
    audience: input.audience,
    escalationTarget: target,
    locale: input.locale
  };
}
