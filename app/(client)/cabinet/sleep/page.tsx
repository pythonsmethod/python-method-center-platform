import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Archived, not deleted: the tracker code and existing client data remain
// available for a future redesign, but the current website and app expose
// no entry point. Old bookmarks return safely to the cabinet home.
export default async function CabinetSleepPage() {
  redirect("/cabinet");
}
