// Deliberately no dashboard chrome yet — the admin shell (sidebar, nav,
// role-aware navigation) is a Phase 1 concern. This layout exists only to
// establish the route segment.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col bg-background">{children}</div>;
}
