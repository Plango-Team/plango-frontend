import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { authStore } from '../../features/auth/auth.store';

export type NotificationKind =
  | 'task_deadline'
  | 'task_overdue'
  | 'appointment_added'
  | 'event_published'
  | 'info';

export type AppNotification = {
  id: string;
  ownerId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  createdAt: number;
  read: boolean;
  link?: string;
};

type NotificationsState = {
  items: AppNotification[];
};

const STORAGE_KEY = 'plango.notifications.v1';
const MAX_ITEMS = 100;

export const NotificationsStore = signalStore(
  { providedIn: 'root' },
  withState<NotificationsState>({
    items: [],
  }),
  withComputed((store) => {
    const auth = inject(authStore);

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
    };
  }),
  withMethods((store) => {
    const commit = (nextItems: AppNotification[]) => {
      patchState(store, { items: nextItems });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems.slice(0, 400)));
      } catch {
        // Ignore persistence errors (private mode / quota).
      }
    };

    const randomId = () => Math.random().toString(36).slice(2, 10);

    return {
      hydrate() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw) as AppNotification[];
          if (Array.isArray(parsed)) {
            patchState(store, { items: parsed });
          }
        } catch {
          patchState(store, { items: [] });
        }
      },

      push(
        input: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'ownerId'> & {
          ownerId?: string;
        },
      ) {
        const ownerId = input.ownerId ?? store.currentOwnerId();
        const newItem: AppNotification = {
          ...input,
          id: randomId(),
          ownerId,
          createdAt: Date.now(),
          read: false,
        };

        const scoped = [newItem, ...store.items().filter((item) => item.ownerId === ownerId)].slice(
          0,
          MAX_ITEMS,
        );
        const others = store.items().filter((item) => item.ownerId !== ownerId);
        commit([...scoped, ...others]);
      },

      markRead(id: string) {
        commit(store.items().map((item) => (item.id === id ? { ...item, read: true } : item)));
      },

      markAllRead(ownerId = store.currentOwnerId()) {
        commit(
          store.items().map((item) => (item.ownerId === ownerId ? { ...item, read: true } : item)),
        );
      },

      clear(ownerId = store.currentOwnerId()) {
        commit(store.items().filter((item) => item.ownerId !== ownerId));
      },

      remove(id: string) {
        commit(store.items().filter((item) => item.id !== id));
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.hydrate();
    },
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
