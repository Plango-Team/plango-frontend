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
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';

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
    const language = inject(LanguageService);
    const apiErrors = inject(ApiErrorService);
    const t = (ar: string, en: string) => language.text(ar, en);

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
          error: (error) => {
            patchState(store, {
              loaded: true,
              loading: false,
              error: apiErrors.message(
                error,
                'تعذر تحميل فعاليات المؤسسة.',
                'Could not load organization events.',
              ),
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
            t('تم نشر الفعالية', 'Event published'),
            normalizedCreated.visibility === 'private'
              ? t('ستظهر لمتابعي المؤسسة المقبولين.', 'It is visible to approved organization followers.')
              : t('أصبحت متاحة الآن لمستخدمي PlanGo.', 'It is now available to PlanGo users.'),
          );
          return true;
        } catch (error) {
          const message = apiErrors.message(
            error,
            'تعذر إنشاء الفعالية الجديدة.',
            'Could not create the new event.',
          );
          patchState(store, { saving: false, error: message });
          toast.error(t('تعذر إنشاء الفعالية', 'Could not create event'), message);
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
          toast.success(t('تم تحديث الفعالية', 'Event updated'));
          return true;
        } catch (error) {
          const message = apiErrors.message(
            error,
            'تعذر تحديث الفعالية.',
            'Could not update the event.',
          );
          patchState(store, {
            saving: false,
            activeEventId: null,
            error: message,
          });
          toast.error(t('تعذر تحديث الفعالية', 'Could not update event'), message);
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
          toast.info(t('تم حذف الفعالية', 'Event deleted'));
          return true;
        } catch (error) {
          const message = apiErrors.message(
            error,
            'تعذر حذف الفعالية.',
            'Could not delete the event.',
          );
          patchState(store, {
            activeEventId: null,
            error: message,
          });
          toast.error(t('تعذر حذف الفعالية', 'Could not delete event'), message);
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
          toast.success(
            updated.isActive
              ? t('تم تفعيل الفعالية', 'Event activated')
              : t('تم إيقاف الفعالية', 'Event paused'),
          );
          return true;
        } catch (error) {
          const message = apiErrors.message(
            error,
            'تعذر تغيير حالة الفعالية.',
            'Could not change event status.',
          );
          patchState(store, {
            activeEventId: null,
            error: message,
          });
          toast.error(t('تعذر تغيير حالة الفعالية', 'Could not change event status'), message);
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
