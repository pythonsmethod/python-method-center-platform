const dateTimeFormatter = new Intl.DateTimeFormat("ru", {
  dateStyle: "medium",
  timeStyle: "short"
});

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
