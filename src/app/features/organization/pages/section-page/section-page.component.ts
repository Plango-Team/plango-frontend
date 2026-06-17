import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { OrganizationEvent } from '../../services/organization-events.service';
import { OrganizationEventsStore } from '../../stores/organization-events.store';

@Component({
  selector: 'app-organization-section-page',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './section-page.component.html',
})
export class OrganizationSectionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly eventsStore = inject(OrganizationEventsStore);

  readonly currentProfileId = computed(() => this.auth.user()?._id ?? null);
  readonly eventRows = computed(() => this.eventsStore.events().slice(0, 8));
  readonly followers = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.followersOf(profileId).slice(0, 9) : [];
  });

  get section(): string {
    return this.route.snapshot.data['section'] ?? 'section';
  }

  get title(): string {
    return this.route.snapshot.data['title'] ?? 'القسم';
  }

  get description(): string {
    return this.route.snapshot.data['description'] ?? '';
  }

  eventStatusLabel(event: OrganizationEvent): string {
    if (!event.isActive) return 'موقوفة';
    const now = Date.now();
    if (new Date(event.endDate).getTime() < now) return 'انتهت';
    if (new Date(event.startDate).getTime() <= now) return 'جارية';
    return 'قادمة';
  }

  eventLocation(event: OrganizationEvent): string {
    return event.location.addressName || event.location.fullAddress || 'الموقع غير محدد';
  }
}
