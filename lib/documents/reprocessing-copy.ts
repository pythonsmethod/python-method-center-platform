export function getReprocessingCopy(locale: "ru" | "en") {
  return locale === "ru"
    ? {
        label: "Повторная обработка",
        title: "Перечитать документы",
        description:
          "Система заново выполнит две независимые вычитки каждого активного файла. Исходные документы не изменятся.",
        button: "Перечитать все документы",
        resumeButton: (count: number) => `Продолжить очередь (${count})`,
        resumeDescription:
          "В этом кейсе уже есть документы в очереди. Продолжение не перечитывает готовые файлы повторно.",
        pending: "Ставлю документы в очередь…",
        confirm:
          "Повторно обработать все активные документы этого кейса? Это запустит новые ИИ-вычитки.",
        confirmButton: "Да, перечитать документы",
        cancel: "Отмена",
        queued: (count: number) => `В очередь поставлено документов: ${count}.`,
        processing: (done: number, total: number) =>
          `Обработано в этом запуске: ${done} из ${total}.`,
        complete: (done: number) => `Повторная обработка завершена: ${done}.`,
        pendingReview: (done: number, total: number) =>
          `Готово ${done} из ${total}. Остальные файлы ещё в очереди или ожидают повтора. Проверьте статусы ниже и продолжите очередь.`,
        failed: "Один из файлов требует внимания или обработка прервалась. Проверьте статусы файлов перед повторным запуском."
      }
    : {
        label: "Reprocessing",
        title: "Read documents again",
        description:
          "The system will run two new independent readings of every active file. Source documents will not be changed.",
        button: "Reprocess all documents",
        resumeButton: (count: number) => `Continue queue (${count})`,
        resumeDescription:
          "This case already has queued documents. Continuing does not reprocess completed files.",
        pending: "Adding documents to the queue…",
        confirm:
          "Reprocess every active document in this case? This will start new AI readings.",
        confirmButton: "Yes, reprocess documents",
        cancel: "Cancel",
        queued: (count: number) => `${count} documents were added to the queue.`,
        processing: (done: number, total: number) =>
          `Processed in this run: ${done} of ${total}.`,
        complete: (done: number) => `Reprocessing completed: ${done}.`,
        pendingReview: (done: number, total: number) =>
          `${done} of ${total} ready. The remaining files are queued or awaiting a retry. Check their status below and continue the queue.`,
        failed: "A file needs attention or processing stopped. Check the document statuses before trying again."
      };
}
