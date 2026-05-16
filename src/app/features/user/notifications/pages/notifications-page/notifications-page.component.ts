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
    this.notificationsStore.clear();
    this.toastService.info(this.ar ? 'تم مسح كل الإشعارات' : 'Notifications cleared');
  }

  relativeTime(item: AppNotification) {
    return timeAgoLabel(item.createdAt, this.ar);
  }
}
