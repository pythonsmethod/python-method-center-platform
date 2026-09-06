export function getReprocessingCopy(locale: "ru" | "en") {
  return locale === "ru"
    ? {
        label: "Повторная обработка",
        title: "Перечитать документы",
        description:
          "Система заново выполнит две независимые вычитки каждого активного файла. Исходные документы не изменятся.",
        button: "Перечитать все документы",
        pending: "Ставлю документы в очередь…",
        confirm:
          "Повторно обработать все активные документы этого кейса? Это запустит новые ИИ-вычитки.",
        queued: (count: number) => `В очередь поставлено документов: ${count}.`,
        processing: (done: number, total: number) =>
          `Обработано в этом запуске: ${done} из ${total}.`,
        complete: (done: number) => `Повторная обработка завершена: ${done}.`,
        failed: "Не удалось завершить повторную обработку. Попробуйте ещё раз или проверьте очередь."
      }
    : {
        label: "Reprocessing",
        title: "Read documents again",
        description:
          "The system will run two new independent readings of every active file. Source documents will not be changed.",
        button: "Reprocess all documents",
        pending: "Adding documents to the queue…",
        confirm:
          "Reprocess every active document in this case? This will start new AI readings.",
        queued: (count: number) => `${count} documents were added to the queue.`,
        processing: (done: number, total: number) =>
          `Processed in this run: ${done} of ${total}.`,
        complete: (done: number) => `Reprocessing completed: ${done}.`,
        failed: "Reprocessing could not be completed. Try again or check the queue."
      };
}
