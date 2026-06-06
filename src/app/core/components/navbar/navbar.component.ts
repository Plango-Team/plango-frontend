import { Component, EventEmitter, Output, computed, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { authStore } from '../../../features/auth/auth.store';
import { SocialStore } from '../../../features/user/social/social.store';
import {
  AppNotification,
  NotificationsStore,
  timeAgoLabel,
} from '../../../shared/stores/notifications.store';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-navbar',
  imports: [IconComponent, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  public themeService = inject(ThemeService);
  public authStore = inject(authStore);
  public socialStore = inject(SocialStore);
  public notificationsStore = inject(NotificationsStore);
  private toastService = inject(ToastService);
  readonly isOrganization = computed(() => (this.authStore.user() as any)?.accountType === 'organization');
  public profileRoutePrefix = computed(() => {
    return (this.authStore.user() as any)?.accountType === 'organization'
      ? '/organization/profile'
      : '/user/profile';
});
  public notificationsRoute = computed(() => {
    return (this.authStore.user() as any)?.accountType === 'organization'
      ? '/organization/notifications'
      : '/user/notifications';
});

  public isMenuOpen = signal(false);
  public isNotificationsOpen = signal(false);
  public ar = true;

  @ViewChild('profileMenuWrap') profileMenuWrap?: ElementRef<HTMLElement>;
  @ViewChild('notificationsMenuWrap') notificationsMenuWrap?: ElementRef<HTMLElement>;
  @Output() sidebarToggle = new EventEmitter<void>();

  onSidebarToggle() {
    this.sidebarToggle.emit();
    this.isMenuOpen.set(false);
    this.isNotificationsOpen.set(false);
  }

  toggleMenu() {
    this.isMenuOpen.update((v) => !v);
    this.isNotificationsOpen.set(false);
  }

  toggleNotificationsMenu() {
    this.isNotificationsOpen.update((v) => !v);
    this.isMenuOpen.set(false);
  }

  openNotification(item: AppNotification) {
    this.notificationsStore.markRead(item.id);
    if (item.link) {
      this.isNotificationsOpen.set(false);
    }
  }

  markAllNotificationsRead() {
    this.notificationsStore.markAllRead();
    this.toastService.info(this.ar ? 'تم تعليم كل الإشعارات كمقروءة' : 'All notifications marked as read');
  }

  clearNotifications() {
    this.notificationsStore.clear();
    this.toastService.info(this.ar ? 'تم مسح الإشعارات' : 'Notifications cleared');
  }

  notificationTime(item: AppNotification) {
    return timeAgoLabel(item.createdAt, this.ar);
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent) {
    const target = event.target as Node | null;

    if (
      this.profileMenuWrap &&
      target &&
      !this.profileMenuWrap.nativeElement.contains(target)
    ) {
      this.isMenuOpen.set(false);
    }

    if (
      this.notificationsMenuWrap &&
      target &&
      !this.notificationsMenuWrap.nativeElement.contains(target)
    ) {
      this.isNotificationsOpen.set(false);
    }
  }

  logout() {
    this.authStore.logOut();
    this.isMenuOpen.set(false);
    this.isNotificationsOpen.set(false);
  }
}
