export type ReviewEditOperation = {
  type: "unchanged" | "removed" | "added";
  text: string;
};

function lines(value: string): string[] {
  return value.replace(/\r\n/g, "\n").split("\n");
}

// Line-level LCS keeps the stored history readable: unchanged paragraphs,
// exact deleted paragraphs, and exact additions in their original order.
// Both complete texts are stored as well, so no information is discarded.
export function diffReviewText(before: string, after: string): {
  operations: ReviewEditOperation[];
  removed: string[];
  added: string[];
} {
  const left = lines(before);
  const right = lines(after);
  const table = Array.from({ length: left.length + 1 }, () =>
    new Uint16Array(right.length + 1)
  );

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = left[i] === right[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const operations: ReviewEditOperation[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      operations.push({ type: "unchanged", text: left[i] }); i += 1; j += 1;
    } else if (j < right.length && (i === left.length || table[i][j + 1] >= table[i + 1][j])) {
      operations.push({ type: "added", text: right[j] }); j += 1;
    } else {
      operations.push({ type: "removed", text: left[i] }); i += 1;
    }
  }

  return {
    operations,
    removed: operations.filter((item) => item.type === "removed").map((item) => item.text),
    added: operations.filter((item) => item.type === "added").map((item) => item.text)
  };
}

