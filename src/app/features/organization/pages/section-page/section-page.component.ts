import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { OrganizationEvent } from '../../services/organization-events.service';
import { OrganizationEventsStore } from '../../stores/organization-events.store';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-organization-section-page',
  standalone: true,
  imports: [TranslatePipe, RouterLink, DatePipe],
  templateUrl: './section-page.component.html',
})
export class OrganizationSectionPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly eventsStore = inject(OrganizationEventsStore);
  private readonly language = inject(LanguageService);

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
    const title = this.route.snapshot.data['title'];
    if (title && typeof title === 'object') {
      return this.language.text(title['ar'] ?? '', title['en'] ?? '');
    }
    return title ?? this.language.text('القسم', 'Section');
  }

  get description(): string {
    return this.route.snapshot.data['description'] ?? '';
  }

  eventStatusLabel(event: OrganizationEvent): string {
    if (!event.isActive) return this.language.text('موقوفة', 'Inactive');
    const now = Date.now();
    if (new Date(event.endDate).getTime() < now) return this.language.text('انتهت', 'Ended');
    if (new Date(event.startDate).getTime() <= now) return this.language.text('جارية', 'Ongoing');
    return this.language.text('قادمة', 'Upcoming');
  }

  eventLocation(event: OrganizationEvent): string {
    return (
      event.location?.addressName ||
      event.location?.fullAddress ||
      this.language.text('الموقع غير محدد', 'Location not specified')
    );
  }
}
