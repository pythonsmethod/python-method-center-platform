import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormEvent, ReactElement } from "react";

const action = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [{ status: "error", message: "Please check the address" }, action, false],
    useState: (initial: unknown) => [initial, vi.fn()],
    startTransition: (callback: () => void) => callback()
  };
});

vi.mock("@/lib/onboarding/actions", () => ({ submitOnboarding: vi.fn() }));

import { OnboardingForm } from "@/app/(client)/onboarding/OnboardingForm";
import type { Dictionary } from "@/lib/i18n/dictionaries";

describe("onboarding retry after a server error", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    action.mockReset();
  });

  it("sends a snapshot without allowing the browser to clear the current draft", () => {
    const draft = {
      fullName: "Test Person",
      countryCode: "US",
      phone: "+1 555 0100",
      deliveryCity: "Test City",
      deliveryStreet: "Test Street",
      primaryGoal: "Test goal",
      situationDescription: "Fictional notes",
      ageConfirmed: "on",
      offerAccepted: "on",
      consentAccepted: "on"
    };
    const formElement = { fields: draft, reset: vi.fn() };
    class SnapshotFormData {
      values: Record<string, string>;
      constructor(form: typeof formElement) {
        this.values = { ...form.fields };
      }
    }
    vi.stubGlobal("FormData", SnapshotFormData);

    const form = OnboardingForm({
      profileDefaults: { fullName: "", phone: "", countryCode: "" },
      labels: {} as Dictionary["onboarding"],
      locale: "en"
    }) as ReactElement<{ onSubmit: (event: FormEvent<HTMLFormElement>) => void }>;
    const preventDefault = vi.fn();

    form.props.onSubmit({
      currentTarget: formElement,
      preventDefault
    } as unknown as FormEvent<HTMLFormElement>);

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(formElement.reset).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledOnce();
    expect(action.mock.calls[0][0].values).toEqual(draft);
    expect(formElement.fields).toEqual(draft);

    // The visitor corrects just the rejected field and can retry with all
    // other answers, delivery details, and consent choices still present.
    formElement.fields.deliveryCity = "Corrected City";
    form.props.onSubmit({
      currentTarget: formElement,
      preventDefault
    } as unknown as FormEvent<HTMLFormElement>);

    expect(action).toHaveBeenCalledTimes(2);
    expect(action.mock.calls[0][0].values.deliveryCity).toBe("Test City");
    expect(action.mock.calls[1][0].values).toEqual(draft);
    expect(formElement.reset).not.toHaveBeenCalled();
  });
});
