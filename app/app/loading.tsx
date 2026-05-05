export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex h-screen shrink-0 border-r border-border bg-card/95" style={{ width: "280px" }}>
        <div className="flex h-full w-full flex-col p-4 gap-4">
          <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-10 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md px-4 md:px-6 flex items-center">
          <div className="h-4 w-40 rounded bg-muted/40 animate-pulse" />
        </header>
        <main className="p-4 md:p-8 space-y-4">
          <div className="h-8 w-56 rounded bg-muted/40 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl border border-border bg-card/70 animate-pulse" />
            ))}
          </div>
          <div className="h-72 rounded-2xl border border-border bg-card/70 animate-pulse" />
        </main>
      </div>
    </div>
  );
}
