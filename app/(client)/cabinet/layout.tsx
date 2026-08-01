import type { ReactNode } from "react";
import { CabinetShell } from "@/components/cabinet/CabinetShell";
import { getRequiredUser } from "@/lib/auth/require-user";
import { getClientCaseShell } from "@/lib/cases/queries";
import { getUnreadForClient } from "@/lib/messages/queries";
import { getTokenLedger } from "@/lib/tokens/queries";

// The shell is shared by every cabinet page, so the person keeps the same
// sidebar and the same header wherever they go inside.
export default async function CabinetLayout({
  children
}: {
  children: ReactNode;
}) {
  const auth = await getRequiredUser("/cabinet");

  if (auth.status === "missing-env") {
    return <>{children}</>;
  }

  const caseResult = await getClientCaseShell(auth.userId);
  const caseId =
    caseResult.status === "ready" && caseResult.case ? caseResult.case.id : null;

  const [unread, tokens] = await Promise.all([
    caseId ? getUnreadForClient(caseId) : Promise.resolve(0),
    getTokenLedger(auth.userId)
  ]);

  const greetingName = auth.email ? auth.email.split("@")[0] : "друг";

  return (
    <CabinetShell
      email={auth.email}
      greetingName={greetingName}
      tokens={tokens.balance}
      unread={unread}
    >
      {children}
    </CabinetShell>
  );
}
