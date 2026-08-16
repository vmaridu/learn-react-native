import type { ArcStatus, ServiceRequestStatus, ViolationStatus } from './types';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive';

export const VIOLATION_STATUS: Record<ViolationStatus, { label: string; tone: Tone }> = {
  open: { label: 'Action needed', tone: 'warning' },
  disputed: { label: 'Dispute open', tone: 'primary' },
  resolved: { label: 'Resolved', tone: 'success' },
  escalated: { label: 'Escalated', tone: 'destructive' },
};

export const ARC_STATUS: Record<ArcStatus, { label: string; tone: Tone }> = {
  submitted: { label: 'Submitted', tone: 'neutral' },
  in_review: { label: 'Under review', tone: 'primary' },
  more_info: { label: 'More info needed', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  denied: { label: 'Denied', tone: 'destructive' },
};

export const REQUEST_STATUS: Record<ServiceRequestStatus, { label: string; tone: Tone }> = {
  submitted: { label: 'Submitted', tone: 'neutral' },
  assigned: { label: 'Assigned', tone: 'primary' },
  in_progress: { label: 'In progress', tone: 'warning' },
  closed: { label: 'Closed', tone: 'success' },
};

export const PRIORITY_LABELS = {
  low: 'Low — whenever you get to it',
  normal: 'Normal',
  urgent: 'Urgent — safety or damage risk',
} as const;

/** Days remaining to cure, negative when the date has passed. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

export function cureLabel(isoDate: string): string {
  const days = daysUntil(isoDate);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left to cure';
  return `${days} days left to cure`;
}
