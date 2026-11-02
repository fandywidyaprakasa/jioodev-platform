import { Skeleton } from "@/shared/ui";

export default function LoadingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
      <Skeleton className="h-8 w-56" />
      <Skeleton lines={3} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
