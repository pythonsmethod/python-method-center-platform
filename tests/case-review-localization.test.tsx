import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CaseReviewPanel } from "@/components/cases/CaseReviewPanel";

describe("Case review document state copy", () => {
  it.each([
    [["ready"], "All materials are included"],
    [["queued"], "The remaining files are queued or being processed"],
    [["needs_reupload"], "Re-upload required"]
  ] as const)("renders the English state without Russian text", (statuses, expected) => {
    const html = renderToStaticMarkup(
      <CaseReviewPanel
        caseId="11111111-1111-4111-8111-111111111111"
        documentsCount={statuses.length}
        documentStatuses={[...statuses]}
        locale="en"
        review={null}
      />
    );

    expect(html).toContain(expected);
    expect(html).not.toMatch(/[А-Яа-яЁё]/);
  });
});
