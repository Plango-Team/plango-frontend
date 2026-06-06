import { Component, computed, inject } from '@angular/core';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { PostComposerComponent } from '../../../user/social/components/post-composer/post-composer.component';
import { PostCardComponent } from '../../../user/social/components/post-card/post-card.component';

@Component({
  selector: 'app-organization-posts-page',
  standalone: true,
  imports: [PostComposerComponent, PostCardComponent],
  templateUrl: './posts-page.component.html',
})
export class OrganizationPostsPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);

  readonly currentProfileId = computed(() => {
    const socialProfile = this.socialStore.myProfile();
    if (socialProfile) return socialProfile.id;
    return this.authStore.user()?._id ?? null;
  });

  readonly posts = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.postsBy(profileId) : [];
  });

  readonly totalLikes = computed(() =>
    this.posts().reduce((sum, post) => sum + post.likes.length, 0),
  );

  readonly averageLikes = computed(() => {
    const posts = this.posts();
    if (!posts.length) return 0;
    return Math.round((this.totalLikes() / posts.length) * 10) / 10;
  });

  readonly topPosts = computed(() =>
    [...this.posts()].sort((a, b) => b.likes.length - a.likes.length).slice(0, 3),
  );
}
