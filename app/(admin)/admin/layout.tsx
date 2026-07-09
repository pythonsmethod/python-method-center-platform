import { notFound } from "next/navigation";
import { getRequiredStaffUser } from "@/lib/auth/require-staff";

type AdminLayoutProps = {
  children: React.ReactNode;
};

// Defense in depth for every /admin/* page: a future page that forgets its
// own getRequiredStaffUser call still fails closed here. Pages keep their
// per-status UI (setup notices, error panels) for the non-forbidden states.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const auth = await getRequiredStaffUser("/admin");

  if (auth.status === "forbidden") {
    notFound();
  }

  return <>{children}</>;
}
