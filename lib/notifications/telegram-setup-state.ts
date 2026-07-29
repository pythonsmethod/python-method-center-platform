// Shapes and initial values for the Telegram setup panel.
//
// These live outside the "use server" module on purpose: a file marked
// "use server" may only export async functions. A plain object exported
// from there reaches the browser as a server reference instead of the
// object itself, and the first property read on it crashes the page.

export type TelegramChat = {
  id: string;
  title: string;
};

export type TelegramChatsState = {
  status: "idle" | "success" | "error";
  message: string;
  chats: TelegramChat[];
};

export const initialTelegramChatsState: TelegramChatsState = {
  status: "idle",
  message: "",
  chats: []
};

export type TestNotificationState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialTestNotificationState: TestNotificationState = {
  status: "idle",
  message: ""
};
