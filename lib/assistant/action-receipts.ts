/** An in-memory result of an actual server action, never parsed from chat/body. */
export type ActionScope = { requestId: string; actorId: string; caseId: string | null };
export type ActionReceipt = ActionScope & {
  id: string;
  outcome: "succeeded" | "failed";
  completedAt: string;
  // Human-readable result owned by the server action, never model-generated.
  message: { ru: string; en: string };
};

export function resolveActionReceipts(text: string, locale: "ru" | "en", scope: ActionScope | null, receipts: readonly ActionReceipt[]): string | null {
  let invalid = false;
  const rendered = text.replace(/\[\[action:([^\]]*)\]\]/g, (_, id: string) => {
    const matches = receipts.filter((receipt) => receipt.id === id);
    const receipt = matches.length === 1 ? matches[0] : null;
    if (!scope || !receipt || receipt.outcome !== "succeeded" ||
      receipt.requestId !== scope.requestId || receipt.actorId !== scope.actorId || receipt.caseId !== scope.caseId ||
      !Number.isFinite(Date.parse(receipt.completedAt)) || Date.parse(receipt.completedAt) > Date.now()) {
      invalid = true;
      return "";
    }
    return receipt.message[locale];
  });
  return invalid || rendered.includes("[[action:") ? null : rendered;
}
