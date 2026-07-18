"use server";

import { revalidatePath } from "next/cache";
import type { StaffActionState } from "@/lib/cases/staff-types";
import { getStaffUserState } from "@/lib/auth/require-staff";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/utils/uuid";

export async function acknowledgeEscalation(
  _previousState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const auth = await getStaffUserState();

  if (auth.status !== "authorized") {
    return { status: "error", message: "Нет доступа." };
  }

  const escalationId = String(formData.get("escalationId") ?? "");

  if (!isUuid(escalationId)) {
    return { status: "error", message: "Некорректный идентификатор." };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      status: "error",
      message: "Service role key не настроен — изменение недоступно."
    };
  }

  const { error } = await supabase
    .from("escalation_events")
    .update({
      status: "acknowledged",
      requires_immediate_review: false,
      updated_at: new Date().toISOString()
    })
    .eq("id", escalationId);

  if (error) {
    return { status: "error", message: `Не удалось обновить: ${error.message}` };
  }

  revalidatePath("/admin");

  return { status: "success", message: "Отмечено как обработанное." };
}
