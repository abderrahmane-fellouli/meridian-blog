export function formatDate(
  date: Date | string | null | undefined,
  style: "short" | "long" = "short"
): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: style === "short" ? "short" : "long",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  const out = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return out || "?";
}