"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
}

export function ExportButton({
  onClick,
  isLoading,
  label = "Exportar CSV",
}: ExportButtonProps) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={isLoading}>
      <Download className="mr-2 h-4 w-4" />
      {isLoading ? "Exportando..." : label}
    </Button>
  );
}
