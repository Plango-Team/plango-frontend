export type EventCategory =
  | 'music'
  | 'sports'
  | 'education'
  | 'technology'
  | 'photography'
  | 'art'
  | 'other';

export type EventStatus = 'inactive' | 'expired' | 'upcoming' | 'ongoing';
export type EventPriceFilter = 'all' | 'free' | 'paid';
export type EventVisibility = 'public' | 'private';
export type TransportationMode = 'driving' | 'walking' | 'bicycling' | 'other';

export interface EventLocation {
  addressName?: string;
  fullAddress?: string;
  type: 'Point';
  coordinates: [number, number];
  placeId?: string;
}

export interface EventCompany {
  _id: string;
  name: string;
  username?: string;
  email?: string;
}

export interface IEvent {
  _id: string;
  title: string;
  description: string;
  category: EventCategory;
  companyId: string | EventCompany;
  location: EventLocation;
  startDate: string;
  endDate: string;
  images: string[];
  isActive: boolean;
  price?: number | null;
  visibility: EventVisibility;
  attendeesCount: number;
  distance?: number | null;
  status?: EventStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface IEventFilters {
  category?: EventCategory;
  from?: string;
  to?: string;
  priceType?: Exclude<EventPriceFilter, 'all'>;
  lng?: number;
  lat?: number;
}

export interface AddEventToScheduleInput {
  startLocation: EventLocation;
  transportation: TransportationMode;
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: EventCategory;
  location: EventLocation;
  startDate: string;
  endDate: string;
  price?: number;
  images?: string[];
  visibility: EventVisibility;
}

export interface EventsState {
  events: IEvent[];
  isLoading: boolean;
  error: string | null;
  joiningEventId: string | null;
  leavingEventId: string | null;
  scheduledEventIds: string[];
  eventAppointmentIds: Record<string, string>;
  filters: {
    selectedCategory: 'all' | EventCategory;
    selectedPrice: EventPriceFilter;
  };
}
