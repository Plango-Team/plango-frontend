import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../../core/services/language.service';
import { authStore } from '../../../auth/auth.store';
import { EventCategory, EventStatus } from '../../../user/events/interfaces/Ievents';
import { Profile } from '../../../user/social/services/social.service';
import { SocialStore } from '../../../user/social/social.store';
import { OrganizationEvent } from '../../services/organization-events.service';
import { OrganizationEventsStore } from '../../stores/organization-events.store';

type DashboardEventStatus = EventStatus | 'ended';

@Component({
  selector: 'app-organization-dashboard-page',
  standalone: true,
  imports: [TranslatePipe, RouterLink, DatePipe],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class OrganizationDashboardPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly eventsStore = inject(OrganizationEventsStore);
  readonly language = inject(LanguageService);

  readonly currentProfile = computed<Profile | null>(() => {
    const profile = this.socialStore.myProfile();
    if (profile) return profile;

    const user = this.authStore.user();
    if (!user) return null;
    return {
      id: user._id,
      kind: user.role === 'org' ? 'org' : 'user',
      username: user.username,
      displayName: user.name,
      bio: user.bio,
      city: user.location,
      isPrivate: user.isPrivate,
      createdAt: new Date(user.createdAt).getTime(),
    };
  });

  readonly currentProfileId = computed(
    () => this.currentProfile()?.id ?? this.authStore.user()?._id ?? null,
  );
  readonly isOrganization = computed(() => this.authStore.user()?.role === 'org');
  readonly events = computed(() => this.eventsStore.events());
  readonly posts = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.postsBy(profileId) : [];
  });
  readonly followers = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.followersOf(profileId) : [];
  });

  readonly summary = computed(() => {
    const events = this.events();
    const posts = this.posts();
    const now = Date.now();
    const totalLikes = posts.reduce((total, post) => total + post.likeCount, 0);
    const attendees = events.reduce(
      (total, event) => total + event.attendeesCount,
      0,
    );

    return {
      followers: this.followers().length,
      events: events.length,
      publicEvents: events.filter((event) => event.visibility === 'public').length,
      privateEvents: events.filter((event) => event.visibility === 'private').length,
      attendees,
      activeEvents: events.filter(
        (event) => event.isActive && new Date(event.endDate).getTime() >= now,
      ).length,
      upcomingEvents: events.filter(
        (event) => event.isActive && new Date(event.startDate).getTime() > now,
      ).length,
      posts: posts.length,
      totalLikes,
      averageLikes: posts.length ? Math.round((totalLikes / posts.length) * 10) / 10 : 0,
    };
  });

  readonly monthlyActivity = computed(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: this.language.formatDate(date, { month: 'short' }),
        start: date.getTime(),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 1).getTime(),
        events: 0,
        posts: 0,
      };
    });

    for (const event of this.events()) {
      const timestamp = event.createdAt ? new Date(event.createdAt).getTime() : Number.NaN;
      const month = months.find((item) => timestamp >= item.start && timestamp < item.end);
      if (month) month.events += 1;
    }

    for (const post of this.posts()) {
      const month = months.find(
        (item) => post.createdAt >= item.start && post.createdAt < item.end,
      );
      if (month) month.posts += 1;
    }

    const maximum = Math.max(1, ...months.flatMap((month) => [month.events, month.posts]));
    return months.map((month) => ({
      ...month,
      eventHeight: month.events ? Math.max(10, (month.events / maximum) * 100) : 0,
      postHeight: month.posts ? Math.max(10, (month.posts / maximum) * 100) : 0,
    }));
  });

  readonly statusBreakdown = computed(() => {
    const statuses: Array<{
      key: DashboardEventStatus;
      label: string;
      color: string;
    }> = [
      { key: 'ongoing', label: this.language.text('جارية الآن', 'Ongoing'), color: '#10b981' },
      { key: 'upcoming', label: this.language.text('قادمة', 'Upcoming'), color: '#7c3aed' },
      { key: 'ended', label: this.language.text('انتهت', 'Ended'), color: '#64748b' },
      { key: 'inactive', label: this.language.text('موقوفة', 'Inactive'), color: '#f59e0b' },
    ];
    const total = Math.max(1, this.events().length);

    return statuses.map((status) => {
      const count = this.events().filter(
        (event) => this.eventStatus(event) === status.key,
      ).length;
      return { ...status, count, percentage: Math.round((count / total) * 100) };
    });
  });

  readonly categoryBreakdown = computed(() => {
    const counts = new Map<EventCategory, number>();
    for (const event of this.events()) {
      counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    }
    const total = Math.max(1, this.events().length);

    return [...counts.entries()]
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  });

  readonly recentEvents = computed(() =>
    [...this.events()]
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )
      .slice(0, 5),
  );

  readonly topPosts = computed(() =>
    [...this.posts()]
      .sort((a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt)
      .slice(0, 4),
  );

  readonly isLoading = computed(
    () =>
      this.eventsStore.loading() ||
      (this.socialStore.postsLoading() && !this.socialStore.loaded()),
  );

  refresh(): void {
    this.eventsStore.loadAll();
    this.socialStore.loadAll();
    this.socialStore.loadFollowData();
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  eventStatus(event: OrganizationEvent): DashboardEventStatus {
    if (!event.isActive) return 'inactive';
    const now = Date.now();
    if (new Date(event.endDate).getTime() < now) return 'ended';
    if (new Date(event.startDate).getTime() <= now) return 'ongoing';
    return 'upcoming';
  }

  statusLabel(status: DashboardEventStatus): string {
    const labels: Record<DashboardEventStatus, string> = {
      inactive: this.language.text('موقوفة', 'Inactive'),
      expired: this.language.text('انتهت', 'Ended'),
      ended: this.language.text('انتهت', 'Ended'),
      upcoming: this.language.text('قادمة', 'Upcoming'),
      ongoing: this.language.text('جارية', 'Ongoing'),
    };
    return labels[status];
  }

  statusClasses(status: DashboardEventStatus): string {
    if (status === 'ongoing') {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    }
    if (status === 'upcoming') {
      return 'border-brand/30 bg-brand/10 text-brand';
    }
    if (status === 'inactive') {
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    }
    return 'border-ink-border bg-ink text-ink-muted';
  }

  categoryLabel(category: EventCategory): string {
    const labels: Record<EventCategory, string> = {
      music: this.language.text('موسيقى', 'Music'),
      sports: this.language.text('رياضة', 'Sports'),
      education: this.language.text('تعليم', 'Education'),
      technology: this.language.text('تقنية', 'Technology'),
      photography: this.language.text('تصوير', 'Photography'),
      art: this.language.text('فن', 'Art'),
      other: this.language.text('أخرى', 'Other'),
    };
    return labels[category];
  }

  locationLabel(event: OrganizationEvent): string {
    return (
      event.location?.addressName ||
      event.location?.fullAddress ||
      this.language.text('الموقع غير محدد', 'Location not specified')
    );
  }

  visibilityLabel(event: OrganizationEvent): string {
    return event.visibility === 'private'
      ? this.language.text('للمتابعين', 'Followers only')
      : this.language.text('عامة', 'Public');
  }
}
