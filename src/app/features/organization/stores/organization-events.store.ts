import { inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import {
  AttendanceStatus,
  CreateOrganizationEventInput,
  OrganizationAttendance,
  OrganizationEvent,
  OrganizationEventsService,
} from '../services/organization-events.service';

type OrganizationEventsState = {
  events: OrganizationEvent[];
  attendances: OrganizationAttendance[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

const initialState: OrganizationEventsState = {
  events: [],
  attendances: [],
  loaded: false,
  loading: false,
  error: null,
};

export const OrganizationEventsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const service = inject(OrganizationEventsService);

    return {
      loadAll() {
        patchState(store, { loading: true, error: null });

        service.loadAll().subscribe({
          next: ({ events, attendances }) => {
            patchState(store, {
              events,
              attendances,
              loaded: true,
              loading: false,
              error: null,
            });
          },
          error: () => {
            patchState(store, {
              loading: false,
              error: 'تعذر تحميل بيانات فعاليات المؤسسة.',
            });
          },
        });
      },

      eventsForOwner(ownerId: string): OrganizationEvent[] {
        return store.events().filter((event) => event.ownerId === ownerId);
      },

      attendancesForEvent(eventId: string): OrganizationAttendance[] {
        return store.attendances().filter((attendance) => attendance.eventId === eventId);
      },

      liveStatus(attendance: OrganizationAttendance): AttendanceStatus {
        if (attendance.status !== 'confirmed') {
          return attendance.status;
        }

        return Date.now() > attendance.departureAt + 5 * 60_000 ? 'at_risk' : 'confirmed';
      },

      createEvent(event: CreateOrganizationEventInput) {
        service.createEvent(event).subscribe({
          next: (created) => {
            patchState(store, { events: [created, ...store.events()] });
          },
          error: () => {
            patchState(store, { error: 'تعذر إنشاء الفعالية الجديدة.' });
          },
        });
      },

      updateAttendanceStatus(attendanceId: string, status: AttendanceStatus) {
        const current = store.attendances().find((attendance) => attendance.id === attendanceId);
        if (!current) return;

        const updated: OrganizationAttendance = {
          ...current,
          status,
          updatedAt: Date.now(),
        };

        patchState(store, {
          attendances: store
            .attendances()
            .map((attendance) => (attendance.id === attendanceId ? updated : attendance)),
        });

        service.updateAttendance(updated).subscribe({
          error: () => {
            patchState(store, {
              attendances: store
                .attendances()
                .map((attendance) => (attendance.id === attendanceId ? current : attendance)),
              error: 'تعذر تحديث حالة الحضور.',
            });
          },
        });
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadAll();
    },
  }),
);
