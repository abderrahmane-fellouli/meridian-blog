export default function BlogIndexLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <div className="h-3 w-24 bg-[var(--bg-muted)] rounded mb-3 animate-pulse" />
        <div className="h-9 w-64 bg-[var(--bg-muted)] rounded mb-5 animate-pulse" />
        <div className="h-10 max-w-xl bg-[var(--bg-muted)] rounded-lg animate-pulse" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="aspect-[16/9] bg-[var(--bg-muted)] animate-pulse" />
            <div className="p-5 flex flex-col gap-3">
              <div className="h-4 w-20 bg-[var(--bg-muted)] rounded-full animate-pulse" />
              <div className="h-5 w-4/5 bg-[var(--bg-muted)] rounded animate-pulse" />
              <div className="h-4 w-full bg-[var(--bg-muted)] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}