// Backward-compatible public Stripe endpoint. The Railway production webhook
// was configured with /stripe-webhook, while the canonical Next.js handler
// lives at /api/stripe/webhook. Re-exporting the handler keeps one payment
// implementation and, importantly, passes the untouched Request body through
// to Stripe signature verification.
export const runtime = "nodejs";
export { POST } from "@/app/api/stripe/webhook/route";
