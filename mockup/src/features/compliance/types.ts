export type {
  ArcRequest,
  ArcStatus,
  ServiceRequest,
  ServiceRequestStatus,
  TimelineEvent,
  Violation,
  ViolationStatus,
} from '~/mock/types';

export const ARC_CATEGORIES = [
  'Structure',
  'Fence or wall',
  'Exterior paint or stain',
  'Roof',
  'Landscaping',
  'Solar',
  'Other',
] as const;

export const REQUEST_CATEGORIES = [
  'Common area maintenance',
  'Landscaping',
  'Lighting',
  'Noise or nuisance',
  'Parking',
  'Pool or amenity',
  'Other',
] as const;
