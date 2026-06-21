import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, inject } from '@angular/core';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { PostComposerComponent } from '../../../user/social/components/post-composer/post-composer.component';
import { PostCardComponent } from '../../../user/social/components/post-card/post-card.component';
import { LanguageService } from '../../../../core/services/language.service';

@Component({
  selector: 'app-organization-posts-page',
  standalone: true,
  imports: [TranslatePipe, PostComposerComponent, PostCardComponent],
  templateUrl: './posts-page.component.html',
})
export class OrganizationPostsPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly language = inject(LanguageService);

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
    this.posts().reduce((sum, post) => sum + post.likeCount, 0),
  );

  readonly averageLikes = computed(() => {
    const posts = this.posts();
    if (!posts.length) return 0;
    return Math.round((this.totalLikes() / posts.length) * 10) / 10;
  });

  readonly topPosts = computed(() =>
    [...this.posts()].sort((a, b) => b.likeCount - a.likeCount).slice(0, 3),
  );
}
