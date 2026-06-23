export type UploadedDocumentMetadata = {
  storage_bucket?: string;
  mime_type?: string;
  file_size?: number;
  uploaded_via?: string;
  storage_path_version?: string;
  [key: string]: unknown;
};

export type DocumentIntakeStatus =
  | "uploaded"
  | "queued"
  | "ready"
  | "archived";

export type UploadedDocument = {
  id: string;
  profile_id: string;
  case_id: string;
  document_type: string;
  status: string;
  document_status: DocumentIntakeStatus;
  storage_path: string;
  original_filename: string | null;
  metadata: UploadedDocumentMetadata;
  created_at: string;
};

export type DocumentUploadActionState =
  | {
      status: "success";
      document: UploadedDocument;
    }
  | {
      status: "error";
      message: string;
    };
