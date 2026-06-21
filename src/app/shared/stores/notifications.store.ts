import { computed, effect, inject, untracked } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { firstValueFrom, Subscription } from 'rxjs';
import { authStore } from '../../features/auth/auth.store';
import {
  BackendNotification,
  NotificationApiService,
} from '../services/notification-api.service';
import { NotificationRealtimeService } from '../services/notification-realtime.service';
import { PushNotificationService } from '../services/push-notification.service';
import { ToastService } from '../services/toast.service';
import { LanguageService } from '../../core/services/language.service';
import { ApiErrorService } from '../../core/services/api-error.service';

export type NotificationKind =
  | 'task_deadline'
  | 'task_overdue'
  | 'appointment_added'
  | 'appointment_preparation'
  | 'appointment_departure'
  | 'event_published'
  | 'new_follower'
  | 'new_follow_request'
  | 'follow_request_accepted'
  | 'info'
  | (string & {});

export type AppNotification = {
  id: string;
  ownerId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  createdAt: number;
  read: boolean;
  link?: string;
  source: 'server' | 'local';
  data?: Record<string, unknown>;
};

type NotificationsState = {
  items: AppNotification[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  page: number;
  hasMore: boolean;
  deviceRegistered: boolean;
  pushRegistrationError: string | null;
};

const STORAGE_KEY = 'plango.notifications.v1';
const PAGE_SIZE = 20;
const MAX_LOCAL_ITEMS = 100;
const PASSIVE_REFRESH_COOLDOWN_MS = 30_000;
const FALLBACK_POLL_INTERVAL_MS = 5 * 60_000;

const recipientId = (recipient: BackendNotification['recipient']): string =>
  typeof recipient === 'string' ? recipient : recipient?._id ?? '';

const routeForNotification = (notification: BackendNotification): string | undefined => {
  switch (notification.type) {
    case 'task_deadline':
      return '/user/tasks';
    case 'appointment_preparation':
    case 'appointment_departure':
      return '/user/calendar';
    case 'new_follower':
    case 'new_follow_request':
    case 'follow_request_accepted':
      return '/user/network';
    default:
      return undefined;
  }
};

const fromBackend = (
  notification: BackendNotification,
  fallbackOwnerId: string,
): AppNotification => ({
  id: notification._id,
  ownerId: recipientId(notification.recipient) || fallbackOwnerId,
  kind: notification.type,
  title: notification.title,
  body: notification.message,
  createdAt: new Date(notification.createdAt).getTime() || Date.now(),
  read: notification.isRead,
  link: routeForNotification(notification),
  source: 'server',
  data: notification.data,
});

export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState<NotificationsState>({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    page: 0,
    hasMore: true,
    deviceRegistered: false,
    pushRegistrationError: null,
  }),
  withComputed((store) => {
    const auth = inject(authStore);
    const push = inject(PushNotificationService);
    const realtime = inject(NotificationRealtimeService);

    const currentOwnerId = computed(() => auth.user()?._id ?? 'guest');
    const visible = computed(() =>
      store
        .items()
        .filter((item) => item.ownerId === currentOwnerId())
        .sort((a, b) => b.createdAt - a.createdAt),
    );

    return {
      currentOwnerId,
      visible,
      unreadCount: computed(() => visible().filter((item) => !item.read).length),
      localCount: computed(() => visible().filter((item) => item.source === 'local').length),
      pushSupported: computed(() => push.supported()),
      pushPermission: computed(() => push.permission()),
      pushBusy: computed(() => push.isBusy()),
      realtimeConnected: computed(() => realtime.connected()),
      realtimeError: computed(() => realtime.lastError()),
    };
  }),
  withMethods((store) => {
    const api = inject(NotificationApiService);
    const push = inject(PushNotificationService);
    const toast = inject(ToastService);
    const language = inject(LanguageService);
    const apiErrors = inject(ApiErrorService);
    let lastRemoteLoadAt = 0;
    let pushSyncPromise: Promise<boolean> | null = null;

    const persistLocal = (items: AppNotification[]) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(items.filter((item) => item.source === 'local').slice(0, 400)),
        );
      } catch {
        // Ignore persistence errors from private mode or storage quotas.
      }
    };

    const commit = (items: AppNotification[]) => {
      patchState(store, { items });
      persistLocal(items);
    };

    const dedupe = (items: AppNotification[]): AppNotification[] => {
      const seen = new Set<string>();
      return items.filter((item) => {
        const key = `${item.source}:${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const loadPage = (page: number, append: boolean, force = false) => {
      const ownerId = store.currentOwnerId();
      if (ownerId === 'guest') return;
      if ((!append && store.isLoading()) || (append && store.isLoadingMore())) return;
      if (
        !append &&
        !force &&
        Date.now() - lastRemoteLoadAt < PASSIVE_REFRESH_COOLDOWN_MS
      ) {
        return;
      }

      if (!append) lastRemoteLoadAt = Date.now();

      patchState(store, {
        isLoading: !append,
        isLoadingMore: append,
        error: null,
      });

      api.getNotifications(page, PAGE_SIZE).subscribe({
        next: ({ notifications, pagination }) => {
          const mapped = notifications.map((notification) => fromBackend(notification, ownerId));
          const retained = store.items().filter(
            (item) => item.source === 'local' || item.ownerId !== ownerId,
          );
          const previousServerItems = append
            ? store
                .items()
                .filter((item) => item.source === 'server' && item.ownerId === ownerId)
            : [];

          commit(dedupe([...mapped, ...previousServerItems, ...retained]));
          patchState(store, {
            isLoading: false,
            isLoadingMore: false,
            page: pagination.page,
            hasMore: pagination.page < pagination.pages,
          });
        },
        error: (error) => {
          patchState(store, {
            isLoading: false,
            isLoadingMore: false,
            error: apiErrors.message(
              error,
              'تعذر تحميل الإشعارات. حاول مرة أخرى.',
              'Could not load notifications. Please try again.',
            ),
          });
        },
      });
    };

    return {
      hydrate() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw) as Partial<AppNotification>[];
          if (!Array.isArray(parsed)) return;

          const localItems = parsed
            .filter((item) => item.id && item.ownerId && item.title)
            .map(
              (item): AppNotification => ({
                id: item.id!,
                ownerId: item.ownerId!,
                kind: item.kind ?? 'info',
                title: item.title!,
                body: item.body,
                createdAt: item.createdAt ?? Date.now(),
                read: item.read ?? false,
                link: item.link,
                source: 'local',
                data: item.data,
              }),
            );
          patchState(store, { items: localItems });
        } catch {
          patchState(store, { items: [] });
        }
      },

      load(force = false) {
        loadPage(1, false, force);
      },

      loadMore() {
        if (store.isLoadingMore() || !store.hasMore()) return;
        loadPage(store.page() + 1, true);
      },

      resetRemote() {
        lastRemoteLoadAt = 0;
        commit(store.items().filter((item) => item.source === 'local'));
        patchState(store, {
          isLoading: false,
          isLoadingMore: false,
          error: null,
          page: 0,
          hasMore: true,
          deviceRegistered: false,
          pushRegistrationError: null,
        });
      },

      receiveServerNotification(notification: BackendNotification) {
        const ownerId = store.currentOwnerId();
        if (ownerId === 'guest') return;

        const incoming = fromBackend(notification, ownerId);
        commit(dedupe([incoming, ...store.items()]));
        toast.info(incoming.title, incoming.body);
      },

      push(
        input: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'ownerId' | 'source'> & {
          ownerId?: string;
        },
      ) {
        const ownerId = input.ownerId ?? store.currentOwnerId();
        const newItem: AppNotification = {
          ...input,
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10),
          ownerId,
          createdAt: Date.now(),
          read: false,
          source: 'local',
        };

        const scoped = [
          newItem,
          ...store
            .items()
            .filter((item) => item.source === 'local' && item.ownerId === ownerId),
        ].slice(0, MAX_LOCAL_ITEMS);
        const others = store
          .items()
          .filter((item) => item.source !== 'local' || item.ownerId !== ownerId);
        commit([...scoped, ...others]);
      },

      markRead(id: string) {
        const item = store.items().find((notification) => notification.id === id);
        if (!item || item.read) return;

        commit(
          store.items().map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification,
          ),
        );

        if (item.source === 'server') {
          api.markAsRead(id).subscribe({
            error: () => {
              commit(
                store.items().map((notification) =>
                  notification.id === id ? { ...notification, read: false } : notification,
                ),
              );
              toast.error(
                language.text(
                  'تعذر تحديث حالة الإشعار',
                  'Could not update the notification status',
                ),
              );
            },
          });
        }
      },

      markAllRead(ownerId = store.currentOwnerId()) {
        const unreadServerItems = store
          .items()
          .filter(
            (item) => item.ownerId === ownerId && item.source === 'server' && !item.read,
          );
        const previousItems = store.items();

        commit(
          previousItems.map((item) =>
            item.ownerId === ownerId ? { ...item, read: true } : item,
          ),
        );

        if (unreadServerItems.length) {
          api.markAllAsRead().subscribe({
            error: () => {
              commit(previousItems);
              toast.error(
                language.text(
                  'تعذر تعليم الإشعارات كمقروءة',
                  'Could not mark notifications as read',
                ),
              );
            },
          });
        }
      },

      clearLocal(ownerId = store.currentOwnerId()) {
        commit(
          store
            .items()
            .filter((item) => item.ownerId !== ownerId || item.source !== 'local'),
        );
      },

      remove(id: string) {
        const item = store.items().find((notification) => notification.id === id);
        if (item?.source !== 'local') return;
        commit(store.items().filter((notification) => notification.id !== id));
      },

      async syncPushToken(requestPermission = false): Promise<boolean> {
        if (!requestPermission && store.deviceRegistered()) return true;
        if (pushSyncPromise) return pushSyncPromise;

        pushSyncPromise = (async () => {
          patchState(store, { pushRegistrationError: null });
          try {
            const token = await push.getRegistrationToken(requestPermission);
            if (!token) {
              patchState(store, { deviceRegistered: false });
              return false;
            }
            await firstValueFrom(api.saveFcmToken(token));
            patchState(store, {
              deviceRegistered: true,
              pushRegistrationError: null,
            });
            return true;
          } catch (error) {
            const message =
              push.lastError() ||
              (error instanceof Error
                ? error.message
                : language.text('تعذر تسجيل هذا الجهاز', 'Could not register this device'));
            patchState(store, {
              deviceRegistered: false,
              pushRegistrationError: message,
            });
            if (requestPermission) {
              toast.error(
                language.text(
                  'تعذر تفعيل إشعارات الجهاز',
                  'Could not enable device notifications',
                ),
                message,
              );
            }
            return false;
          }
        })();

        try {
          return await pushSyncPromise;
        } finally {
          pushSyncPromise = null;
        }
      },
    };
  }),
  withHooks((store) => {
    const auth = inject(authStore);
    const realtime = inject(NotificationRealtimeService);
    const push = inject(PushNotificationService);
    const subscriptions = new Subscription();
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const refreshWhenAuthenticated = (force = false) => {
      if (auth.user() && document.visibilityState === 'visible') {
        if (!force && realtime.connected()) return;
        store.load(force);
      }
    };

    const handleOnline = () => {
      if (auth.user()) {
        store.load(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && auth.user()) {
        store.load();
      }
    };

    return {
      onInit() {
        store.hydrate();
        subscriptions.add(
          realtime.notifications$.subscribe((notification) => {
            store.receiveServerNotification(notification);
          }),
        );
        subscriptions.add(
          push.messages$.subscribe(() => {
            store.load();
          }),
        );

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        effect(() => {
          const user = auth.user();
          const token = auth.token();

          untracked(() => {
            if (!user) {
              if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
              }
              realtime.disconnect();
              store.resetRemote();
              return;
            }

            if (token) {
              realtime.connect(token);
            } else {
              realtime.disconnect();
            }
            store.load();
            void store.syncPushToken(false);
            if (!refreshTimer) {
              refreshTimer = setInterval(
                () => refreshWhenAuthenticated(false),
                FALLBACK_POLL_INTERVAL_MS,
              );
            }
          });
        });
      },
      onDestroy() {
        if (refreshTimer) clearInterval(refreshTimer);
        window.removeEventListener('online', handleOnline);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        subscriptions.unsubscribe();
        realtime.disconnect();
      },
    };
  }),
);

export const timeAgoLabel = (timestamp: number, ar = true): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return ar ? 'الآن' : 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return ar ? `منذ ${minutes} د` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return ar ? `منذ ${hours} س` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return ar ? `منذ ${days} يوم` : `${days}d ago`;
};
