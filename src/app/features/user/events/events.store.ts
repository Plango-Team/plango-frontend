import { signalStore, withState, withComputed, withMethods, patchState, withHooks } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { EventsState, IEvent } from './interfaces/Ievents';
import { EventService } from './services/event.service';

const initialState: EventsState = {
  events: null,
  isLoading: false,
  error: null,
  filters: {
    selectedCategory: 'الكل',
    selectedPrice: 'كل الأسعار',
  },
  counters: {
    totalEvents: 0,
    interestedTotal: 0,
    goingTotal: 0,
  }
};

export const EventsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ events, filters }) => ({
    // فلترة بناء على التصنيف والسعر
    filteredEvents: computed(() => {
      const { selectedCategory, selectedPrice } = filters();
        return events().filter(event => {
        const matchesCategory = selectedCategory === 'الكل' || event.category === selectedCategory;
        const matchesPrice = selectedPrice === 'كل الأسعار' || event.priceType === selectedPrice;
        return matchesCategory && matchesPrice;
      });
    }),
    
    totalCount: computed(() => events().length),
    interestedCount: computed(() => events().filter(ev => ev.isInterested).length),
    goingCount: computed(() => events().filter(ev => ev.isGoing).length),
  })),

  withMethods((store , eventService = inject(EventService)) => ({

    loadEvents() {
    patchState(store, { isLoading: true });
    eventService.getEvents().subscribe(data => {
      const sortedEvents = [...data].sort((a,b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })
      patchState(store, { events: sortedEvents, isLoading: false });
    });
    },

    updateCategory(category: string): void {
      patchState(store, {
        filters: { ...store.filters(), selectedCategory: category }
      });
    },

    updatePriceFilter(price: string): void {
      patchState(store, {
        filters: { ...store.filters(), selectedPrice: price }
      });
    },

    toggleInterest(eventId: number): void {
      patchState(store, (state) => ({
        events: state.events.map(event => 
          event.id === eventId 
            ? { ...event, isInterested: !event.isInterested } 
            : event
        )
      }));
    },

   toggleGoing(eventId: number): void {
    patchState(store, (state) => ({
      events: state.events.map((event) =>
        event.id === eventId 
          ? { ...event, isGoing: !event.isGoing } 
          : event
      ),
    }));
   },

  addEvent(newEvent: IEvent): void {
  patchState(store, (state) => ({
    events: [
      ...state.events, 
      {
        ...newEvent,
        id: state.events.length + 1, 
        isGoing: false,              
        isInterested: false
      }
    ]
  }));
  }

  })),

  withHooks({
    onInit(store) {
      store.loadEvents();
    },
  })
);