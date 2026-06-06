import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Post, Profile } from '../../services/social.service';
import { SocialStore } from '../../social.store';
import { authStore } from '../../../../auth/auth.store';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  host: { class: 'block' },
  template: `
    @if (author()) {
      <article class="rounded-2xl border border-ink-border bg-ink-2 p-4 sm:p-5">
        <header class="flex items-start gap-3">
          <a [routerLink]="[profileRouteBase(), author()!.username]" class="shrink-0">
            <div
              class="grid h-11 w-11 place-items-center rounded-full font-semibold"
              [ngClass]="
                author()!.kind === 'org' ? 'bg-brand/20 text-brand' : 'bg-ink-3 text-ink-fg'
              "
            >
              {{ initials(author()!.displayName) }}
            </div>
          </a>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <a
                [routerLink]="[profileRouteBase(), author()!.username]"
                class="truncate text-sm font-semibold text-ink-fg hover:underline"
              >
                {{ author()!.displayName }}
              </a>
              @if (author()!.kind === 'org') {
                <app-icon
                  iconName="Building02Icon"
                  [iconSize]="12"
                  iconColor="var(--color-brand)"
                ></app-icon>
              } @else {
                <app-icon
                  iconName="UserIcon"
                  [iconSize]="12"
                  iconColor="var(--color-ink-muted)"
                ></app-icon>
              }
              <span class="truncate text-xs text-ink-muted">
                &#64;{{ author()!.username }} · {{ timeAgo(post().createdAt) }}
              </span>
            </div>
            <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-fg/95">
              {{ post().body }}
            </p>

            <div class="mt-3 flex items-center gap-3 text-xs text-ink-muted">
              <button
                (click)="toggleLike()"
                class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition"
                [ngClass]="
                  liked()
                    ? 'border-brand/40 bg-brand/10 text-brand'
                    : 'border-ink-border bg-ink hover:bg-ink-3 hover:text-ink-fg'
                "
              >
                <app-icon
                  iconName="FavouriteIcon"
                  [iconSize]="14"
                  [iconColor]="liked() ? 'currentColor' : 'var(--color-ink-muted)'"
                ></app-icon>
                {{ post().likes.length }}
              </button>

              @if (isMine()) {
                <button
                  (click)="deletePost()"
                  class="ms-auto inline-flex items-center gap-1 text-ink-muted hover:text-red-500"
                >
                  <app-icon
                    iconName="Delete02Icon"
                    [iconSize]="14"
                    iconColor="currentColor"
                  ></app-icon>
                  حذف
                </button>
              }
            </div>
          </div>
        </header>
      </article>
    }
  `,
})
export class PostCardComponent {
  socialStore = inject(SocialStore);
  authStore = inject(authStore);

  post = input.required<Post>();

  profileRouteBase = computed(() => '/user/profile');

  activeProfileId = computed(() => this.socialStore.myProfile()?.id ?? this.authStore.user()?.id ?? null);

  author = computed<Profile | null>(() => {
    const fromStore = this.socialStore.getAuthor(this.post().authorId);
    if (fromStore) return fromStore;

    const currentUser = this.authStore.user();
    if (currentUser && currentUser.id === this.post().authorId) {
      return {
        id: currentUser.id,
        kind: currentUser.accountType === 'organization' ? 'org' : 'user',
        username: currentUser.userName,
        displayName:
          currentUser.displayName?.trim() ||
          `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        bio: currentUser.bio,
        privateFollows: currentUser.privateFollows,
        createdAt: Date.now(),
      };
    }

    return null;
  });

  isMine = computed(() => {
    return this.activeProfileId() === this.post().authorId;
  });

  liked = computed(() => {
    const profileId = this.activeProfileId();
    return profileId ? this.post().likes.includes(profileId) : false;
  });

  initials(s: string) {
    return s
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  timeAgo(ms: number) {
    const sec = Math.floor((Date.now() - ms) / 1000);
    if (sec < 60) return 'الآن';
    const m = Math.floor(sec / 60);
    if (m < 60) return `قبل ${m} د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `قبل ${h} س`;
    const d = Math.floor(h / 24);
    return `قبل ${d} ي`;
  }

  toggleLike() {
    const profileId = this.activeProfileId();
    if (profileId) {
      this.socialStore.toggleLike(this.post().id!, profileId);
    }
  }

  deletePost() {
    if (this.isMine()) {
      this.socialStore.deletePost(this.post().id!);
    }
  }
}
