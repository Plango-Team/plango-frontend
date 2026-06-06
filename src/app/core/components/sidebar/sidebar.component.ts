import { Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ThemeService } from '../../services/theme.service';
import { authStore } from '../../../features/auth/auth.store';
import { RouterLink, RouterLinkActive } from '@angular/router';

type SidebarItem = {
  route: string;
  label: string;
  icon: any;
  exact?: boolean;
};

@Component({
  selector: 'app-sidebar',
  imports: [IconComponent, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  public themeService = inject(ThemeService);
  public readonly authStore = inject(authStore);

  private readonly userNavItems: SidebarItem[] = [
    { route: '/user/dashboard', label: 'نبض اليوم', icon: 'DashboardSquare02Icon', exact: true },
    { route: '/user/feed', label: 'الخلاصة', icon: 'Note01Icon' },
    { route: '/user/calendar', label: 'التقويم', icon: 'Calendar01Icon' },
    { route: '/user/tasks', label: 'المهام', icon: 'Task01Icon' },
    { route: '/user/map', label: 'الخريطة', icon: 'Location01Icon' },
    { route: '/user/events', label: 'الفعاليات', icon: 'Compass01Icon' },
    { route: '/user/network', label: 'الشبكة', icon: 'UserGroupIcon' },
    { route: '/user/settings', label: 'الإعدادات', icon: 'Settings01Icon' },
  ];

  private readonly organizationNavItems: SidebarItem[] = [
    {
      route: '/organization/dashboard',
      label: 'نظرة عامة',
      icon: 'DashboardSquare02Icon',
      exact: true,
    },
    { route: '/organization/feed', label: 'الخلاصة', icon: 'Note01Icon' },
    { route: '/organization/posts', label: 'البثوث', icon: 'Message01Icon' },
    { route: '/organization/events', label: 'الفعاليات', icon: 'Compass01Icon' },
    { route: '/organization/followers', label: 'المجتمع', icon: 'UserGroupIcon' },
    { route: '/organization/settings', label: 'الإعدادات', icon: 'Settings01Icon' },
  ];

  readonly navItems = computed(() =>
    (this.authStore.user() as any)?.accountType === 'organization'
      ? this.organizationNavItems
      : this.userNavItems,
  );

  readonly shellHomeRoute = computed(() => {
    const user = this.authStore.user();

    if (user?.role === 'admin') {
      return '/admin';
    }

    return (user as any)?.accountType === 'organization' ? '/organization/dashboard' : '/user/dashboard';
  });

  readonly quickActionLabel = computed(() =>
    (this.authStore.user() as any)?.accountType === 'organization' ? 'فعالية جديدة' : 'موعد ذكي جديد',
  );

  readonly quickActionDescription = computed(() =>
    (this.authStore.user() as any)?.accountType === 'organization'
      ? 'أنشئ فعالية جديدة وابدأ دعوة الحضور.'
      : 'أنشئ موعداً جديداً مع تنبيه المغادرة الذكي.',
  );

  readonly quickActionButtonLabel = computed(() =>
   (this.authStore.user() as any)?.accountType === 'organization' ? 'إنشاء فعالية' : 'إنشاء موعد',
  );

  readonly quickActionIcon = computed(() =>
   (this.authStore.user() as any)?.accountType === 'organization' ? 'Calendar01Icon' : 'Add01Icon',
  );

  readonly quickActionRoute = computed(() =>
    (this.authStore.user() as any)?.accountType === 'organization'
      ? '/organization/events'
      : '/user/appointments',
  );

  logout() {
    this.authStore.logOut();
  }

  displayName(): string {
    const user = this.authStore.user();
    if (!user) {
      return 'زائر';
    }

    return user.name?.trim();
  }

  initials(): string {
    const user = this.authStore.user();
    if (!user) {
      return 'ز';
    }

    const name = user.name?.trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0] ? parts[0].charAt(0) : '';
    const last = parts[1] ? parts[1].charAt(0) : '';
    const value = `${first}${last}`.trim();

    return value ? value.toUpperCase() : 'ز';
  }
}
