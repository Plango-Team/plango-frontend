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
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';

const initialState: EventsState = {
  events: [],
  isLoading: false,
  error: null,
  joiningEventId: null,
  leavingEventId: null,
  scheduledEventIds: [],
  eventAppointmentIds: {},
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
    attendeeCount: computed(() =>
      events().reduce((total, event) => total + event.attendeesCount, 0),
    ),
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
    const language = inject(LanguageService);
    const apiErrors = inject(ApiErrorService);
    const t = (ar: string, en: string) => language.text(ar, en);

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
          error: (error) => {
            patchState(store, {
              isLoading: false,
              error: apiErrors.message(
                error,
                'تعذر تحميل الفعاليات. حاول مرة أخرى.',
                'Could not load events. Please try again.',
              ),
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
          toast.info(t('هذه الفعالية موجودة بالفعل في جدولك.', 'This event is already in your schedule.'));
          return false;
        }
        if (event && new Date(event.startDate).getTime() <= Date.now()) {
          toast.error(
            t('لا يمكن إضافة فعالية بدأت بالفعل', 'An event that already started cannot be added'),
            t(
              'المواعيد لا تقبل وقت وصول في الماضي. اختر فعالية قادمة.',
              'Appointments cannot use a past arrival time. Choose an upcoming event.',
            ),
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
            eventAppointmentIds: {
              ...store.eventAppointmentIds(),
              [eventId]: appointment._id,
            },
            events: store.events().map((item) =>
              item._id === eventId
                ? { ...item, attendeesCount: item.attendeesCount + 1 }
                : item,
            ),
          });
          toast.success(
            t('تمت إضافة الفعالية إلى جدولك', 'Event added to your schedule'),
            t('ستظهر الآن ضمن مواعيدك القادمة.', 'It now appears in your upcoming appointments.'),
          );
          return true;
        } catch (error: any) {
          patchState(store, { joiningEventId: null });
          const normalized = apiErrors.normalize(error);
          const code = normalized.code;
          const message =
            code === 'DUPLICATE_FIELD'
              ? t('يوجد موعد آخر في نفس وقت هذه الفعالية.', 'Another appointment exists at this event time.')
              : code === 'INTERNAL_ERROR'
                ? t(
                    'تعذر إنشاء الموعد من الخادم. تحقق أن الفعالية قادمة وأن الموقع صالح.',
                    'The server could not create the appointment. Check that the event is upcoming and its location is valid.',
                  )
                : normalized.message;
          toast.error(
            t('تعذر إضافة الفعالية', 'Could not add event'),
            message ||
              t(
                'تحقق من نقطة الانطلاق وطريقة التنقل ثم حاول مرة أخرى.',
                'Check the starting point and transport mode, then try again.',
              ),
          );
          return false;
        }
      },

      async removeFromSchedule(eventId: string): Promise<boolean> {
        if (store.leavingEventId()) return false;
        const appointmentId = store.eventAppointmentIds()[eventId];
        if (!appointmentId) {
          toast.error(
            t(
              'تعذر العثور على الموعد المرتبط بهذه الفعالية.',
              'Could not find the appointment linked to this event.',
            ),
          );
          return false;
        }

        patchState(store, { leavingEventId: eventId, error: null });
        const removed = await appointmentsStore.removeAppointmentNow(appointmentId);
        if (!removed) {
          patchState(store, { leavingEventId: null });
          toast.error(
            t('تعذر إلغاء الحضور', 'Could not cancel attendance'),
            t('حاول مرة أخرى من صفحة المواعيد.', 'Try again from the appointments page.'),
          );
          return false;
        }

        const eventAppointmentIds = { ...store.eventAppointmentIds() };
        delete eventAppointmentIds[eventId];
        patchState(store, {
          leavingEventId: null,
          scheduledEventIds: store.scheduledEventIds().filter((id) => id !== eventId),
          eventAppointmentIds,
          events: store.events().map((item) =>
            item._id === eventId
              ? { ...item, attendeesCount: Math.max(0, item.attendeesCount - 1) }
              : item,
          ),
        });
        toast.info(
          t(
            'تم إلغاء حضور الفعالية وإزالتها من جدولك.',
            'Event attendance was canceled and removed from your schedule.',
          ),
        );
        return true;
      },
    };
  }),

  withHooks((store) => {
    const appointmentsStore = inject(AppointmentsStore);

    return {
      onInit() {
        store.loadEvents();
        effect(() => {
          const eventAppointmentIds = appointmentsStore
            .appointments()
            .reduce<Record<string, string>>((result, appointment) => {
              if (typeof appointment.eventId === 'string' && appointment.eventId) {
                result[appointment.eventId] = appointment._id;
              }
              return result;
            }, {});
          patchState(store, {
            scheduledEventIds: Object.keys(eventAppointmentIds),
            eventAppointmentIds,
          });
        });
      },
    };
  }),
);
