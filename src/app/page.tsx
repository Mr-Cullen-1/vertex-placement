import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  ClipboardListIcon,
  LinkIcon,
  LogInIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VertexMark, VertexWordmark } from "@/components/placement/vertex-mark";

const VALUE_PROPS = [
  {
    icon: BarChart3Icon,
    title: "Accurate placement",
    description: "70 questions • 30 minutes • 6 levels",
  },
  {
    icon: LinkIcon,
    title: "Simple and secure",
    description: "Create links, share, track progress",
  },
  {
    icon: UsersIcon,
    title: "Built for educational centers",
    description: "Save time, place students with confidence",
  },
];

const METADATA = [
  { value: "6", label: "Placement levels" },
  { value: "70", label: "Questions" },
  { value: "30 min", label: "Test duration" },
];

// Illustrative UI preview only, matching the real /admin dashboard's
// shape (see src/app/admin/(dashboard)/page.tsx) — deliberately no
// invented counts/deltas presented as real production analytics. Tiles
// carry a label, not a fabricated number; example names/timestamps in
// "recent activity" are mockup content, the same way any product
// screenshot uses sample data (see /docs/PRODUCT_RULES.md's "no
// fabricated data" standard, which the real dashboard also follows).
const PREVIEW_STATS = [
  { label: "Candidates", icon: UsersIcon },
  { label: "Active assignments", icon: LinkIcon },
  { label: "Completed", icon: BarChart3Icon },
  { label: "Tests", icon: ClipboardListIcon },
];

const PREVIEW_ACTIVITY = [
  { initials: "AK", name: "Aziza Karimova", test: "General English Placement", time: "2 hours ago", status: "Completed" as const },
  { initials: "JT", name: "Javlon Tursunov", test: "General English Placement", time: "4 hours ago", status: "In progress" as const },
  { initials: "MY", name: "Malika Yusupova", test: "General English Placement", time: "1 day ago", status: "Completed" as const },
  { initials: "DS", name: "Diyor Sattorov", test: "General English Placement", time: "1 day ago", status: "Completed" as const },
];

/** Marketing/informational landing page for the root route. Vertex
 * Placement has no public self-serve flow — students only ever arrive
 * via a one-time invitation link (see /docs/ROUTES.md), so the only
 * functional action here is "Admin login"; "Learn more" is a real
 * same-page anchor to the dashboard preview, not invented
 * functionality. Visual language (violet accent, restrained gradient
 * glow, card anatomy) follows /docs/DESIGN_SYSTEM.md's "premium SaaS"
 * direction, translating design/DESIGN_REFERENCE.png's DNA rather than
 * copying its content literally. No fabricated trust/analytics claims
 * anywhere on the page (see PREVIEW_STATS above). Product positioning
 * only ever describes what's actually built — fixed, progressively
 * difficult questions, never "adaptive" or "AI". */
export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-180px] left-[-120px] -z-10 h-[480px] w-[560px] rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-100px] right-[-160px] -z-10 h-[420px] w-[520px] rounded-full bg-primary/[0.07] blur-3xl"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-6 sm:py-8">
          <VertexWordmark />
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/login" />}
            className="rounded-full pl-3"
          >
            <LogInIcon className="size-3.5" />
            Admin login
            <ArrowRightIcon className="size-3.5" />
          </Button>
        </header>

        <section className="grid grid-cols-1 items-start gap-12 py-6 lg:grid-cols-2 lg:gap-16 lg:py-10">
          <div className="flex flex-col items-start gap-6 text-left">
            <Badge variant="secondary" className="rounded-full">
              English Placement Testing
            </Badge>

            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
              Know where every
              <br />
              <span className="text-primary">student</span>{" "}
              <span className="font-normal italic">truly</span> stands
            </h1>

            <p className="max-w-md text-base text-muted-foreground">
              Assess English level in 30 minutes with a structured placement test designed
              for educational centers.
            </p>

            <ul className="flex flex-col gap-3.5">
              {VALUE_PROPS.map((item) => (
                <li key={item.title} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                    <item.icon className="size-4.5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/admin/login" />}
                className="rounded-full px-6"
              >
                Admin login
                <ArrowRightIcon />
              </Button>
              <Button size="lg" variant="outline" nativeButton={false} render={<Link href="#preview" />} className="rounded-full px-6">
                Learn more
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only for authorized educational center staff.
            </p>

            <div className="flex items-center gap-6 border-t border-border pt-6">
              {METADATA.map((item) => (
                <div key={item.label} className="flex flex-col gap-0.5">
                  <span className="text-xl font-semibold text-primary">{item.value}</span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div id="preview" className="w-full scroll-mt-8">
            <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-4 shadow-2xl shadow-primary/10 sm:p-5">
              <div className="flex items-start justify-between gap-3 pb-4">
                <div className="flex items-center gap-2.5">
                  <VertexMark className="size-8" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">Admin Dashboard</span>
                    <span className="text-xs text-muted-foreground">
                      Manage tests, candidates and results in one place.
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-1 pr-2.5 pl-1">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    A
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Admin</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {PREVIEW_STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-start gap-2 rounded-xl border border-border bg-background px-3 py-3"
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-primary">
                      <stat.icon className="size-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 rounded-xl border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs font-medium text-muted-foreground">Recent activity</p>
                  <Link
                    href="/admin/login"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View all →
                  </Link>
                </div>
                <ul className="flex flex-col divide-y divide-border">
                  {PREVIEW_ACTIVITY.map((row) => (
                    <li key={row.name} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-primary">
                          {row.initials}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-xs font-medium text-foreground">
                            {row.name}
                          </span>
                          <span className="truncate text-[11px] text-muted-foreground">
                            {row.test}
                          </span>
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="hidden text-[11px] text-muted-foreground sm:inline">
                          {row.time}
                        </span>
                        <Badge variant={row.status === "Completed" ? "success" : "warning"}>
                          {row.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <VertexMark className="size-6" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Vertex Placement</span>
              <span className="text-xs text-muted-foreground">
                Professional English placement testing for educational centers.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
