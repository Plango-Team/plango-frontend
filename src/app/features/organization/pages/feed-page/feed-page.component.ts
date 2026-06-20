import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { PostComposerComponent } from '../../../user/social/components/post-composer/post-composer.component';
import { PostCardComponent } from '../../../user/social/components/post-card/post-card.component';
import { EventsStore } from '../../../user/events/events.store';
import { IEvent } from '../../../user/events/interfaces/Ievents';

@Component({
  selector: 'app-organization-feed-page',
  standalone: true,
  imports: [RouterLink, DatePipe, PostComposerComponent, PostCardComponent],
  templateUrl: './feed-page.component.html',
})
export class OrganizationFeedPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly eventsStore = inject(EventsStore);

  readonly currentProfileId = computed(() => {
    const socialProfile = this.socialStore.myProfile();
    if (socialProfile) return socialProfile.id;
    return this.authStore.user()?._id ?? null;
  });

  readonly followingIds = computed(() => {
    const profileId = this.currentProfileId();
    if (!profileId) return new Set<string>();
    return new Set(this.socialStore.followingOf(profileId).map((item) =>
      typeof item.following === 'object' ? item.following._id : String(item.following)
    ));
  });

  readonly ownPosts = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.postsBy(profileId) : [];
  });

  readonly communityPosts = computed(() => {
    const profileId = this.currentProfileId();
    if (!profileId) return [];

    const followed = this.followingIds();
    return this.socialStore
      .feedFor(profileId)
      .filter((post) => post.authorId !== profileId && followed.has(post.authorId))
      .sort((a, b) => b.createdAt - a.createdAt);
  });

  readonly totalLikes = computed(() =>
    this.ownPosts().reduce((sum, post) => sum + post.likeCount, 0),
  );

  readonly upcomingFromNetwork = computed(() => {
    const followed = this.followingIds();

    return this.eventsStore
      .events()
      .filter((event) => {
        const ownerId =
          typeof event.companyId === 'string' ? event.companyId : event.companyId._id;
        return followed.has(ownerId) && new Date(event.endDate).getTime() >= Date.now();
      })
      .sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )
      .slice(0, 4);
  });

  ownerDisplayName(event: IEvent): string {
    if (typeof event.companyId !== 'string') return event.companyId.name;
    return this.socialStore.findProfile({ id: event.companyId })?.displayName ?? 'مؤسسة';
  }

  ownerUsername(event: IEvent): string | null {
    if (typeof event.companyId !== 'string' && event.companyId.username) {
      return event.companyId.username;
    }
    const ownerId = typeof event.companyId === 'string' ? event.companyId : event.companyId._id;
    return this.socialStore.findProfile({ id: ownerId })?.username ?? null;
  }

  locationLabel(event: IEvent): string {
    return event.location?.addressName || event.location?.fullAddress || 'الموقع غير محدد';
  }
}
