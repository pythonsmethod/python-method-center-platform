import { describe, expect, it } from "vitest";
import {
  ANHAM_REACTIONS,
  ANHAM_REACTION_EMOJI,
  anhamReactionRule,
  doesReplyBlockReaction,
  extractReactionMarker,
  GUEST_REACTIONS,
  isReactionBlockedBySafety,
  normalizeReaction,
  resolveAnhamReaction
} from "@/lib/assistant/reactions";
import { providerPolicyRefusal } from "@/lib/assistant/policy-refusal";
import { unconfirmedReply } from "@/lib/assistant/factual-honesty";

const ORDINARY = [
  "Сколько стоит сопровождение на 5 недель?",
  "Как загрузить документы в кабинет?",
  "What does the 100-day plan include?",
  "Когда Professor Python посмотрит мою анкету?"
];

const PROGRESS = [
  "Я сегодня наконец-то прошёл 5000 шагов",
  "Заполнил анкету и загрузил всё, что вы просили. Получилось!",
  "I finally walked 5000 steps today",
  "I finished the whole plan for this week"
];

const GRATITUDE = [
  "Спасибо, теперь понятно",
  "Огромное спасибо за терпение!",
  "Thanks, that makes sense now",
  "Thank you so much for explaining"
];

const CLARIFICATION = [
  "Загрузил документы, посмотри пожалуйста",
  "Уточняю: анкету я заполнял в июле, а не в июне.",
  "I uploaded the file, please take a look",
  "To clarify: the questionnaire was filled in July, not June."
];

const UNSAFE: Record<string, string[]> = {
  "severe pain": ["У меня сильная боль в спине, не могу встать", "The pain in my chest is unbearable", "Голова болит третий день"],
  "worsening": ["Мне стало резко хуже после прогулки", "I feel much worse than yesterday"],
  "breathing": ["Тяжело дышать, не хватает воздуха", "I can't catch my breath"],
  "bleeding": ["Идёт кровь и не останавливается", "There is a lot of blood"],
  "consciousness": ["Потеряла сознание на кухне", "I passed out this morning"],
  "seizures": ["У ребёнка судороги", "He had a seizure"],
  "emergency": ["Вызвали скорую, что делать?", "Should I call 911?", "This is an emergency"],
  "medication": ["Можно ли принимать 400 мг ибупрофена дважды в день?", "Какая дозировка витамина D мне нужна?", "Can I double my medication dose?", "Is 200 mg too much?"],
  "self-harm": ["Не хочу больше жить", "Хочу навредить себе", "I want to kill myself", "I keep thinking about hurting myself"],
  "emotional crisis": ["У меня паническая атака, мне очень страшно", "Я в отчаянии и не справляюсь", "I am in complete despair", "I can't cope anymore"],
  "fear for life": ["Боюсь, что умру", "I think I'm going to die"],
  "death and grief": ["Вчера умерла мама", "My father passed away last week", "Похоронили брата"],
  "diagnosis": ["Мне поставили диагноз", "Врач обнаружил опухоль", "I was diagnosed with cancer", "They found a lump"],
  "serious medical news": ["Пришли плохие анализы, гемоглобин упал", "The test came back positive"]
};

describe("Anham reaction allowlist", () => {
  it("accepts only the eight controlled keys", () => {
    for (const key of ANHAM_REACTIONS) {
      expect(normalizeReaction(key)).toBe(key);
      expect(ANHAM_REACTION_EMOJI[key]).toMatch(/\p{Extended_Pictographic}/u);
    }
    expect(normalizeReaction(" Thumbs-Up ")).toBe("thumbs_up");
  });

  it("rejects emoji, HTML, unknown keys and non-strings", () => {
    for (const value of ["👏", "❤️", "🔥", "💊", "<img src=x onerror=alert(1)>", "<b>clap</b>", "fire", "laugh", "none", "", null, undefined, 3, { key: "clap" }, ["clap"]]) {
      expect(normalizeReaction(value)).toBeNull();
    }
  });

  it("keeps the guest subset inside the allowlist and calm", () => {
    expect(GUEST_REACTIONS.every((key) => ANHAM_REACTIONS.includes(key))).toBe(true);
    expect(GUEST_REACTIONS).not.toContain("celebrate");
    expect(GUEST_REACTIONS).not.toContain("smile");
  });
});

