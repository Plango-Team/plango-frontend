import { computed, effect, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import {
  AddEventToScheduleInput,
  EventCategory,
  EventPriceFilter,
  EventsState,
} from './interfaces/Ievents';
import { EventService } from './services/event.service';
import { AppointmentsStore } from '../appointments/appointments.store';

const initialState: EventsState = {
  events: [],
  isLoading: false,
  error: null,
  joiningEventId: null,
  scheduledEventIds: [],
  filters: {
    selectedCategory: 'all',
    selectedPrice: 'all',
  },
};

export const EventsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ events, filters }) => ({
    filteredEvents: computed(() => {
      const currentFilters = filters();
      return events().filter((event) => {
        const categoryMatches =
          currentFilters.selectedCategory === 'all' ||
          event.category === currentFilters.selectedCategory;
        const price = event.price ?? 0;
        const priceMatches =
          currentFilters.selectedPrice === 'all' ||
          (currentFilters.selectedPrice === 'free' ? price === 0 : price > 0);
        return categoryMatches && priceMatches;
      });
    }),
    totalCount: computed(() => events().length),
    upcomingCount: computed(
      () => events().filter((event) => new Date(event.startDate).getTime() > Date.now()).length,
    ),
    ongoingCount: computed(
      () =>
        events().filter((event) => {
          const now = Date.now();
          return (
            new Date(event.startDate).getTime() <= now &&
            new Date(event.endDate).getTime() >= now
          );
        }).length,
    ),
  })),

  withMethods((store) => {
    const eventService = inject(EventService);
    const appointmentsStore = inject(AppointmentsStore);
    const toast = inject(ToastService);

    return {
      loadEvents() {
        if (store.isLoading()) return;
        patchState(store, { isLoading: true, error: null });
        eventService.getEvents().subscribe({
          next: (events) => {
            patchState(store, {
              events: [...events].sort(
                (a, b) =>
                  new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
              ),
              isLoading: false,
            });
          },
          error: () => {
            patchState(store, {
              isLoading: false,
              error: 'تعذر تحميل الفعاليات. حاول مرة أخرى.',
            });
          },
        });
      },

      updateCategory(category: 'all' | EventCategory) {
        patchState(store, {
          filters: { ...store.filters(), selectedCategory: category },
        });
      },

      updatePriceFilter(price: EventPriceFilter) {
        patchState(store, {
          filters: { ...store.filters(), selectedPrice: price },
        });
      },

      async addToSchedule(eventId: string, input: AddEventToScheduleInput): Promise<boolean> {
        if (store.joiningEventId()) return false;
        const event = store.events().find((item) => item._id === eventId);
        if (store.scheduledEventIds().includes(eventId)) {
          toast.info('هذه الفعالية موجودة بالفعل في جدولك.');
          return false;
        }
        if (event && new Date(event.startDate).getTime() <= Date.now()) {
          toast.error(
            'لا يمكن إضافة فعالية بدأت بالفعل',
            'المواعيد لا تقبل وقت وصول في الماضي. اختر فعالية قادمة.',
          );
          return false;
        }

        patchState(store, { joiningEventId: eventId, error: null });

        try {
          const appointment = await firstValueFrom(eventService.addToSchedule(eventId, input));
          appointmentsStore.upsertAppointment(appointment);
          patchState(store, {
            joiningEventId: null,
            scheduledEventIds: [...new Set([...store.scheduledEventIds(), eventId])],
          });
          toast.success('تمت إضافة الفعالية إلى جدولك', 'ستظهر الآن ضمن مواعيدك القادمة.');
          return true;
        } catch (error: any) {
          patchState(store, { joiningEventId: null });
          const code = error?.error?.code;
          const message =
            code === 'DUPLICATE_FIELD'
              ? 'يوجد موعد آخر في نفس وقت هذه الفعالية.'
              : code === 'INTERNAL_ERROR'
                ? 'تعذر إنشاء الموعد من الخادم. تحقق أن الفعالية قادمة وأن الموقع صالح.'
                : error?.error?.message;
          toast.error(
            'تعذر إضافة الفعالية',
            message || 'تحقق من نقطة الانطلاق وطريقة التنقل ثم حاول مرة أخرى.',
          );
          return false;
        }
      },
    };
  }),

  withHooks((store) => {
    const appointmentsStore = inject(AppointmentsStore);

    return {
      onInit() {
        store.loadEvents();
        effect(() => {
          const eventIds = appointmentsStore
            .appointments()
            .map((appointment) => appointment.eventId)
            .filter((eventId): eventId is string => typeof eventId === 'string' && !!eventId);
          patchState(store, { scheduledEventIds: [...new Set(eventIds)] });
        });
      },
    };
  }),
);
