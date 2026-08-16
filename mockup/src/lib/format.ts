/**
 * Money is always integer cents. Never floats — see CLAUDE.md non-negotiable #10.
 */
export function formatCents(cents: number, opts?: { sign?: boolean }): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const body = `$${(abs / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  if (negative) return `-${body}`;
  return opts?.sign ? `+${body}` : body;
}

/** Compact dollars for headline numbers, e.g. 148250 → "$1,482.50". */
export function formatCentsParts(cents: number): { dollars: string; decimals: string } {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const decimals = String(abs % 100).padStart(2, '0');
  return { dollars: `$${dollars}`, decimals };
}

const DAY = 24 * 60 * 60 * 1000;

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

export function formatDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatWeekday(iso: string): string {
  return fromISODate(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

/** "14:30" → "2:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const hour = h ?? 0;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

export function formatTimeRange(start: string, minutes: number): string {
  const [h, m] = start.split(':').map(Number);
  const endTotal = (h ?? 0) * 60 + (m ?? 0) + minutes;
  const end = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(
    endTotal % 60,
  ).padStart(2, '0')}`;
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours === Math.floor(hours) ? `${hours} hr` : `${hours.toFixed(1)} hr`;
}

/** "3h ago", "2d ago", "Just now" — for inbox rows and timelines. */
export function formatRelative(isoTimestamp: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoTimestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
