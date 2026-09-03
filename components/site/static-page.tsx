export function StaticPage({
  eyebrow,
  title,
  intro,
  children,
  proseClass = "text-[var(--tx-2)] leading-relaxed",
}: {
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  proseClass?: string;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-3">{eyebrow}</p>
        <h1
          className="text-3xl sm:text-4xl font-semibold leading-tight text-[var(--tx-1)] mb-5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        {intro ? <p className="text-lg text-[var(--tx-2)] leading-relaxed max-w-2xl">{intro}</p> : null}
      </header>

      <div className={`space-y-6 text-base ${proseClass}`}>
        {children}
      </div>
    </div>
  );
}
