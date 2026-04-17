"use client";

import { useRouter } from "next/navigation";
import { LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/infrastructure/supabase/client";

export function TopBar() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-[rgba(43,94,167,0.08)] bg-[#0a1628]/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-[11px] font-medium text-[#475569]">Sistema operativo</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-[rgba(43,94,167,0.08)] cursor-pointer outline-none">
          <Avatar className="h-7 w-7 border border-[rgba(43,94,167,0.2)]">
            <AvatarFallback className="bg-[#1a3a5c] text-[10px] font-bold text-white">
              CG
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-3 w-3 text-[#475569]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