describe("reaction marker extraction", () => {
  it("separates one proposal from the prose and removes the marker", () => {
    const result = extractReactionMarker("[[reaction:clap]]\nПять тысяч шагов, это отличный результат.\n\nКак самочувствие после прогулки?");
    expect(result).toEqual({ reply: "Пять тысяч шагов, это отличный результат.\n\nКак самочувствие после прогулки?", reaction: "clap", markers: 1 });
  });

  it("leaves a reply without a marker untouched", () => {
    expect(extractReactionMarker("Обычный ответ без реакции.")).toEqual({ reply: "Обычный ответ без реакции.", reaction: null, markers: 0 });
  });

  it("drops an emoji or unknown value but still strips the marker", () => {
    for (const marker of ["[[reaction:👏]]", "[[reaction:🔥]]", "[[reaction:fire]]", "[[reaction: <b>clap</b> ]]", "[[reaction]]", "[[ reaction : ]]"]) {
      const result = extractReactionMarker(`${marker}\nAnswer text.`);
      expect(result.reaction).toBeNull();
      expect(result.reply).toBe("Answer text.");
      expect(result.reply).not.toContain("[[");
    }
  });

  it("keeps at most one reaction when the model sends several", () => {
    const result = extractReactionMarker("[[reaction:clap]] [[reaction:heart]]\nText. [[reaction:celebrate]]");
    expect(result.reaction).toBe("clap");
    expect(result.markers).toBe(3);
    expect(result.reply).toBe("Text.");
  });

  it("tolerates spacing and case, and a marker placed at the end", () => {
    expect(extractReactionMarker("Text first.\n\n[[ Reaction : THANKS ]]")).toEqual({ reply: "Text first.", reaction: "thanks", markers: 1 });
  });
});

describe("reaction safety classifier", () => {
  it.each([...ORDINARY, ...PROGRESS, ...GRATITUDE, ...CLARIFICATION])("does not block a safe message: %s", (message) => {
    expect(isReactionBlockedBySafety(message)).toBe(false);
  });

  for (const [reason, messages] of Object.entries(UNSAFE)) {
    it.each(messages)(`blocks ${reason}: %s`, (message) => {
      expect(isReactionBlockedBySafety(message)).toBe(true);
    });
  }

  it("blocks an empty message", () => {
    expect(isReactionBlockedBySafety("   ")).toBe(true);
  });

  it("recognises a reply that had to escalate or refuse", () => {
    expect(doesReplyBlockReaction("Пожалуйста, немедленно обратитесь в экстренную службу (112 или 103).")).toBe(true);
    expect(doesReplyBlockReaction("Please contact local emergency services now.")).toBe(true);
    expect(doesReplyBlockReaction(providerPolicyRefusal("en").reply)).toBe(true);
    expect(doesReplyBlockReaction(providerPolicyRefusal("ru").reply)).toBe(true);
    expect(doesReplyBlockReaction(unconfirmedReply("ru", "karen", "client"))).toBe(true);
    expect(doesReplyBlockReaction(unconfirmedReply("en", "support", "client"))).toBe(true);
    expect(doesReplyBlockReaction("Пять тысяч шагов, это отличный результат. Как самочувствие?")).toBe(false);
  });
});

