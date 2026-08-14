// Types and initial values for the sleep tracker's server actions.
//
// They live outside actions.ts because a "use server" module may export
// nothing but async functions — Next.js E352, and it fails at runtime, not
// at build time.

export type SleepActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialSleepActionState: SleepActionState = {
  status: "idle",
  message: ""
};

export type SleepImportState = SleepActionState & {
  imported: number;
  // Lines the import could not read, in the person's words, so they can open
  // the file and look. Never silently dropped.
  skipped: string[];
  recognized: string[];
};

export const initialSleepImportState: SleepImportState = {
  status: "idle",
  message: "",
  imported: 0,
  skipped: [],
  recognized: []
};

export type SleepAdviceState = {
  status: "idle" | "success" | "error";
  advice: string;
  message: string;
};

export const initialSleepAdviceState: SleepAdviceState = {
  status: "idle",
  advice: "",
  message: ""
};
