import { TranslatePipe } from '@ngx-translate/core';
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';
import { Profile } from '../../../user/social/services/social.service';
import { SocialStore } from '../../../user/social/social.store';
import { PendingRequest } from '../../../user/social/services/follow.service';
import { LanguageService } from '../../../../core/services/language.service';

type CommunityTab = 'followers' | 'following' | 'requests';

@Component({
  selector: 'app-organization-followers-page',
  standalone: true,
  imports: [TranslatePipe, CommonModule, FormsModule, RouterLink],
  templateUrl: './followers-page.component.html',
})
export class OrganizationFollowersPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  readonly language = inject(LanguageService);

  readonly tab = signal<CommunityTab>('followers');
  readonly query = signal('');

  readonly currentProfileId = computed(() => {
    const socialProfile = this.socialStore.myProfile();
    if (socialProfile) return socialProfile.id;
    return this.authStore.user()?._id ?? null;
  });

  readonly followers = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.followersOf(profileId) : [];
  });

  readonly following = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.followingOf(profileId) : [];
  });

  readonly requests = computed(() => {
    const profileId = this.currentProfileId();
    return profileId ? this.socialStore.pendingRequestsFor(profileId) : [];
  });

  readonly followersProfiles = computed(() =>
    this.followers()
      .map((item) => this.socialStore.findProfile({ id: item.follower._id }))
      .filter((profile): profile is Profile => !!profile)
  );

  readonly followingProfiles = computed(() =>
    this.following()
      .map((item) => {
        const user = typeof item.following === 'object' ? item.following : null;
        return user ? this.socialStore.findProfile({ id: user._id }) : null;
      })
      .filter((profile): profile is Profile => !!profile)
  );

  readonly visiblePeople = computed(() => {
    const source = this.tab() === 'followers' ? this.followersProfiles() : this.followingProfiles();
    const q = this.query().trim().toLowerCase();
    if (!q) return source;

    return source.filter(
      (profile) =>
        profile.displayName.toLowerCase().includes(q) || profile.username.toLowerCase().includes(q),
    );
  });

  readonly tabs = computed(
    () =>
      [
        {
          key: 'followers',
          label: this.language.text('المتابعون', 'Followers'),
          count: this.followers().length,
        },
        {
          key: 'following',
          label: this.language.text('تتابع', 'Following'),
          count: this.following().length,
        },
        {
          key: 'requests',
          label: this.language.text('طلبات', 'Requests'),
          count: this.requests().length,
        },
      ] as const,
  );

  followState(profileId: string): 'none' | 'pending' | 'accepted' {
    const me = this.currentProfileId();
    if (!me) return 'none';
    return this.socialStore.followState(me, profileId);
  }

  toggleFollow(profileId: string) {
    const me = this.currentProfileId();
    if (!me || me === profileId) return;

    if (this.followState(profileId) === 'none') {
      this.socialStore.follow(me, profileId);
      return;
    }

    this.socialStore.unfollow(me, profileId);
  }

  followLabel(profile: Profile): string {
    const state = this.followState(profile.id);
    if (state === 'accepted') return this.language.text('إلغاء المتابعة', 'Unfollow');
    if (state === 'pending') return this.language.text('إلغاء الطلب', 'Cancel request');
    return profile.isPrivate
      ? this.language.text('طلب متابعة', 'Request to follow')
      : this.language.text('متابعة', 'Follow');
  }

  requestProfile(request: PendingRequest): { displayName: string; username: string } {
    return {
      displayName: request.follower.name,
      username: request.follower.username,
    };
  }

  approve(request: PendingRequest) {
    const me = this.currentProfileId();
    if (!me) return;
    this.socialStore.approveFollow(request.follower._id, me);
  }

  deny(request: PendingRequest) {
    const me = this.currentProfileId();
    if (!me) return;
    this.socialStore.denyFollow(request.follower._id, me);
  }
}
