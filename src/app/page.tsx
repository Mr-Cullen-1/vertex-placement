export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Vertex Placement
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Foundation phase. The student and admin experiences are not built
        yet — see /docs in the repository for the current architecture.
      </p>
    </div>
  );
}
