export interface IEvent {
  id?: number;
  title: string;
  organizer: string;
  location: string;
  date: Date | null;
  category: string;
  priceType: 'مدفوع' | 'مجاني' | '';
  imageUrl?: string;
  isFeatured?: boolean; 
  isInterested?: boolean;
  isGoing?: boolean;
}

export interface EventsState {
  events: IEvent[] | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    selectedCategory:string;
    selectedPrice:string;
  };
  counters: {
    totalEvents: number;
    interestedTotal: number;
    goingTotal: number;
  };
}