export type DocumentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface LegalDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  totalChunks: number;
  uploadedByEmail: string;
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
}
