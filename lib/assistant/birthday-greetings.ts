import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function deliverBirthdayGreetings(now = new Date()): Promise<number> {
  const service = createSupabaseServiceClient();
  if (!service) throw new Error("Birthday greeting delivery unavailable");
  const { data, error } = await service.rpc("deliver_assistant_birthday_greetings", {
    p_now: now.toISOString(),
    p_limit: 500
  });
  if (error || typeof data !== "number") throw new Error("Birthday greeting delivery failed");
  return data;
}
