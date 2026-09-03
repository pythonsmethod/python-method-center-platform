import type {
  BatchDocumentExtractionRequest,
  DocumentExtractionProvider,
  DocumentExtractionSource,
  NormalizedDocumentExtraction,
  NormalizedLayoutElement,
  ProcessorStatus
} from "@/lib/document-extraction/types";

type GoogleDocumentAIProviderOptions = {
  projectId: string;
  location: string;
  processorId: string;
  accessToken: () => Promise<string>;
  fetchImpl?: typeof fetch;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === "object" ? value as JsonRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textFromLayout(layoutValue: unknown, fullText: string): string {
  const layout = asRecord(layoutValue);
  const textAnchor = asRecord(layout.textAnchor);
  return asArray(textAnchor.textSegments).map((segmentValue) => {
    const segment = asRecord(segmentValue);
    const start = Number(segment.startIndex ?? 0);
    const end = Number(segment.endIndex ?? start);
    return fullText.slice(start, end);
  }).join("");
}

function normalizedTextAnchor(layoutValue: unknown): { start: number; end: number } | null {
  const segments = asArray(asRecord(layoutValue).textAnchor && asRecord(asRecord(layoutValue).textAnchor).textSegments);
  if (segments.length !== 1) return null;
  const segment = asRecord(segments[0]);
  const start = Number(segment.startIndex ?? 0), end = Number(segment.endIndex ?? start);
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && end >= start ? { start, end } : null;
}

function normalizeLayoutElements(values: unknown, fullText: string, prefix: string): NormalizedLayoutElement[] {
  return asArray(values).map((value, index) => {
    const layout = asRecord(asRecord(value).layout);
    return {
      id: `${prefix}-${index}`,
      text: textFromLayout(layout, fullText),
      textAnchor: normalizedTextAnchor(layout),
      ...(typeof layout.confidence === "number" ? { confidence: layout.confidence } : {}),
      ...(layout.boundingPoly ? { boundingPoly: layout.boundingPoly } : {})
    };
  });
}

export class GoogleDocumentAIProvider implements DocumentExtractionProvider {
  private readonly projectId: string;
  private readonly location: string;
  private readonly processorId: string;
  private readonly accessToken: () => Promise<string>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GoogleDocumentAIProviderOptions) {
    this.projectId = options.projectId;
    this.location = options.location;
    this.processorId = options.processorId;
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private get processorName(): string {
    return `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;
  }

  private get apiBase(): string {
    return `https://${this.location}-documentai.googleapis.com/v1/${this.processorName}`;
  }

  private async request(url: string, init?: RequestInit): Promise<unknown> {
    const token = await this.accessToken();
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers
      }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Google Document AI request failed (${response.status})`);
    }
    return payload;
  }

  async process_document(source: DocumentExtractionSource): Promise<unknown> {
    const body = "bytes" in source
      ? {
          rawDocument: {
            content: Buffer.from(source.bytes).toString("base64"),
            mimeType: source.mimeType
          },
          processOptions: { ocrConfig: { enableImageQualityScores: true } }
        }
      : {
          gcsDocument: {
            gcsUri: source.gcsUri,
            ...(source.mimeType ? { mimeType: source.mimeType } : {})
          },
          processOptions: { ocrConfig: { enableImageQualityScores: true } }
        };
    return this.request(`${this.apiBase}:process`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async batch_process_documents(request: BatchDocumentExtractionRequest): Promise<unknown> {
    return this.request(`${this.apiBase}:batchProcess`, {
      method: "POST",
      body: JSON.stringify({
        inputDocuments: {
          gcsDocuments: {
            documents: [{
              gcsUri: request.inputGcsUri,
              mimeType: request.mimeType ?? "application/pdf"
            }]
          }
        },
        documentOutputConfig: {
          gcsOutputConfig: { gcsUri: request.outputGcsUri }
        },
        processOptions: { ocrConfig: { enableImageQualityScores: true } }
      })
    });
  }

  async get_processor_status(): Promise<ProcessorStatus> {
    const value = asRecord(await this.request(this.apiBase));
    return {
      name: String(value.name ?? this.processorName),
      displayName: String(value.displayName ?? ""),
      type: String(value.type ?? ""),
      state: String(value.state ?? ""),
      ...(typeof value.defaultProcessorVersion === "string"
        ? { defaultProcessorVersion: value.defaultProcessorVersion }
        : {})
    };
  }

  normalize_response(response: unknown): NormalizedDocumentExtraction {
    const responseRecord = asRecord(response);
    const document = asRecord(responseRecord.document ?? responseRecord);
    const text = String(document.text ?? "");
    const pages = asArray(document.pages).map((pageValue, index) => {
      const page = asRecord(pageValue);
      const quality = asRecord(page.imageQualityScores);
      return {
        pageNumber: Number(page.pageNumber ?? index + 1),
        detectedLanguages: asArray(page.detectedLanguages).map((languageValue) => {
          const language = asRecord(languageValue);
          return {
            languageCode: String(language.languageCode ?? "und"),
            ...(typeof language.confidence === "number"
              ? { confidence: language.confidence }
              : {})
          };
        }),
        ...(typeof quality.qualityScore === "number" ? { qualityScore: quality.qualityScore } : {}),
        qualityDefects: asArray(quality.detectedDefects).map((defectValue) => {
          const defect = asRecord(defectValue);
          return {
            ...(typeof defect.type === "string" ? { type: defect.type } : {}),
            ...(typeof defect.confidence === "number" ? { confidence: defect.confidence } : {})
          };
        }),
        blocks: normalizeLayoutElements(page.blocks, text, `p${index + 1}-block`),
        paragraphs: normalizeLayoutElements(page.paragraphs, text, `p${index + 1}-paragraph`),
        lines: normalizeLayoutElements(page.lines, text, `p${index + 1}-line`),
        tokens: normalizeLayoutElements(page.tokens, text, `p${index + 1}-token`),
        tables: asArray(page.tables)
      };
    });
    return { text, pages, raw: response };
  }
}
