"use client";

import { useState, useEffect } from "react";
import { Save, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { ConfirmDialog } from "@/presentation/components/shared/confirm-dialog";
import {
  useSystemPrompt,
  useSystemPromptHistory,
  useUpdateSystemPrompt,
} from "@/infrastructure/query/hooks/use-system-prompt";

export default function PromptsPage() {
  const { data: prompt, isLoading } = useSystemPrompt();
  const { data: history } = useSystemPromptHistory();
  const updatePrompt = useUpdateSystemPrompt();
  const [content, setContent] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (prompt?.content) {
      setContent(prompt.content);
    }
  }, [prompt?.content]);

  const hasChanges = content !== (prompt?.content ?? "");

  const handleSave = () => {
    updatePrompt.mutate(content, {
      onSuccess: () => {
        toast.success("System prompt actualizado exitosamente");
        setShowConfirm(false);
      },
      onError: () => {
        toast.error("Error al actualizar el system prompt");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Prompts"
        description="Editar el system prompt del asistente legal Gemini"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="mr-2 h-4 w-4" />
            Historial
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Prompt Actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={15}
            className="font-mono text-sm"
            placeholder="Ingresa el system prompt..."
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {content.length} caracteres
              {prompt?.updatedByEmail && (
                <span>
                  {" "}
                  | Última edición por {prompt.updatedByEmail} el{" "}
                  {new Date(prompt.createdAt).toLocaleString("es-EC")}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setContent(prompt?.content ?? "")}
                disabled={!hasChanges}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={!hasChanges || updatePrompt.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showHistory && history?.versions && history.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versiones Anteriores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.versions.map((version, i) => (
              <div key={version.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {new Date(version.createdAt).toLocaleString("es-EC")} -{" "}
                    {version.updatedByEmail}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setContent(version.content)}
                  >
                    Restaurar
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-32">
                  {version.content}
                </pre>
                {i < history.versions.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Actualizar System Prompt"
        description="Este cambio afectará inmediatamente las respuestas del asistente legal. Asegúrate de que el prompt sea correcto."
        onConfirm={handleSave}
        confirmLabel="Guardar cambios"
        variant="warning"
        isLoading={updatePrompt.isPending}
      />
    </div>
  );
}
