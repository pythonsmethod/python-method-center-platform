import { createHash } from "node:crypto";
import { adminLink, notifyTeam } from "@/lib/notifications/notify";
import type { AssistantTier } from "@/lib/assistant/tiers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// Protection of the public assistant against coordinated abuse.
//
// The realistic threat is not a hacker: it is a raid — a group that decides
// to have fun with the AI of a center they dislike. A hundred people writing
// nonsense costs money and drowns the people who actually came for help.
// So the free level is deliberately finite: enough to feel what the platform
// is, far too little to be worth raiding.

// Emergency switch, set in Vercel without touching the code:
//   "open"            — normal (default): guests may talk within the caps
//   "registered_only" — guests are invited to register instead of chatting
//   "off"             — the assistant is silent for everyone but the team
export type PublicAssistantMode = "open" | "registered_only" | "off";

export function getPublicAssistantMode(): PublicAssistantMode {
  const raw = process.env.PUBLIC_ASSISTANT_MODE?.trim().toLowerCase();

  if (raw === "registered_only" || raw === "off") {
    return raw;
  }

  return "open";
}

// Daily caps per person. Generous for someone who genuinely explores the
// center, small enough that a raid hits the wall almost immediately.
const DAILY_LIMIT: Record<AssistantTier, number> = {
  guest: 15,
  registered: 60,
  client: 60
};

// Platform-wide daily cap for guests: the hard ceiling on what the free
// level can ever cost in one day, whatever happens on social media.
const GUEST_DAILY_TOTAL = 400;

// Overridable from Vercel, so the caps can be changed without a deploy.
function envNumber(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGuestDailyTotalLimit(): number {
  return envNumber("ASSISTANT_DAILY_TOTAL_GUEST", GUEST_DAILY_TOTAL);
}

export function getDailyLimit(tier: AssistantTier): number {
  return envNumber(
    `ASSISTANT_DAILY_LIMIT_${tier.toUpperCase()}`,
    DAILY_LIMIT[tier]
  );
}

function hashVisitor(ip: string): string {
  const salt = process.env.ASSISTANT_USAGE_SALT?.trim() ?? "python-method";

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export type GuardDecision =
  | { allowed: true }
  | { allowed: false; status: number; message: string };

const REGISTER_INVITE =
  "Мне было приятно с вами поговорить. Здесь, на сайте, я отвечаю на вопросы о центре — а более развёрнутое, уже личное общение открывается в кабинете после регистрации: там помощник знает вашу ситуацию и ведёт вас шаг за шагом. Зарегистрироваться можно на странице «Начать путь». Если у вас срочный вопрос, напишите нам через «Поддержку» — ответит живой человек.";

const BUSY_INVITE =
  "Сейчас у помощника на главной странице очень много обращений, и я отвечаю с ограничением. Чтобы поговорить спокойно и по вашей ситуации, зарегистрируйтесь — в кабинете помощник доступен полноценно. Срочный вопрос можно задать команде через «Поддержку», там отвечает живой человек.";

// Counts one message and says whether it is allowed. Never throws: if the
// counter is unavailable the request goes through — the per-minute limiter
// in the route still stands, and a person asking for help must not be cut
// off by an infrastructure hiccup.
async function bump(bucketKey: string, limit: number): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceClient();

    if (!supabase) {
      return true;
    }

    const { data, error } = await supabase.rpc("bump_assistant_usage", {
      p_bucket_key: bucketKey,
      p_limit: limit
    });

    if (error) {
      return true;
    }

    const row = Array.isArray(data) ? data[0] : data;

    return row?.allowed !== false;
  } catch {
    return true;
  }
}

// Reading a lab printout is the most expensive request the platform can
// make: images, and a lot of them. The per-minute limiter on the endpoint
// stops a burst, but nothing stopped the same person doing it all day, and
// a focus group finding the paperclip is exactly when that would be found
// out. This is a separate daily budget from chat, because a person may
// reasonably attach several results in a day and should not lose their
// conversation over it.
const FILE_READS_PER_DAY = 20;
const ANHAM_DEEP_READS_PER_DAY = 10;

export async function guardAnhamDeepRequest(
  profileId: string
): Promise<boolean> {
  return bump(
    `anham-deep:${profileId}`,
    envNumber("ANHAM_DEEP_DAILY_LIMIT", ANHAM_DEEP_READS_PER_DAY)
  );
}

export async function guardMetricsExtraction(
  profileId: string
): Promise<boolean> {
  return bump(
    `extract:${profileId}`,
    envNumber("METRICS_EXTRACT_DAILY_LIMIT", FILE_READS_PER_DAY)
  );
}

export async function guardAssistantRequest(input: {
  tier: AssistantTier;
  profileId: string | null;
  ip: string;
  locale?: "ru" | "en";
}): Promise<GuardDecision> {
  const mode = getPublicAssistantMode();
  const en = input.locale === "en";
  const registerInvite = en
    ? "I enjoyed talking with you. More personal guidance is available in your cabinet after registration, where the assistant can follow your situation step by step. If your question is urgent, contact the human team through Support."
    : REGISTER_INVITE;
  const busyInvite = en
    ? "The public assistant is receiving many requests right now. Register to continue calmly in your cabinet. For an urgent question, contact the human team through Support."
    : BUSY_INVITE;

  if (input.tier === "guest") {
    if (mode === "off") {
      return {
        allowed: false,
        status: 503,
        message:
          en ? "The assistant is temporarily unavailable. Contact the human team through Support." : "Помощник сейчас недоступен. Напишите нам через страницу «Поддержка» — ответит живой человек."
      };
    }

    if (mode === "registered_only") {
      return { allowed: false, status: 403, message: registerInvite };
    }
  }

  const personalKey =
    input.profileId ? `u:${input.profileId}` : `v:${hashVisitor(input.ip)}`;
  const personalLimit = envNumber(
    `ASSISTANT_DAILY_LIMIT_${input.tier.toUpperCase()}`,
    DAILY_LIMIT[input.tier]
  );

  const withinPersonal = await bump(personalKey, personalLimit);

  if (!withinPersonal) {
    return {
      allowed: false,
      status: 429,
      message:
        input.tier === "guest"
          ? registerInvite
          : en ? "Your assistant message limit is reached for today. It will be available again tomorrow. Contact the human team for urgent questions." : "На сегодня лимит сообщений помощнику исчерпан — он снова будет доступен завтра. Если вопрос срочный, напишите команде: там отвечает живой человек."
    };
  }

  if (input.tier === "guest") {
    const withinTotal = await bump(
      "total:guest",
      envNumber("ASSISTANT_DAILY_TOTAL_GUEST", GUEST_DAILY_TOTAL)
    );

    if (!withinTotal) {
      // The whole free level is spent for today — that is either real
      // interest or a raid, and either way the founder must know the same
      // day. Deduplicated per day: one message, not four hundred.
      await notifyTeam({
        kind: "processing_error",
        dedupeKey: `assistant-guest-cap:${new Date().toISOString().slice(0, 10)}`,
        title: "ПОМОЩНИК: дневной лимит бесплатных сообщений исчерпан",
        lines: [
          "Гостевой ИИ на публичных страницах достиг дневного потолка и до конца суток приглашает зарегистрироваться.",
          "Если это не всплеск интереса, а наплыв — поставьте PUBLIC_ASSISTANT_MODE=registered_only в Vercel.",
          "Расходы на ИИ за сегодня ограничены этим потолком."
        ],
        link: adminLink()
      });

      return { allowed: false, status: 429, message: busyInvite };
    }
  }

  return { allowed: true };
}
