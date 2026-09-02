import { permanentRedirect } from "next/navigation";
import { getLocale } from "@/lib/i18n/locale";
import { localizedHref } from "@/lib/i18n/routing";

export const dynamic = "force-dynamic";

// The review used to have its own page, from the time it was the free
// launch offer. It is now a paid format listed with the other two, so this
// address sends people to the plans — in their own language — and keeps
// every old link and search result working.
export default async function ReviewPage() {
  permanentRedirect(localizedHref("/payment", await getLocale()));
}
