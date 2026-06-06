import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';
import { FollowEdge, Profile } from '../../../user/social/services/social.service';
import { SocialStore } from '../../../user/social/social.store';

type CommunityTab = 'followers' | 'following' | 'requests';

@Component({
  selector: 'app-organization-followers-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './followers-page.component.html',
})
export class OrganizationFollowersPageComponent {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);

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

  readonly followersProfiles = computed(() => this.edgesToProfiles(this.followers(), 'followerId'));
  readonly followingProfiles = computed(() => this.edgesToProfiles(this.following(), 'followeeId'));

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
        { key: 'followers', label: 'المتابعون', count: this.followers().length },
        { key: 'following', label: 'تتابع', count: this.following().length },
        { key: 'requests', label: 'طلبات', count: this.requests().length },
      ] as const,
  );

  followState(profileId: string): 'none' | 'pending' | 'approved' {
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

  requestProfile(edge: FollowEdge): Profile | null {
    return this.socialStore.findProfile({ id: edge.followerId });
  }

  approve(edge: FollowEdge) {
    this.socialStore.approveFollow(edge.followerId, edge.followeeId);
  }

  deny(edge: FollowEdge) {
    this.socialStore.denyFollow(edge.followerId, edge.followeeId);
  }

  private edgesToProfiles(edges: FollowEdge[], key: 'followerId' | 'followeeId'): Profile[] {
    return edges
      .map((edge) => this.socialStore.findProfile({ id: edge[key] }))
      .filter((profile): profile is Profile => !!profile);
  }
}
