import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import {
  AppNotification,
  NotificationsStore,
  timeAgoLabel,
} from '../../../../../shared/stores/notifications.store';
import { ToastService } from '../../../../../shared/services/toast.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
})
export class NotificationsPageComponent {
  readonly notificationsStore = inject(NotificationsStore);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  readonly ar = true;

  readonly items = computed(() => this.notificationsStore.visible());
  readonly pushEnabled = computed(
    () =>
      this.notificationsStore.pushPermission() === 'granted' &&
      this.notificationsStore.deviceRegistered(),
  );

  open(item: AppNotification) {
    this.notificationsStore.markRead(item.id);
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }

  remove(id: string, event: Event) {
    event.stopPropagation();
    this.notificationsStore.remove(id);
  }

  markAllRead() {
    this.notificationsStore.markAllRead();
    this.toastService.info(this.ar ? 'تم تعليم الإشعارات كمقروءة' : 'Notifications marked as read');
  }

  clearAll() {
    this.notificationsStore.clearLocal();
    this.toastService.info(
      this.ar ? 'تم مسح الإشعارات المحلية' : 'Local notifications cleared',
    );
  }

  refresh() {
    this.notificationsStore.load();
  }

  loadMore() {
    this.notificationsStore.loadMore();
  }

  async enableDeviceNotifications() {
    const enabled = await this.notificationsStore.syncPushToken(true);
    if (enabled) {
      this.toastService.success(
        this.ar ? 'تم تفعيل إشعارات الجهاز' : 'Device notifications enabled',
      );
    } else if (this.notificationsStore.pushPermission() === 'denied') {
      this.toastService.warning(
        this.ar ? 'إذن الإشعارات محظور من المتصفح' : 'Notifications are blocked',
        this.ar
          ? 'اسمح بالإشعارات من إعدادات الموقع في المتصفح ثم أعد المحاولة.'
          : 'Allow notifications from the browser site settings and try again.',
      );
    }
  }

  relativeTime(item: AppNotification) {
    return timeAgoLabel(item.createdAt, this.ar);
  }
}