describe("resolveAnhamReaction policy", () => {
  const reply = "Спокойный обычный ответ.";

  it("returns null for an ordinary message when nothing is proposed", () => {
    for (const question of ORDINARY) {
      expect(resolveAnhamReaction({ proposed: null, question, reply, tier: "client" })).toBeNull();
    }
  });

  it("allows a reaction on progress", () => {
    for (const question of PROGRESS) {
      expect(resolveAnhamReaction({ proposed: "clap", question, reply, tier: "client" })).toBe("clap");
      expect(resolveAnhamReaction({ proposed: "strength", question, reply, tier: "registered" })).toBe("strength");
    }
  });

  it("allows a reaction on gratitude", () => {
    for (const question of GRATITUDE) {
      expect(resolveAnhamReaction({ proposed: "heart", question, reply, tier: "client" })).toBe("heart");
      expect(resolveAnhamReaction({ proposed: "thanks", question, reply, tier: "registered" })).toBe("thanks");
    }
  });

  it("allows a reaction on an uploaded file or a useful clarification", () => {
    for (const question of CLARIFICATION) {
      expect(resolveAnhamReaction({ proposed: "eyes", question, reply, tier: "client" })).toBe("eyes");
      expect(resolveAnhamReaction({ proposed: "thumbs_up", question, reply, tier: "client" })).toBe("thumbs_up");
    }
  });

  for (const [reason, messages] of Object.entries(UNSAFE)) {
    it(`safety overrides any proposal: ${reason}`, () => {
      for (const question of messages) {
        for (const proposed of ANHAM_REACTIONS) {
          expect(resolveAnhamReaction({ proposed, question, reply, tier: "client" })).toBeNull();
        }
      }
    });
  }

  it("returns null when the delivered reply invoked the emergency protocol, even for a clean question", () => {
    expect(resolveAnhamReaction({
      proposed: "clap",
      question: PROGRESS[0],
      reply: "То, что вы описали, может быть экстренной ситуацией: позвоните 112 или 103.",
      tier: "client"
    })).toBeNull();
  });

  it("returns null for a provider refusal or an honesty-guard substitution", () => {
    expect(resolveAnhamReaction({ proposed: "heart", question: GRATITUDE[0], reply, tier: "client", refusal: true })).toBeNull();
    expect(resolveAnhamReaction({ proposed: "heart", question: GRATITUDE[0], reply: unconfirmedReply("ru", "clarify", "client"), tier: "client" })).toBeNull();
  });

  it("rejects anything outside the allowlist before any other check", () => {
    expect(resolveAnhamReaction({ proposed: "👏" as never, question: PROGRESS[0], reply, tier: "client" })).toBeNull();
    expect(resolveAnhamReaction({ proposed: "fire" as never, question: PROGRESS[0], reply, tier: "client" })).toBeNull();
  });

  it("keeps guests to a restrained subset", () => {
    expect(resolveAnhamReaction({ proposed: "clap", question: PROGRESS[0], reply, tier: "guest" })).toBeNull();
    expect(resolveAnhamReaction({ proposed: "celebrate", question: PROGRESS[0], reply, tier: "guest" })).toBeNull();
    expect(resolveAnhamReaction({ proposed: "smile", question: "Ха-ха, это было смешно", reply, tier: "guest" })).toBeNull();
    expect(resolveAnhamReaction({ proposed: "thanks", question: GRATITUDE[0], reply, tier: "guest" })).toBe("thanks");
    expect(resolveAnhamReaction({ proposed: "heart", question: GRATITUDE[2], reply, tier: "guest" })).toBe("heart");
    expect(resolveAnhamReaction({ proposed: "thumbs_up", question: CLARIFICATION[1], reply, tier: "guest" })).toBe("thumbs_up");
  });
});

describe("reaction prompt rule", () => {
  it("names the marker, the allowlist and the safety priority in both languages", () => {
    const rule = anhamReactionRule("client");
    expect(rule).toContain("[[reaction:");
    for (const key of ANHAM_REACTIONS) expect(rule).toContain(key);
    expect(rule).toMatch(/Протокол безопасности всегда важнее реакции/);
    expect(rule).toMatch(/Safety always outranks a reaction/);
    expect(rule).not.toMatch(/[👏❤️🥳👍👀😄🙏💪]/u);
  });

  it("tells the public consultant to be far more restrained", () => {
    expect(anhamReactionRule("guest")).toMatch(/только heart, thanks или thumbs_up/);
    expect(anhamReactionRule("registered")).not.toMatch(/только heart, thanks или thumbs_up/);
  });
});
