import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { PostComposerComponent } from '../../../user/social/components/post-composer/post-composer.component';
import { PostCardComponent } from '../../../user/social/components/post-card/post-card.component';
import { Profile } from '../../../user/social/services/social.service';
import {
  AttendanceStatus,
  OrganizationAttendance,
  OrganizationEvent,
} from '../../services/organization-events.service';
import { OrganizationEventsStore } from '../../stores/organization-events.store';

type StatusMeta = { label: string; chipClass: string; barClass: string };

@Component({
  selector: 'app-organization-dashboard-page',
  standalone: true,
  imports: [RouterLink, PostComposerComponent, PostCardComponent],
  templateUrl: './dashboard-page.component.html',
})
export class OrganizationDashboardPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly organizationEventsStore = inject(OrganizationEventsStore);

  readonly statusMeta: Record<AttendanceStatus, StatusMeta> = {
    confirmed: {
      label: 'مؤكد',
      chipClass: 'border-ink-border bg-ink-3 text-ink-fg',
      barClass: 'bg-ink-fg/70',
    },
    en_route: {
      label: 'في الطريق',
      chipClass: 'border-brand/40 bg-brand/10 text-brand',
      barClass: 'bg-brand',
    },
    arrived: {
      label: 'وصل',
      chipClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      barClass: 'bg-emerald-500',
    },
    at_risk: {
      label: 'متأخر محتمل',
      chipClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      barClass: 'bg-amber-500',
    },
    declined: {
      label: 'اعتذر',
      chipClass: 'border-ink-border bg-ink text-ink-muted',
      barClass: 'bg-ink-3',
    },
  };

  readonly currentProfile = computed<Profile | null>(() => {
    const fromSocial = this.socialStore.myProfile();
    if (fromSocial) return fromSocial;

    const user = this.authStore.user();
    if (!user) return null;

    return {
      id: user.id,
      kind: user.accountType === 'organization' ? 'org' : 'user',
      username: user.userName,
      displayName: user.displayName?.trim() || `${user.firstName} ${user.lastName}`.trim(),
      bio: user.bio,
      privateFollows: user.privateFollows,
      createdAt: this.asEpoch(user.createdAt),
    };
  });

  readonly isOrganization = computed(() => this.authStore.user()?.accountType === 'organization');

  readonly orgEvents = computed(() => {
    const profile = this.currentProfile();
    if (!profile) return [];

    return this.organizationEventsStore
      .eventsForOwner(profile.id)
      .sort((a, b) => this.eventTimestamp(b) - this.eventTimestamp(a));
  });

  readonly allAttendances = computed(() => {
    const ids = new Set(this.orgEvents().map((event) => event.id).filter(Boolean) as string[]);

    return this.organizationEventsStore
      .attendances()
      .filter((attendance) => ids.has(attendance.eventId));
  });

  readonly followers = computed(() => {
    const profile = this.currentProfile();
    return profile ? this.socialStore.followersOf(profile.id) : [];
  });

  readonly ownPosts = computed(() => {
    const profile = this.currentProfile();
    return profile ? this.socialStore.postsBy(profile.id) : [];
  });

  readonly totalLikes = computed(() =>
    this.ownPosts().reduce((sum, post) => sum + post.likes.length, 0),
  );

  readonly topPosts = computed(() =>
    [...this.ownPosts()].sort((a, b) => b.likes.length - a.likes.length).slice(0, 3),
  );

  readonly totalRsvps = computed(() => this.allAttendances().length);

  readonly onTrackCount = computed(() =>
    this.allAttendances().filter((attendance) => {
      const status = this.organizationEventsStore.liveStatus(attendance);
      return status === 'confirmed' || status === 'en_route' || status === 'arrived';
    }).length,
  );

  readonly onTrackPercent = computed(() => {
    const total = this.totalRsvps();
    return total ? Math.round((this.onTrackCount() / total) * 100) : 0;
  });

  readonly attendanceBreakdown = computed(() => {
    const total = this.totalRsvps();
    const statuses: AttendanceStatus[] = ['confirmed', 'en_route', 'arrived', 'at_risk', 'declined'];

    return statuses.map((status) => {
      const count = this.allAttendances().filter(
        (attendance) => this.organizationEventsStore.liveStatus(attendance) === status,
      ).length;

      return {
        status,
        count,
        percent: total ? (count / total) * 100 : 0,
      };
    });
  });

  readonly upcomingEvents = computed(() => {
    const now = Date.now();

    return this.orgEvents()
      .map((event) => ({ event, ts: this.eventTimestamp(event) }))
      .filter((item) => item.ts >= now - 6 * 60 * 60 * 1000)
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 4)
      .map((item) => item.event);
  });

  readonly recentFollowers = computed(() => {
    const sorted = [...this.followers()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

    return sorted
      .map((edge) => this.socialStore.findProfile({ id: edge.followerId }))
      .filter((profile): profile is Profile => !!profile);
  });

  readonly topVenues = computed(() => {
    const counts = this.orgEvents().reduce(
      (map, event) => map.set(event.place, (map.get(event.place) ?? 0) + 1),
      new Map<string, number>(),
    );

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  });

  readonly growthSeries = computed(() => {
    const followersCount = this.followers().length;
    return Array.from({ length: 7 }, (_, i) => {
      const base = Math.max(0, followersCount - (6 - i));
      const jitter = (i * 7 + followersCount) % 4;
      return base + jitter;
    });
  });

  readonly growthMax = computed(() => Math.max(1, ...this.growthSeries()));
  readonly weekDelta = computed(() => this.growthSeries()[6] - this.growthSeries()[0]);

  attendeesFor(eventId: string): OrganizationAttendance[] {
    return this.organizationEventsStore
      .attendancesForEvent(eventId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  attendeeName(attendeeId: string): string {
    const profile = this.socialStore.findProfile({ id: attendeeId });
    return profile?.displayName ?? attendeeId;
  }

  attendeeUsername(attendeeId: string): string | null {
    const profile = this.socialStore.findProfile({ id: attendeeId });
    return profile?.username ?? null;
  }

  liveStatus(attendance: OrganizationAttendance): AttendanceStatus {
    return this.organizationEventsStore.liveStatus(attendance);
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

  private eventTimestamp(event: OrganizationEvent): number {
    const ts = new Date(`${event.date}T${event.time}:00`).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  }

  private asEpoch(value: unknown): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') {
      const ts = new Date(value).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    return Date.now();
  }
}

