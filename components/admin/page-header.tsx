export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--tx-1)]" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-[var(--tx-3)]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}