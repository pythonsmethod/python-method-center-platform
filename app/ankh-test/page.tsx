import { notFound } from "next/navigation";
import { ConnectedHarnessPanel } from "@/components/ankh/ConnectedHarnessPanel";
import { buildSyntheticConnectedDemo } from "@/lib/ankh-harness/synthetic-demo";

export const dynamic = "force-dynamic";

export default async function AnkhConnectedHarnessPage({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  if (process.env.NODE_ENV !== "development" || process.env.ANKH_HARNESS_ENABLED !== "true") notFound();
  const locale = (await searchParams).locale === "en" ? "en" : "ru";
  return <ConnectedHarnessPanel run={buildSyntheticConnectedDemo()} locale={locale} />;
}
