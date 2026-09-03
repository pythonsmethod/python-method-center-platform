export type DocumentExtractionSource =
  | {
      bytes: Uint8Array;
      mimeType: string;
    }
  | {
      gcsUri: string;
      mimeType?: string;
    };

export type BatchDocumentExtractionRequest = {
  inputGcsUri: string;
  outputGcsUri: string;
  mimeType?: string;
};

export type ProcessorStatus = {
  name: string;
  displayName: string;
  type: string;
  state: string;
  defaultProcessorVersion?: string;
};

export type NormalizedDetectedLanguage = {
  languageCode: string;
  confidence?: number;
};

export type NormalizedLayoutElement = {
  id: string;
  text: string;
  textAnchor: { start: number; end: number } | null;
  confidence?: number;
  boundingPoly?: unknown;
};

export type NormalizedPage = {
  pageNumber: number;
  detectedLanguages: NormalizedDetectedLanguage[];
  qualityScore?: number;
  qualityDefects: Array<{ type?: string; confidence?: number }>;
  blocks: NormalizedLayoutElement[];
  paragraphs: NormalizedLayoutElement[];
  lines: NormalizedLayoutElement[];
  tokens: NormalizedLayoutElement[];
  tables: unknown[];
};

export type NormalizedDocumentExtraction = {
  text: string;
  pages: NormalizedPage[];
  raw: unknown;
};

export interface DocumentExtractionProvider {
  process_document(source: DocumentExtractionSource): Promise<unknown>;
  batch_process_documents(request: BatchDocumentExtractionRequest): Promise<unknown>;
  get_processor_status(): Promise<ProcessorStatus>;
  normalize_response(response: unknown): NormalizedDocumentExtraction;
}
