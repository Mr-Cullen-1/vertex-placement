import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminHomePage() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <Badge variant="secondary">Foundation phase</Badge>
      <h1 className="text-xl font-semibold tracking-tight">
        Signed in as {session?.user?.email}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Role: {session?.user?.role}. The dashboard, test management, and
        analytics views are not built yet.
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      >
        <Button variant="outline" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
