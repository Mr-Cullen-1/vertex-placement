import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium text-foreground">Not found</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This record doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Button nativeButton={false} render={<Link href="/admin" />}>Back to dashboard</Button>
    </div>
  );
}
