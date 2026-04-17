"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  File,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { DataTable, type Column } from "@/presentation/components/shared/data-table";
import { ConfirmDialog } from "@/presentation/components/shared/confirm-dialog";
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
} from "@/infrastructure/query/hooks/use-documents";
import type { LegalDocument, DocumentStatus } from "@/domain/entities/legal-document";

const statusConfig: Record<
  DocumentStatus,
  { label: string; icon: typeof CheckCircle; color: string; dotColor: string }
> = {
  PENDING: { label: "Pendiente", icon: Clock, color: "text-yellow-400", dotColor: "bg-yellow-400" },
  PROCESSING: { label: "Procesando", icon: Loader2, color: "text-blue-400", dotColor: "bg-blue-400" },
  COMPLETED: { label: "Completado", icon: CheckCircle, color: "text-emerald-400", dotColor: "bg-emerald-400" },
  FAILED: { label: "Error", icon: XCircle, color: "text-red-400", dotColor: "bg-red-400" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const fileTypeIcons: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
};

export default function DocumentsPage() {
  const [page, setPage] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useDocuments(page);
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();

  const handleUpload = () => {
    if (!uploadFile || !uploadTitle.trim()) return;

    uploadDoc.mutate(
      { file: uploadFile, title: uploadTitle },
      {
        onSuccess: () => {
          toast.success("Documento subido. Procesamiento iniciado.");
          setShowUpload(false);
          setUploadTitle("");
          setUploadFile(null);
        },
        onError: () => {
          toast.error("Error al subir el documento");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDoc.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Documento eliminado");
        setDeleteId(null);
      },
    });
  };

  const columns: Column<LegalDocument>[] = [
    {
      key: "title",
      header: "Documento",
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(43,94,167,0.15)] bg-[rgba(43,94,167,0.08)]">
            <span className="text-[9px] font-bold uppercase text-[#3b82f6]">
              {fileTypeIcons[doc.fileType] || "?"}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-[#e2e8f0]">{doc.title}</p>
            <p className="text-xs text-[#475569]">
              {doc.fileName} - {formatFileSize(doc.fileSize)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (doc) => {
        const config = statusConfig[doc.status];
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
            <Icon className={`h-3.5 w-3.5 ${doc.status === "PROCESSING" ? "animate-spin" : ""}`} />
            {config.label}
          </span>
        );
      },
    },
    {
      key: "chunks",
      header: "Chunks",
      render: (doc) => (
        <span className="text-sm font-mono text-[#94a3b8]">
          {doc.status === "COMPLETED" ? doc.totalChunks : "-"}
        </span>
      ),
    },
    {
      key: "uploadedBy",
      header: "Subido por",
      render: (doc) => (
        <span className="text-xs text-[#64748b]">{doc.uploadedByEmail}</span>
      ),
    },
    {
      key: "date",
      header: "Fecha",
      render: (doc) => (
        <span className="text-xs text-[#64748b]">
          {new Date(doc.createdAt).toLocaleDateString("es-EC")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (doc) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteId(doc.id)}
          className="text-[#64748b] hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos Legales"
        description="Sube documentos de leyes para alimentar la IA con contexto legal"
        actions={
          <Button
            onClick={() => setShowUpload(true)}
            className="border border-[#2b5ea7]/30 bg-[#1a3a5c] text-white hover:bg-[#2b5ea7]"
          >
            <Upload className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        }
      />

      {/* Info banner */}
      <div className="animate-fade-up rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[rgba(43,94,167,0.05)] p-4">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#3b82f6]" />
          <div>
            <p className="text-sm font-medium text-[#e2e8f0]">
              Sistema RAG (Retrieval-Augmented Generation)
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              Los documentos subidos se procesan automaticamente: se extrae el texto, se divide en
              fragmentos y se generan embeddings. Cuando un usuario hace una consulta legal, la IA
              busca los fragmentos mas relevantes y los usa como contexto para dar respuestas
              fundamentadas en la legislacion real.
            </p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        emptyMessage="No hay documentos. Sube tu primer documento legal."
      />

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="border-[rgba(43,94,167,0.15)] bg-[#0f1d32] text-[#e2e8f0]">
          <DialogHeader>
            <DialogTitle>Subir Documento Legal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#475569]">
                Titulo del documento
              </label>
              <Input
                placeholder="Ej: Codigo Civil del Ecuador"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="border-[rgba(43,94,167,0.15)] bg-[#091220] text-[#e2e8f0] placeholder:text-[#334155]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#475569]">
                Archivo (PDF, DOCX o TXT)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[rgba(43,94,167,0.2)] bg-[rgba(43,94,167,0.03)] p-8 transition-colors hover:border-[#2b5ea7]/40 hover:bg-[rgba(43,94,167,0.06)]"
              >
                {uploadFile ? (
                  <div className="flex items-center gap-3">
                    <File className="h-8 w-8 text-[#3b82f6]" />
                    <div>
                      <p className="text-sm font-medium text-[#e2e8f0]">
                        {uploadFile.name}
                      </p>
                      <p className="text-xs text-[#64748b]">
                        {formatFileSize(uploadFile.size)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto mb-2 h-8 w-8 text-[#475569]" />
                    <p className="text-sm text-[#64748b]">
                      Click para seleccionar archivo
                    </p>
                    <p className="mt-1 text-xs text-[#334155]">
                      PDF, DOCX o TXT - Hasta 100MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpload(false)}
              className="border-[rgba(43,94,167,0.15)] bg-transparent text-[#94a3b8]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || !uploadTitle.trim() || uploadDoc.isPending}
              className="border border-[#2b5ea7]/30 bg-[#1a3a5c] text-white hover:bg-[#2b5ea7]"
            >
              {uploadDoc.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Subir y Procesar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Eliminar documento"
        description="Se eliminaran el documento y todos sus chunks. La IA dejara de usar este documento como contexto."
        onConfirm={handleDelete}
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={deleteDoc.isPending}
      />
    </div>
  );
}
