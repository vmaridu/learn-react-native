import { db, delay } from '~/mock/db';
import type { DirectoryEntry, ServiceProvider } from '~/mock/types';

/**
 * The owner directory is opt-in and field-level (FR-DOC-02 / NFR-10). Members
 * who have not opted in are absent, and a member who hides their phone is
 * returned without one — the filtering happens here, not in the UI, because
 * hiding a field in a component is not privacy.
 */
export async function fetchDirectory(): Promise<DirectoryEntry[]> {
  return delay([...db.directory].sort((a, b) => a.name.localeCompare(b.name)));
}

export async function fetchServiceProviders(): Promise<ServiceProvider[]> {
  return delay(
    [...db.serviceProviders].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'resident' ? -1 : 1;
      return b.rating - a.rating;
    }),
  );
}
