import { Component, EventEmitter, Output, computed, ElementRef, HostListener, Injector, ViewChild, inject, signal } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { authStore } from '../../../features/auth/auth.store';
import { SocialStore } from '../../../features/user/social/social.store';
import {
  AppNotification,
  NotificationsStore,
  timeAgoLabel,
} from '../../../shared/stores/notifications.store';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../services/auth/auth.service';
import { TasksStore } from '../../../features/user/tasks/tasks.store';
import { EventsStore } from '../../../features/user/events/events.store';
import { OrganizationEventsStore } from '../../../features/organization/stores/organization-events.store';

type SearchKind = 'page' | 'profile' | 'post' | 'task' | 'event';

type DashboardSearchResult = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  badge: string;
  route: string[];
  token: string;
  keywords?: string[];
};

@Component({
  selector: 'app-navbar',
  imports: [IconComponent, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  public themeService = inject(ThemeService);
  public authStore = inject(authStore);
  public authService = inject(AuthService);
  public router = inject(Router)
  public socialStore = inject(SocialStore);
  public notificationsStore = inject(NotificationsStore);
  private toastService = inject(ToastService);
  private injector = inject(Injector);
  private lazyTasksStore: any = null;
  private lazyEventsStore: any = null;
  private lazyOrganizationEventsStore: any = null;

  readonly isOrganization = computed(() => this.authStore.user()?.role === 'org');
  readonly dashboardBase = computed(() => (this.isOrganization() ? '/organization' : '/user'));
  public profileRoutePrefix = computed(() => {
    return this.authStore.user()?.role === 'org'
      ? '/organization/profile'
      : '/user/profile';
});
  public notificationsRoute = computed(() => {
    return this.authStore.user()?.role === 'org'
      ? '/organization/notifications'
      : '/user/notifications';
});
  public notificationPreview = computed(() => this.notificationsStore.visible().slice(0, 8));

  public isMenuOpen = signal(false);
  public isNotificationsOpen = signal(false);
  public isSearchOpen = signal(false);
  public searchQuery = signal('');
  public ar = true;

  @ViewChild('profileMenuWrap') profileMenuWrap?: ElementRef<HTMLElement>;
  @ViewChild('notificationsMenuWrap') notificationsMenuWrap?: ElementRef<HTMLElement>;
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @Output() sidebarToggle = new EventEmitter<void>();

  readonly quickActions = computed<DashboardSearchResult[]>(() => {
    const base = this.dashboardBase();
    const shared: DashboardSearchResult[] = [
      {
        id: 'page-dashboard',
        kind: 'page',
        title: 'لوحة التحكم',
        subtitle: 'العودة إلى الصفحة الرئيسية للحساب',
        badge: 'صفحة',
        route: [base, 'dashboard'],
        token: '⌂',
        keywords: ['dashboard', 'home', 'الرئيسية'],
      },
      {
        id: 'page-feed',
        kind: 'page',
        title: 'المنشورات',
        subtitle: 'منشورات المجتمع والتحديثات',
        badge: 'صفحة',
        route: [base, 'feed'],
        token: 'م',
        keywords: ['feed', 'posts', 'social'],
      },
      {
        id: 'page-events',
        kind: 'page',
        title: this.isOrganization() ? 'فعاليات المؤسسة' : 'الفعاليات',
        subtitle: this.isOrganization()
          ? 'إنشاء وإدارة فعاليات المؤسسة'
          : 'استكشاف الفعاليات المتاحة',
        badge: 'صفحة',
        route: [base, 'events'],
        token: 'ف',
        keywords: ['events', 'event'],
      },
      {
        id: 'page-notifications',
        kind: 'page',
        title: 'الإشعارات',
        subtitle: 'آخر التنبيهات والطلبات',
        badge: 'صفحة',
        route: [base, 'notifications'],
        token: 'إ',
        keywords: ['notifications', 'alerts'],
      },
      {
        id: 'page-settings',
        kind: 'page',
        title: 'الإعدادات',
        subtitle: 'الملف والأمان والخصوصية',
        badge: 'صفحة',
        route: [base, 'settings'],
        token: 'ض',
        keywords: ['settings', 'account', 'security'],
      },
    ];

    if (this.isOrganization()) {
      return [
        shared[0],
        shared[1],
        {
          id: 'page-posts',
          kind: 'page',
          title: 'إدارة المنشورات',
          subtitle: 'مراجعة منشورات المؤسسة والتفاعل معها',
          badge: 'صفحة',
          route: [base, 'posts'],
          token: 'ن',
          keywords: ['posts', 'manage'],
        },
        shared[2],
        {
          id: 'page-followers',
          kind: 'page',
          title: 'المتابعون',
          subtitle: 'المتابعون والطلبات والعلاقات',
          badge: 'صفحة',
          route: [base, 'followers'],
          token: 'ت',
          keywords: ['followers', 'following', 'requests'],
        },
        shared[3],
        shared[4],
      ];
    }

    return [
      shared[0],
      {
        id: 'page-tasks',
        kind: 'page',
        title: 'المهام',
        subtitle: 'المهام والمواعيد النهائية',
        badge: 'صفحة',
        route: [base, 'tasks'],
        token: 'هـ',
        keywords: ['tasks', 'todos'],
      },
      {
        id: 'page-calendar',
        kind: 'page',
        title: 'التقويم',
        subtitle: 'مواعيدك وجدولك',
        badge: 'صفحة',
        route: [base, 'calendar'],
        token: 'ق',
        keywords: ['calendar', 'schedule'],
      },
      shared[2],
      {
        id: 'page-network',
        kind: 'page',
        title: 'الشبكة',
        subtitle: 'الأشخاص والمؤسسات والمتابعات',
        badge: 'صفحة',
        route: [base, 'network'],
        token: 'ش',
        keywords: ['network', 'people', 'follow'],
      },
      shared[1],
      {
        id: 'page-appointments',
        kind: 'page',
        title: 'المواعيد',
        subtitle: 'المواعيد المرتبطة بجدولك',
        badge: 'صفحة',
        route: [base, 'appointments'],
        token: 'و',
        keywords: ['appointments'],
      },
      shared[3],
      shared[4],
    ];
  });

  readonly searchResults = computed<DashboardSearchResult[]>(() => {
    const query = this.normalize(this.searchQuery());
    const actions = this.quickActions();
    if (!query) return actions.slice(0, 8);

    const pageResults = actions.filter((item) => this.matches(item, query));
    const profileResults = this.socialStore
      .profiles()
      .filter((profile) =>
        this.includesQuery(
          [profile.displayName, profile.username, profile.bio, profile.city],
          query,
        ),
      )
      .slice(0, 5)
      .map(
        (profile): DashboardSearchResult => ({
          id: `profile-${profile.id}`,
          kind: 'profile',
          title: profile.displayName,
          subtitle: `@${profile.username}${profile.city ? ` · ${profile.city}` : ''}`,
          badge: profile.kind === 'org' ? 'مؤسسة' : 'شخص',
          route: [this.profileRoutePrefix(), profile.username],
          token: this.tokenFor(profile.displayName),
          keywords: [profile.username, profile.bio ?? '', profile.city ?? ''],
        }),
      );

    const eventResults = this.searchableEvents()
      .filter((event: any) =>
        this.includesQuery(
          [
            event.title,
            event.description,
            event.category,
            event.location?.addressName,
            event.location?.fullAddress,
          ],
          query,
        ),
      )
      .slice(0, 4)
      .map(
        (event: any): DashboardSearchResult => ({
          id: `event-${event._id}`,
          kind: 'event',
          title: event.title,
          subtitle: event.location?.addressName || event.location?.fullAddress || 'فعالية',
          badge: 'فعالية',
          route: [this.dashboardBase(), 'events'],
          token: 'ف',
          keywords: [event.category, event.description],
        }),
      );

    const taskResults = this.isOrganization()
      ? []
      : this.tasksStore
          .tasks()
          .filter((task: any) =>
            this.includesQuery(
              [task.title, task.description, task.priority, task.status],
              query,
            ),
          )
          .slice(0, 4)
          .map(
            (task: any): DashboardSearchResult => ({
              id: `task-${task._id ?? task.title}`,
              kind: 'task',
              title: task.title,
              subtitle: task.description || this.taskStatusLabel(task.status),
              badge: 'مهمة',
              route: ['/user', 'tasks'],
              token: 'هـ',
              keywords: [task.priority, task.status],
            }),
          );

    const postResults = this.socialStore
      .posts()
      .filter((post) => {
        const author = this.socialStore.getAuthor(post.authorId);
        return this.includesQuery(
          [post.body, author?.displayName, author?.username],
          query,
        );
      })
      .slice(0, 4)
      .map((post): DashboardSearchResult => {
        const author = this.socialStore.getAuthor(post.authorId);
        return {
          id: `post-${post.id}`,
          kind: 'post',
          title: author ? `منشور من ${author.displayName}` : 'منشور',
          subtitle: post.body,
          badge: 'منشور',
          route: [this.dashboardBase(), 'feed'],
          token: 'م',
          keywords: [author?.username ?? ''],
        };
      });

    return [
      ...pageResults,
      ...profileResults,
      ...eventResults,
      ...taskResults,
      ...postResults,
    ].slice(0, 14);
  });

  readonly isSearchLoading = computed(() => {
    if (!this.isSearchOpen()) return false;
    if (this.socialStore.postsLoading()) return true;
    return this.isOrganization()
      ? !!this.lazyOrganizationEventsStore?.loading?.()
      : !!this.lazyTasksStore?.isLoading?.() || !!this.lazyEventsStore?.isLoading?.();
  });

  private get tasksStore(): any {
    this.lazyTasksStore ??= this.injector.get(TasksStore);
    return this.lazyTasksStore;
  }

  private get eventsStore(): any {
    this.lazyEventsStore ??= this.injector.get(EventsStore);
    return this.lazyEventsStore;
  }

  private get organizationEventsStore(): any {
    this.lazyOrganizationEventsStore ??= this.injector.get(OrganizationEventsStore);
    return this.lazyOrganizationEventsStore;
  }

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
    const willOpen = !this.isNotificationsOpen();
    this.isNotificationsOpen.set(willOpen);
    this.isMenuOpen.set(false);
    if (willOpen) {
      this.notificationsStore.load();
    }
  }

  openSearch() {
    this.isSearchOpen.set(true);
    this.isMenuOpen.set(false);
    this.isNotificationsOpen.set(false);
    this.loadSearchSources();
    setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  closeSearch() {
    this.isSearchOpen.set(false);
    this.searchQuery.set('');
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
  }

  selectSearchResult(result: DashboardSearchResult) {
    this.isSearchOpen.set(false);
    this.searchQuery.set('');
    this.router.navigate(result.route);
  }

  openFirstSearchResult() {
    const first = this.searchResults()[0];
    if (first) this.selectSearchResult(first);
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

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      this.openSearch();
      return;
    }

    if (key === 'escape' && this.isSearchOpen()) {
      this.closeSearch();
    }
  }

  logout() {
    this.authStore.logOut()
  }

  private loadSearchSources() {
    this.socialStore.loadAll();
    if (this.isOrganization()) {
      this.organizationEventsStore.loadAll();
      return;
    }

    this.tasksStore.loadTasks();
    this.eventsStore.loadEvents();
  }

  private searchableEvents(): any[] {
    return this.isOrganization()
      ? this.organizationEventsStore.events()
      : this.eventsStore.events();
  }

  private matches(item: DashboardSearchResult, query: string): boolean {
    return this.includesQuery(
      [item.title, item.subtitle, item.badge, ...(item.keywords ?? [])],
      query,
    );
  }

  private includesQuery(values: unknown[], query: string): boolean {
    return values.some((value) => this.normalize(value).includes(query));
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u064B-\u065F]/g, '')
      .trim()
      .toLowerCase();
  }

  private tokenFor(value: string): string {
    return value.trim().charAt(0) || '•';
  }

  private taskStatusLabel(status: string): string {
    if (status === 'completed') return 'مكتملة';
    if (status === 'lated') return 'متأخرة';
    return 'قيد التنفيذ';
  }
}
