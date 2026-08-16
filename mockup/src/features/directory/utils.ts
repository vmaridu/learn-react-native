import type { DirectoryEntry, ServiceProvider } from './types';

export function searchDirectory(entries: DirectoryEntry[], query: string): DirectoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(q) ||
      entry.unit.toLowerCase().includes(q) ||
      entry.interests.some((interest) => interest.toLowerCase().includes(q)),
  );
}

export function filterProviders(
  providers: ServiceProvider[],
  category: string,
  query: string,
): ServiceProvider[] {
  const q = query.trim().toLowerCase();
  return providers.filter((provider) => {
    if (category !== 'all' && provider.category !== category) return false;
    if (!q) return true;
    return (
      provider.name.toLowerCase().includes(q) ||
      provider.blurb.toLowerCase().includes(q) ||
      provider.category.toLowerCase().includes(q)
    );
  });
}
