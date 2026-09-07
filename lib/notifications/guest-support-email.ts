type GuestSupportEmailInput = {
  requestId: string;
  subject: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  message: string;
  link: string;
};

export type GuestSupportEmailResult = "sent" | "skipped" | "failed";

function recipients(): string[] {
  const configured = process.env.SUPPORT_NOTIFICATION_EMAIL ?? process.env.KAREN_EMAILS ?? "";
  return configured.split(",").map((email) => email.trim()).filter(Boolean);
}

export async function sendGuestSupportEmail(input: GuestSupportEmailInput): Promise<GuestSupportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.SUPPORT_FROM_EMAIL?.trim();
  const to = recipients();
  if (!apiKey || !from || to.length === 0) return "skipped";

  const text = [
    "Новое обращение без аккаунта", "",
    `Тема: ${input.subject}`,
    `Имя: ${input.guestName}`,
    `Email: ${input.guestEmail}`,
    `Телефон: ${input.guestPhone}`, "",
    "Сообщение:", input.message, "",
    `Открыть обращение: ${input.link}`, "",
    "Нажмите «Ответить» в почтовой программе — ответ будет адресован клиенту."
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `guest-support-${input.requestId}`
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: input.guestEmail,
        subject: `Новое обращение: ${input.subject}`,
        text
      })
    });
    if (!response.ok) {
      console.error("sendGuestSupportEmail: delivery failed", response.status);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("sendGuestSupportEmail: unexpected failure", error instanceof Error ? error.message : "unknown error");
    return "failed";
  }
}
