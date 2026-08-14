"use client";

import { useActionState } from "react";
import { signInWithProvider } from "@/lib/auth/actions";
import type { SocialProvider } from "@/lib/auth/providers";
import { initialAuthActionState } from "@/lib/auth/types";

type SocialSignInLabels = {
  divider: string;
  google: string;
  apple: string;
  hint: string;
};

type SocialSignInProps = {
  providers: SocialProvider[];
  labels: SocialSignInLabels;
  nextPath: string;
};

// The marks are drawn here rather than loaded: an external logo file is a
// request to somebody else's server on the sign-in page, and both companies
// require their own mark, not an approximation.
function GoogleMark() {
  return (
    <svg aria-hidden="true" className="auth-social__mark" viewBox="0 0 18 18">
      <path
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" className="auth-social__mark" viewBox="0 0 18 18">
      <path
        d="M13.1 9.55c.02-1.6.72-2.8 2.1-3.68-.77-1.1-1.94-1.71-3.48-1.83-1.46-.11-3.05.85-3.63.85-.61 0-2.02-.81-3.13-.81C2.66 4.12.24 5.9.24 9.53c0 1.07.2 2.18.59 3.32.52 1.5 2.4 5.17 4.36 5.11.92-.02 1.57-.65 2.77-.65 1.16 0 1.76.65 2.79.65 1.98-.03 3.68-3.36 4.17-4.87-2.65-1.25-2.82-3.66-2.82-3.54ZM11.03 2.9c1-1.19.9-2.27.87-2.66-.88.05-1.89.6-2.47 1.27-.63.72-1 1.61-.92 2.62.95.07 1.82-.42 2.52-1.23Z"
        fill="currentColor"
      />
    </svg>
  );
}

const MARKS: Record<SocialProvider, () => React.ReactElement> = {
  google: GoogleMark,
  apple: AppleMark
};

export function SocialSignIn({
  providers,
  labels,
  nextPath
}: SocialSignInProps) {
  const [state, action, pending] = useActionState(
    signInWithProvider,
    initialAuthActionState
  );

  // Nothing configured, nothing offered. A button that ends on somebody
  // else's error page reads as a broken site, not a missing setting.
  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="auth-social">
      <div className="auth-social__divider">
        <span>{labels.divider}</span>
      </div>

      {providers.map((provider) => {
        const Mark = MARKS[provider];

        return (
          <form action={action} key={provider}>
            <input name="next" type="hidden" value={nextPath} />
            <input name="provider" type="hidden" value={provider} />
            <button
              className="auth-social__button"
              disabled={pending}
              type="submit"
            >
              <Mark />
              <span>{labels[provider]}</span>
            </button>
          </form>
        );
      })}

      {state.status === "error" && state.message ? (
        <p className="form-message form-message--error">{state.message}</p>
      ) : null}

      <p className="auth-social__hint">{labels.hint}</p>
    </div>
  );
}
