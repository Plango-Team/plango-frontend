import { Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ThemeService } from '../../services/theme.service';
import { authStore } from '../../../features/auth/auth.store';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LanguageService } from '../../services/language.service';

type SidebarItem = {
  route: string;
  labelAr: string;
  labelEn: string;
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
  public language = inject(LanguageService);
  public readonly authStore = inject(authStore);

  private readonly userNavItems: SidebarItem[] = [
    { route: '/user/dashboard', labelAr: 'نبض اليوم', labelEn: 'Today', icon: 'DashboardSquare02Icon', exact: true },
    { route: '/user/feed', labelAr: 'الرئيسية', labelEn: 'Feed', icon: 'Note01Icon' },
    { route: '/user/calendar', labelAr: 'التقويم', labelEn: 'Calendar', icon: 'Calendar01Icon' },
    { route: '/user/appointments', labelAr: 'المواعيد', labelEn: 'Appointments', icon: 'TimeQuarter02Icon' },
    { route: '/user/tasks', labelAr: 'المهام', labelEn: 'Tasks', icon: 'Task01Icon' },
    { route: '/user/map', labelAr: 'الخريطة', labelEn: 'Map', icon: 'Location01Icon' },
    { route: '/user/events', labelAr: 'الفعاليات', labelEn: 'Events', icon: 'Compass01Icon' },
    { route: '/user/network', labelAr: 'الشبكة', labelEn: 'Network', icon: 'UserGroupIcon' },
    { route: '/user/settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: 'Settings01Icon' },
  ];

  private readonly organizationNavItems: SidebarItem[] = [
    {
      route: '/organization/dashboard',
      labelAr: 'نظرة عامة',
      labelEn: 'Overview',
      icon: 'DashboardSquare02Icon',
      exact: true,
    },
    { route: '/organization/feed', labelAr: 'الرئيسية', labelEn: 'Feed', icon: 'Note01Icon' },
    { route: '/organization/posts', labelAr: 'منشورات المؤسسة', labelEn: 'Organization posts', icon: 'Message01Icon' },
    { route: '/organization/events', labelAr: 'الفعاليات', labelEn: 'Events', icon: 'Compass01Icon' },
    { route: '/organization/followers', labelAr: 'المجتمع', labelEn: 'Community', icon: 'UserGroupIcon' },
    { route: '/organization/settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: 'Settings01Icon' },
  ];

  readonly navItems = computed(() =>
    this.authStore.user()?.role === 'org'
      ? this.organizationNavItems
      : this.userNavItems,
  );

  readonly shellHomeRoute = computed(() => {
    const user = this.authStore.user();

    if (user?.role === 'admin') {
      return '/admin';
    }

    return user?.role === 'org' ? '/organization/dashboard' : '/user/dashboard';
  });

  readonly quickActionLabel = computed(() =>
    this.authStore.user()?.role === 'org'
      ? this.language.text('فعالية جديدة', 'New event')
      : this.language.text('موعد ذكي جديد', 'New smart appointment'),
  );

  readonly quickActionDescription = computed(() =>
    this.authStore.user()?.role === 'org'
      ? this.language.text(
          'أنشئ فعالية جديدة وابدأ دعوة الحضور.',
          'Create an event and start inviting attendees.',
        )
      : this.language.text(
          'أنشئ موعداً جديداً مع تنبيه المغادرة الذكي.',
          'Create an appointment with a smart departure alert.',
        ),
  );

  readonly quickActionButtonLabel = computed(() =>
   this.authStore.user()?.role === 'org'
     ? this.language.text('إنشاء فعالية', 'Create event')
     : this.language.text('إنشاء موعد', 'Create appointment'),
  );

  readonly quickActionIcon = computed(() =>
   this.authStore.user()?.role === 'org' ? 'Calendar01Icon' : 'Add01Icon',
  );

  readonly quickActionRoute = computed(() =>
    this.authStore.user()?.role === 'org'
      ? '/organization/events'
      : '/user/appointments',
  );

  logout() {
    this.authStore.logOut();
  }

  displayName(): string {
    const user = this.authStore.user();
    if (!user) {
      return this.language.text('زائر', 'Guest');
    }

    return user.name?.trim();
  }

  initials(): string {
    const user = this.authStore.user();
    if (!user) {
      return this.language.text('ز', 'G');
    }

    const name = user.name?.trim();
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0] ? parts[0].charAt(0) : '';
    const last = parts[1] ? parts[1].charAt(0) : '';
    const value = `${first}${last}`.trim();

    return value ? value.toUpperCase() : this.language.text('ز', 'G');
  }
}
