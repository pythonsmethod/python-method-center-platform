import type { StaffCaseListItem } from "@/lib/cases/staff-queries";

// Finding one client in the list.
//
// A payment arrives from an address, and the first question is always "do
// we know this person?". Without a search that means scrolling a growing
// table on a phone and trusting your eyes — which is how a payment ends up
// looking unmatched when the account was there all along.
//
// Done in the page rather than in the database on purpose: the list is
// already loaded and small, and a query per keystroke would buy nothing.

// Digits only, so a phone number matches however it was typed: +996 70 264
// 5977, 996702645977 and 8-996-702-64-59-77 are the same number to a person
// and three different strings to a computer.
function digits(value: string): string {
  return value.replace(/\D+/g, "");
}

// The phone is deliberately absent: it is matched on digits below, and
// leaving it here too meant a two-digit query hit every number containing
// those digits — which reads as the search being broken.
function haystack(item: StaffCaseListItem): string {
  return [item.profiles?.full_name, item.profiles?.email, item.title, item.case_number, item.id]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function searchCases(
  cases: StaffCaseListItem[],
  query: string
): StaffCaseListItem[] {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return cases;
  }

  const needleDigits = digits(needle);

  return cases.filter((item) => {
    if (haystack(item).includes(needle)) {
      return true;
    }

    // At least four digits before matching on numbers alone: fewer than
    // that matches half the table and reads as the search being broken.
    if (needleDigits.length >= 4) {
      const phone = digits(item.profiles?.phone ?? "");

      // Compared on the tail, not the whole string: a number copied from a
      // messenger often carries a trunk or country prefix the stored one
      // does not — 8-996-702-64-59-77 and 996702645977 are one number.
      const tail = needleDigits.slice(-9);

      return phone.length > 0 && phone.includes(tail);
    }

    return false;
  });
}
