"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/infrastructure/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales invalidas");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#050d1a]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 35%, rgba(43, 94, 167, 0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(43,94,167,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(43,94,167,0.4) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] px-6 animate-fade-up">
        {/* Logo original */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-2xl bg-white p-6 shadow-lg shadow-black/20">
            <Image
              src="/logo.png"
              alt="CGM Law Firm"
              width={240}
              height={72}
              priority
              className="h-auto w-[240px] object-contain"
            />
          </div>
        </div>

        <div className="mx-auto mb-8 h-px w-20 bg-gradient-to-r from-transparent via-[#2b5ea7]/40 to-transparent" />

        {/* Login card */}
        <div className="rounded-2xl border border-[rgba(43,94,167,0.12)] bg-[rgba(15,29,50,0.7)] p-8 backdrop-blur-xl shadow-2xl shadow-black/30">
          <h2 className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-[#64748b]">
            Acceso Administrativo
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#475569]">
                Email
              </label>
              <Input
                type="email"
                placeholder="admin@cgmlawfirm.ec"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-[rgba(43,94,167,0.15)] bg-[#091220] text-[#e2e8f0] placeholder:text-[#334155] focus:border-[#2b5ea7] focus:ring-[#2b5ea7]/20 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#475569]">
                Contrasena
              </label>
              <Input
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 rounded-xl border-[rgba(43,94,167,0.15)] bg-[#091220] text-[#e2e8f0] placeholder:text-[#334155] focus:border-[#2b5ea7] focus:ring-[#2b5ea7]/20 transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl border border-[#2b5ea7]/30 bg-[#1a3a5c] text-sm font-semibold tracking-wide text-white shadow-lg shadow-[#1a3a5c]/20 transition-all duration-300 hover:bg-[#2b5ea7] hover:shadow-[#2b5ea7]/25"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesion
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-wide text-[#334155]">
          Tu respaldo legal en cada paso
        </p>
      </div>
    </div>
  );
}
