export default function ArticleLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="h-4 w-48 bg-[var(--bg-muted)] rounded mb-8 animate-pulse" />
      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-12">
        <div className="min-w-0">
          <div className="h-5 w-28 bg-[var(--bg-muted)] rounded-full mb-4 animate-pulse" />
          <div className="h-12 w-4/5 bg-[var(--bg-muted)] rounded mb-4 animate-pulse" />
          <div className="h-5 w-full bg-[var(--bg-muted)] rounded mb-6 animate-pulse" />
          <div className="h-5 w-2/3 bg-[var(--bg-muted)] rounded mb-6 animate-pulse" />
          <div className="h-8 w-[21%] bg-[var(--bg-muted)] rounded-2xl mb-10 animate-pulse" />
          <div className="space-y-4">
            <div className="h-4 w-full bg-[var(--bg-muted)] rounded animate-pulse" />
            <div className="h-4 w-full bg-[var(--bg-muted)] rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-[var(--bg-muted)] rounded animate-pulse" />
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="space-y-4 sticky top-20">
            <div className="h-4 w-24 bg-[var(--bg-muted)] rounded animate-pulse" />
            <div className="h-3 w-40 bg-[var(--bg-muted)] rounded animate-pulse" />
            <div className="h-3 w-32 bg-[var(--bg-muted)] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}