export function parseEventSearch(value: string | string[] | undefined): string | null {
  if (value === undefined) return "";
  if (typeof value !== "string") return null;

  const query = value.trim();
  if (query.length > 80) return null;

  return query;
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
