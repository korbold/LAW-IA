import { AdminLayout } from "@/presentation/components/layout/admin-layout";

export const dynamic = "force-dynamic";

export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
