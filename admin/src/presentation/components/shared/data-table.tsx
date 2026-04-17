"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  page = 0,
  totalPages = 1,
  onPageChange,
  emptyMessage = "No se encontraron resultados",
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[rgba(43,94,167,0.08)] bg-[#0f1d32] overflow-hidden animate-fade-up" style={{ animationDelay: "200ms" }}>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[rgba(43,94,167,0.06)] hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#475569] h-12"
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-b border-[rgba(43,94,167,0.04)]">
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-5 w-full bg-[#162a48]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="rounded-2xl border border-[rgba(43,94,167,0.08)] bg-[#0f1d32] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[rgba(43,94,167,0.06)] hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`text-[10px] font-semibold uppercase tracking-[0.15em] text-[#475569] h-12 ${col.className || ""}`}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-sm text-[#475569]"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={index}
                  className="border-b border-[rgba(43,94,167,0.04)] transition-colors hover:bg-[rgba(43,94,167,0.03)]"
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={`text-sm text-[#cbd5e1] ${col.className || ""}`}>
                      {col.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-[#475569]">
            Pagina {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="h-8 w-8 border-[rgba(43,94,167,0.1)] bg-transparent text-[#64748b] hover:bg-[rgba(43,94,167,0.06)] hover:text-[#2b5ea7] disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 border-[rgba(43,94,167,0.1)] bg-transparent text-[#64748b] hover:bg-[rgba(43,94,167,0.06)] hover:text-[#2b5ea7] disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
