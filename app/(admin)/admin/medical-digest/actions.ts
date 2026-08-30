"use server";

import { revalidatePath } from "next/cache";
import { getKarenAssistantUserState } from "@/lib/auth/require-karen";
import { generateMedicalDigest } from "@/lib/medical-digest/digest";

export type DigestRefreshState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function refreshMedicalDigest(
  _previous: DigestRefreshState
): Promise<DigestRefreshState> {
  const auth = await getKarenAssistantUserState();
  if (auth.status !== "authorized") {
    return { status: "error", message: "Доступ к обновлению не подтверждён." };
  }

  try {
    await generateMedicalDigest();
    revalidatePath("/admin/medical-digest");
    return { status: "success", message: "Сегодняшний обзор обновлён." };
  } catch (error) {
    console.error("medical-digest-manual-refresh-failed", error);
    return {
      status: "error",
      message: "Не удалось собрать выпуск. Проверьте подключение и повторите позже."
    };
  }
}


