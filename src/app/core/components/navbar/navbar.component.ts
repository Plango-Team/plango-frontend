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
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '@ngx-translate/core';

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
  imports: [IconComponent, RouterLink, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  public themeService = inject(ThemeService);
  public language = inject(LanguageService);
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
  get ar(): boolean {
    return this.language.isArabic();
  }

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
        title: this.language.text('لوحة التحكم', 'Dashboard'),
        subtitle: this.language.text('العودة إلى الصفحة الرئيسية للحساب', 'Return to account home'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'dashboard'],
        token: '⌂',
        keywords: ['dashboard', 'home', this.language.text('الرئيسية', 'feed')],
      },
      {
        id: 'page-feed',
        kind: 'page',
        title: this.language.text('المنشورات', 'Posts'),
        subtitle: this.language.text('منشورات المجتمع والتحديثات', 'Community posts and updates'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'feed'],
        token: this.language.text('م', 'P'),
        keywords: ['feed', 'posts', 'social'],
      },
      {
        id: 'page-events',
        kind: 'page',
        title: this.isOrganization()
          ? this.language.text('فعاليات المؤسسة', 'Organization events')
          : this.language.text('الفعاليات', 'Events'),
        subtitle: this.isOrganization()
          ? this.language.text('إنشاء وإدارة فعاليات المؤسسة', 'Create and manage organization events')
          : this.language.text('استكشاف الفعاليات المتاحة', 'Explore available events'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'events'],
        token: this.language.text('ف', 'E'),
        keywords: ['events', 'event'],
      },
      {
        id: 'page-notifications',
        kind: 'page',
        title: this.language.text('الإشعارات', 'Notifications'),
        subtitle: this.language.text('آخر التنبيهات والطلبات', 'Latest alerts and requests'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'notifications'],
        token: this.language.text('إ', 'N'),
        keywords: ['notifications', 'alerts'],
      },
      {
        id: 'page-settings',
        kind: 'page',
        title: this.language.text('الإعدادات', 'Settings'),
        subtitle: this.language.text('الملف والأمان والخصوصية', 'Profile, security, and privacy'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'settings'],
        token: this.language.text('ض', 'S'),
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
          title: this.language.text('إدارة المنشورات', 'Manage posts'),
          subtitle: this.language.text('مراجعة منشورات المؤسسة والتفاعل معها', 'Review organization posts and engagement'),
          badge: this.language.text('صفحة', 'Page'),
          route: [base, 'posts'],
          token: this.language.text('ن', 'P'),
          keywords: ['posts', 'manage'],
        },
        shared[2],
        {
          id: 'page-followers',
          kind: 'page',
          title: this.language.text('المتابعون', 'Followers'),
          subtitle: this.language.text('المتابعون والطلبات والعلاقات', 'Followers, requests, and relationships'),
          badge: this.language.text('صفحة', 'Page'),
          route: [base, 'followers'],
          token: this.language.text('ت', 'F'),
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
        title: this.language.text('المهام', 'Tasks'),
        subtitle: this.language.text('المهام والمواعيد النهائية', 'Tasks and deadlines'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'tasks'],
        token: this.language.text('هـ', 'T'),
        keywords: ['tasks', 'todos'],
      },
      {
        id: 'page-calendar',
        kind: 'page',
        title: this.language.text('التقويم', 'Calendar'),
        subtitle: this.language.text('مواعيدك وجدولك', 'Your appointments and schedule'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'calendar'],
        token: this.language.text('ق', 'C'),
        keywords: ['calendar', 'schedule'],
      },
      shared[2],
      {
        id: 'page-network',
        kind: 'page',
        title: this.language.text('الشبكة', 'Network'),
        subtitle: this.language.text('الأشخاص والمؤسسات والمتابعات', 'People, organizations, and follows'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'network'],
        token: this.language.text('ش', 'N'),
        keywords: ['network', 'people', 'follow'],
      },
      shared[1],
      {
        id: 'page-appointments',
        kind: 'page',
        title: this.language.text('المواعيد', 'Appointments'),
        subtitle: this.language.text('المواعيد المرتبطة بجدولك', 'Appointments linked to your schedule'),
        badge: this.language.text('صفحة', 'Page'),
        route: [base, 'appointments'],
        token: this.language.text('و', 'A'),
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
          badge:
            profile.kind === 'org'
              ? this.language.text('مؤسسة', 'Organization')
              : this.language.text('شخص', 'Person'),
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
          subtitle:
            event.location?.addressName ||
            event.location?.fullAddress ||
            this.language.text('فعالية', 'Event'),
          badge: this.language.text('فعالية', 'Event'),
          route: [this.dashboardBase(), 'events'],
          token: this.language.text('ف', 'E'),
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
              badge: this.language.text('مهمة', 'Task'),
              route: ['/user', 'tasks'],
              token: this.language.text('هـ', 'T'),
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
          title: author
            ? this.language.text(
                `منشور من ${author.displayName}`,
                `Post by ${author.displayName}`,
              )
            : this.language.text('منشور', 'Post'),
          subtitle: post.body,
          badge: this.language.text('منشور', 'Post'),
          route: [this.dashboardBase(), 'feed'],
          token: this.language.text('م', 'P'),
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
    if (status === 'completed') return this.language.text('مكتملة', 'Completed');
    if (status === 'lated') return this.language.text('متأخرة', 'Overdue');
    return this.language.text('قيد التنفيذ', 'In progress');
  }
}
