import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { authStore } from '../../../../auth/auth.store';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostComposerComponent } from '../../components/post-composer/post-composer.component';
import { SocialStore } from '../../social.store';

type TabKey = 'posts' | 'followers' | 'following';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    PostCardComponent,
    PostComposerComponent,
    IconComponent,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.css',
})
export class ProfilePageComponent {
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly socialStore = inject(SocialStore);
  readonly authStore = inject(authStore);

  readonly tab = signal<TabKey>('posts');
  readonly isEditing = signal(false);
  editForm = { displayName: '', city: '', bio: '', isPrivate: false };

  readonly username = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('username') ?? '')),
    { initialValue: '' },
  );

  readonly profile = computed(() => {
    const username = this.username();
    return username ? this.socialStore.findProfile({ username }) : null;
  });

  readonly isMe = computed(() => {
    const user = this.authStore.user();
    const profile = this.profile();
    return !!user && !!profile && (user._id === profile.id || user.username === profile.username);
  });

  readonly profileReady = computed(() => {
    const profile = this.profile();
    return !!profile && (this.isMe() || this.socialStore.isProfileLoaded(profile.id));
  });

  readonly profileLoadFailed = computed(() => {
    const profile = this.profile();
    return !!profile && this.socialStore.didProfileLoadFail(profile.id);
  });

  readonly followStatus = computed(() => {
    const user = this.authStore.user();
    const profile = this.profile();
    if (!user || !profile || this.isMe()) return 'none';
    return this.socialStore.followState(user._id, profile.id);
  });

  readonly restricted = computed(() => {
    const profile = this.profile();
    return !!profile && !this.socialStore.canViewProfileContent(profile.id);
  });

  readonly followers = computed(() => {
    const profile = this.profile();
    return profile ? this.socialStore.followersOf(profile.id) : [];
  });

  readonly following = computed(() => {
    const profile = this.profile();
    return profile ? this.socialStore.followingOf(profile.id) : [];
  });

  readonly userPosts = computed(() => {
    const profile = this.profile();
    return profile ? this.socialStore.postsBy(profile.id) : [];
  });

  readonly relationsLoading = computed(() => {
    const profile = this.profile();
    return !!profile && this.socialStore.areProfileRelationsLoading(profile.id);
  });

  readonly profileRouteBase = computed(() =>
    this.authStore.user()?.role === 'org' ? '/organization/profile' : '/user/profile',
  );

  readonly homeRoute = computed(() =>
    this.authStore.user()?.role === 'org' ? '/organization/dashboard' : '/user/dashboard',
  );

  readonly tabs = computed(() => {
    const profile = this.profile();
    if (!profile) return [];
    return [
      { key: 'posts' as const, label: 'المنشورات', count: this.userPosts().length },
      {
        key: 'followers' as const,
        label: 'المتابعون',
        count: this.isMe() ? this.followers().length : (profile.followersCount ?? 0),
      },
      {
        key: 'following' as const,
        label: 'يتابع',
        count: this.isMe() ? this.following().length : (profile.followingCount ?? 0),
      },
    ];
  });

  readonly currentPeople = computed(() => {
    const items =
      this.tab() === 'followers'
        ? this.followers().map((item) => item.follower)
        : this.tab() === 'following'
          ? this.following().map((item) =>
              typeof item.following === 'object' ? item.following : null,
            )
          : [];

    return items
      .filter((item): item is NonNullable<typeof item> => !!item)
      .map((item) => {
        const profile = this.socialStore.findProfile({ id: item._id });
        return {
          id: item._id,
          displayName: item.name,
          username: item.username,
          isPrivate: profile?.isPrivate ?? false,
        };
      });
  });

  readonly followButtonLabel = computed(() => {
    const profile = this.profile();
    const status = this.followStatus();
    if (status === 'accepted') return 'إلغاء المتابعة';
    if (status === 'pending') return 'إلغاء الطلب';
    return profile?.isPrivate ? 'طلب متابعة' : 'متابعة';
  });

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (
        !profile ||
        this.socialStore.isProfileLoaded(profile.id) ||
        this.socialStore.isProfileLoading(profile.id) ||
        this.socialStore.didProfileLoadFail(profile.id)
      ) {
        return;
      }
      untracked(() => this.socialStore.loadProfile(profile.id));
    });
  }

  retryProfile(): void {
    const profile = this.profile();
    if (profile) this.socialStore.loadProfile(profile.id);
  }

  coverGradient(): string {
    return this.profile()?.kind === 'org'
      ? 'radial-gradient(circle at 30% 30%, hsl(var(--brand)/0.35), transparent 55%), radial-gradient(circle at 80% 70%, hsl(var(--brand)/0.18), transparent 55%)'
      : 'radial-gradient(circle at 30% 30%, hsl(var(--ink-fg)/0.18), transparent 55%), radial-gradient(circle at 80% 70%, hsl(var(--ink-fg)/0.08), transparent 55%)';
  }

  initials(value: string): string {
    return value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  goBack(): void {
    void this.router.navigate([this.homeRoute()]);
  }

  toggleFollow(): void {
    const user = this.authStore.user();
    const profile = this.profile();
    if (!user || !profile) return;
    if (this.followStatus() === 'none') {
      this.socialStore.follow(user._id, profile.id);
    } else {
      this.socialStore.unfollow(user._id, profile.id);
    }
  }

  openEdit(): void {
    const profile = this.profile();
    if (!profile) return;
    this.editForm = {
      displayName: profile.displayName,
      city: profile.city ?? '',
      bio: profile.bio ?? '',
      isPrivate: profile.isPrivate,
    };
    this.isEditing.set(true);
  }

  saveEdit(): void {
    const profile = this.profile();
    const displayName = this.editForm.displayName.trim();
    if (!profile || !displayName) return;

    this.socialStore.updateProfile({
      ...profile,
      displayName,
      city: this.editForm.city.trim() || undefined,
      bio: this.editForm.bio.trim() || undefined,
      isPrivate: this.editForm.isPrivate,
    });
    this.isEditing.set(false);
  }
}
