import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";

// The invitation to talk to the assistant, in the cabinet.
//
// Everyone in the focus group registered and not one of them wrote to him.
// What they see explains it without any theory about motivation: after
// registering they land in the cabinet, where the screen is a message thread
// to the team under a heading, and the assistant is an unexplained figure
// moving along the edge. Nobody had been told who he is, what he answers,
// that he replies at once, or that he costs nothing. A person with a
// question wrote in the big visible box — to the team. That is not a failure
// of willingness; it is a missing signpost.
//
// These tests hold the three things the invitation has to do, because each
// of them is a separate reason a person does not start.

describe.each(["ru", "en"] as const)("the invitation in %s", (locale) => {
  const t = getDictionary(locale).cabinet.home;

  it("offers questions ready to press, not an empty box", () => {
    // The barrier is not motivation, it is not knowing what may be asked.
    expect(t.inviteQuestions.length).toBeGreaterThanOrEqual(3);

    for (const question of t.inviteQuestions) {
      expect(question.trim().endsWith("?"), question).toBe(true);
    }
  });

  it("says the answer costs nothing and takes none of the programme", () => {
    // Someone paying for a support programme has every reason to assume a
    // question spends it.
    const expected = locale === "ru" ? "бесплатно" : "free";

    expect(t.inviteText.toLowerCase()).toContain(expected);
  });

  it("says he answers at once", () => {
    // The thread below is answered by a person, in hours or days. The
    // difference is the whole reason to write here instead.
    const expected = locale === "ru" ? "сразу" : "straight away";

    expect(t.inviteTitle.toLowerCase()).toContain(expected);
  });

  it("never lets him be mistaken for Professor Python", () => {
    // The one misunderstanding this platform cannot afford: a person
    // reading a machine's answer as the expert's own.
    const expected = locale === "ru" ? "а не Professor Python" : "not Professor Python";

    expect(t.inviteBoundary).toContain(expected);
  });

  it("points at where the expert's own answer comes from", () => {
    const expected = locale === "ru" ? "в переписке ниже" : "in the conversation below";

    expect(t.inviteBoundary).toContain(expected);
  });
});

describe("the first question a person is offered", () => {
  it("is about their own results, not about the platform", () => {
    // Someone who has just uploaded their analyses is holding one question,
    // and it is this one. Offering "how do I use the site" first answers
    // nobody's actual worry.
    expect(getDictionary("ru").cabinet.home.inviteQuestions[0]).toContain("анализ");
    expect(getDictionary("en").cabinet.home.inviteQuestions[0]).toContain("results");
  });
});
