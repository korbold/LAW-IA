"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/presentation/components/shared/page-header";
import { useChatSessionDetail } from "@/infrastructure/query/hooks/use-chat-sessions";
import { cn } from "@/lib/utils";

export default function ChatSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useChatSessionDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { session, messages } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalle de Conversación"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <dl className="grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Usuario
              </dt>
              <dd className="mt-1 text-sm">{session.userDisplayName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Email
              </dt>
              <dd className="mt-1 text-sm">{session.userEmail}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Inicio
              </dt>
              <dd className="mt-1 text-sm">
                {new Date(session.createdAt).toLocaleString("es-EC")}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Mensajes
              </dt>
              <dd className="mt-1 text-sm">{session.messageCount}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3",
                  msg.role === "USER" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "ASSISTANT" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2",
                    msg.role === "USER"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      msg.role === "USER"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("es-EC")}
                  </p>
                </div>
                {msg.role === "USER" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
