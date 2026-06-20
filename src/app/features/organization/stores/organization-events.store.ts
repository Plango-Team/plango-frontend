import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../shared/services/toast.service';
import {
  CreateOrganizationEventInput,
  OrganizationEvent,
  OrganizationEventsService,
  UpdateOrganizationEventInput,
} from '../services/organization-events.service';

type OrganizationEventsState = {
  events: OrganizationEvent[];
  loaded: boolean;
  loading: boolean;
  saving: boolean;
  activeEventId: string | null;
  error: string | null;
};

const initialState: OrganizationEventsState = {
  events: [],
  loaded: false,
  loading: false,
  saving: false,
  activeEventId: null,
  error: null,
};

const sortEvents = (events: OrganizationEvent[]) =>
  [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

export const OrganizationEventsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const service = inject(OrganizationEventsService);
    const toast = inject(ToastService);

    return {
      loadAll() {
        if (store.loading()) return;
        patchState(store, { loading: true, error: null });
        service.getEvents().subscribe({
          next: (events) => {
            patchState(store, {
              events: sortEvents(events),
              loaded: true,
              loading: false,
            });
          },
          error: () => {
            patchState(store, {
              loaded: true,
              loading: false,
              error: 'تعذر تحميل فعاليات المؤسسة.',
            });
          },
        });
      },

      eventsForOwner(ownerId: string): OrganizationEvent[] {
        return store.events().filter((event) => {
          const companyId =
            typeof event.companyId === 'string' ? event.companyId : event.companyId._id;
          return !companyId || companyId === ownerId;
        });
      },

      async createEvent(event: CreateOrganizationEventInput): Promise<boolean> {
        if (store.saving()) return false;
        patchState(store, { saving: true, error: null });
        try {
          const created = await firstValueFrom(service.createEvent(event));
          const normalizedCreated = {
            ...created,
            visibility: created.visibility ?? event.visibility,
            attendeesCount: created.attendeesCount ?? 0,
          };
          patchState(store, {
            events: sortEvents([normalizedCreated, ...store.events()]),
            saving: false,
          });
          toast.success(
            'تم نشر الفعالية',
            normalizedCreated.visibility === 'private'
              ? 'ستظهر لمتابعي المؤسسة المقبولين.'
              : 'أصبحت متاحة الآن لمستخدمي PlanGo.',
          );
          return true;
        } catch {
          patchState(store, { saving: false, error: 'تعذر إنشاء الفعالية الجديدة.' });
          toast.error('تعذر إنشاء الفعالية');
          return false;
        }
      },

      async updateEvent(
        id: string,
        changes: UpdateOrganizationEventInput,
      ): Promise<boolean> {
        if (store.saving()) return false;
        patchState(store, { saving: true, activeEventId: id, error: null });
        try {
          const updated = await firstValueFrom(service.updateEvent(id, changes));
          const current = store.events().find((event) => event._id === id);
          const normalizedUpdated = {
            ...updated,
            visibility: updated.visibility ?? changes.visibility ?? current?.visibility ?? 'public',
            attendeesCount: updated.attendeesCount ?? current?.attendeesCount ?? 0,
          };
          patchState(store, {
            events: sortEvents(
              store.events().map((event) => (event._id === id ? normalizedUpdated : event)),
            ),
            saving: false,
            activeEventId: null,
          });
          toast.success('تم تحديث الفعالية');
          return true;
        } catch {
          patchState(store, {
            saving: false,
            activeEventId: null,
            error: 'تعذر تحديث الفعالية.',
          });
          toast.error('تعذر تحديث الفعالية');
          return false;
        }
      },

      async deleteEvent(id: string): Promise<boolean> {
        if (store.activeEventId()) return false;
        patchState(store, { activeEventId: id, error: null });
        try {
          await firstValueFrom(service.deleteEvent(id));
          patchState(store, {
            events: store.events().filter((event) => event._id !== id),
            activeEventId: null,
          });
          toast.info('تم حذف الفعالية');
          return true;
        } catch {
          patchState(store, {
            activeEventId: null,
            error: 'تعذر حذف الفعالية.',
          });
          toast.error('تعذر حذف الفعالية');
          return false;
        }
      },

      async toggleEventStatus(id: string): Promise<boolean> {
        if (store.activeEventId()) return false;
        patchState(store, { activeEventId: id, error: null });
        try {
          const updated = await firstValueFrom(service.toggleEventStatus(id));
          patchState(store, {
            events: store.events().map((event) => (event._id === id ? updated : event)),
            activeEventId: null,
          });
          toast.success(updated.isActive ? 'تم تفعيل الفعالية' : 'تم إيقاف الفعالية');
          return true;
        } catch {
          patchState(store, {
            activeEventId: null,
            error: 'تعذر تغيير حالة الفعالية.',
          });
          toast.error('تعذر تغيير حالة الفعالية');
          return false;
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadAll();
    },
  }),
);
