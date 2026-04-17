import { Skeleton } from "@/components/ui/skeleton";

export default function ChatSessionDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24" />
      <Skeleton className="h-96" />
    </div>
  );
}
