export function extractItems<T>(data: unknown): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data as T[]
  return ((data as { items?: T[] }).items ?? []) as T[]
}
