import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { PostComposerComponent } from '../../../user/social/components/post-composer/post-composer.component';
import { PostCardComponent } from '../../../user/social/components/post-card/post-card.component';
import { OrganizationEventsStore } from '../../stores/organization-events.store';

@Component({
  selector: 'app-organization-feed-page',
  standalone: true,
  imports: [RouterLink, PostComposerComponent, PostCardComponent],
  templateUrl: './feed-page.component.html',
})
export class OrganizationFeedPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly organizationEventsStore = inject(OrganizationEventsStore);

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
      .posts()
      .filter((post) => post.authorId !== profileId && followed.has(post.authorId))
      .sort((a, b) => b.createdAt - a.createdAt);
  });

  readonly totalLikes = computed(() =>
    this.ownPosts().reduce((sum, post) => sum + post.likes.length, 0),
  );

  readonly upcomingFromNetwork = computed(() => {
    const followed = this.followingIds();

    return this.organizationEventsStore
      .events()
      .filter((event) => followed.has(event.ownerId))
      .sort((a, b) => this.eventTimestamp(a) - this.eventTimestamp(b))
      .slice(0, 4);
  });

  ownerDisplayName(ownerId: string): string {
    return this.socialStore.findProfile({ id: ownerId })?.displayName ?? 'مستخدم';
  }

  ownerUsername(ownerId: string): string | null {
    return this.socialStore.findProfile({ id: ownerId })?.username ?? null;
  }

  private eventTimestamp(event: { date: string; time: string }): number {
    const ts = new Date(`${event.date}T${event.time}:00`).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  }
}
