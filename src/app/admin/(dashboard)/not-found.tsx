import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchXIcon className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This record doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/admin" />}>Back to dashboard</Button>
    </div>
  );
}
