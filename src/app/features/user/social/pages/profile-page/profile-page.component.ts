import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SocialStore } from '../../social.store';
import { authStore } from '../../../../auth/auth.store';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostComposerComponent } from '../../components/post-composer/post-composer.component';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { FormsModule } from '@angular/forms';

type TabKey = 'posts' | 'events' | 'followers' | 'following';

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
  template: `
    <div class="px-4 py-6 sm:px-6 lg:px-8">
      @if (!profile()) {
      <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-border p-12 text-center mt-10">
        <h3 class="font-display text-lg text-ink-fg">هذا الحساب غير موجود</h3>
        <p class="mt-2 text-sm text-ink-muted">&#64;{{ username() }}</p>
        <button
          (click)="goBack()"
          class="mt-6 rounded-lg border border-ink-border bg-ink-2 px-4 py-2 text-sm hover:bg-ink-3 text-ink-fg"
        >
          العودة للوحة التحكم
        </button>
      </div>
    } @else {
      <!-- Cover -->
      <div
        class="relative -mx-4 -mt-4 h-40 sm:-mx-6 sm:-mt-6 sm:h-56 lg:-mx-8 lg:-mt-8"
        [style.backgroundImage]="coverGradient()"
      ></div>

      <div class="-mt-14 flex flex-col items-start gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
        <div class="flex items-end gap-4">
          <div class="rounded-full border-4 border-ink p-0 bg-ink-2">
            <div class="grid h-24 w-24 place-items-center rounded-full text-3xl font-semibold text-ink-fg">
              {{ initials(profile()!.displayName) }}
            </div>
          </div>
          <div class="pb-1">
            <div class="flex items-center gap-2">
              <h1 class="font-display text-2xl tracking-tight text-ink-fg sm:text-3xl">
                {{ profile()!.displayName }}
              </h1>
              @if (profile()!.kind === 'org') {
                <span class="inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                  <app-icon iconName="Building02Icon" [iconSize]="12" iconColor="currentColor"></app-icon>
                  مؤسسة
                </span>
              } @else {
                <span class="inline-flex items-center gap-1 rounded-full border border-ink-border bg-ink-2 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                  <app-icon iconName="UserIcon" [iconSize]="12" iconColor="currentColor"></app-icon>
                  شخصي
                </span>
              }
              @if (profile()!.privateFollows) {
                <app-icon iconName="LockPasswordIcon" [iconSize]="14" iconColor="var(--color-ink-muted)"></app-icon>
              }
            </div>
            <div class="mt-0.5 text-sm text-ink-muted">&#64;{{ profile()!.username }}</div>
            @if (profile()!.city) {
              <div class="mt-1 inline-flex items-center gap-1 text-xs text-ink-muted">
                <app-icon iconName="Location01Icon" [iconSize]="12" iconColor="currentColor"></app-icon> {{ profile()!.city }}
              </div>
            }
          </div>
        </div>
        <div class="flex items-center gap-2">
          @if (isMe()) {
            @if (!isEditing()) {
              <button
                (click)="openEdit()"
                class="rounded-lg border border-ink-border bg-ink-2 px-4 py-2 text-sm font-medium text-ink-fg hover:bg-ink-3 transition"
              >
                تعديل الملف الشخصي
              </button>
            } @else {
              <div class="flex items-center gap-2">
                <button
                  (click)="isEditing.set(false)"
                  class="rounded-lg px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink-fg transition"
                >
                  إلغاء
                </button>
                <button
                  (click)="saveEdit()"
                  class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90 transition"
                >
                  حفظ
                </button>
              </div>
            }
          }
          @if (!isMe()) {
            <button
              (click)="toggleFollow()"
              class="rounded-lg px-4 py-2 text-sm font-medium transition"
              [ngClass]="followStatus() === 'none' ? 'bg-brand text-brand-foreground hover:bg-brand/90' : 'border border-ink-border bg-ink-2 text-ink-fg hover:bg-ink-3'"
            >
              @if (followStatus() === 'none') {
                متابعة
              } @else if (followStatus() === 'pending') {
                قيد الانتظار
              } @else {
                إلغاء المتابعة
              }
            </button>
          }
        </div>
      </div>

      @if (isEditing()) {
        <div class="mt-6 space-y-4 max-w-2xl">
          <div>
            <label class="block text-sm font-medium text-ink-fg mb-1">الاسم</label>
            <input type="text" [(ngModel)]="editForm.displayName" class="w-full rounded-lg border border-ink-border bg-ink px-3 py-2 text-sm text-ink-fg focus:border-brand focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-fg mb-1">المدينة</label>
            <input type="text" [(ngModel)]="editForm.city" class="w-full rounded-lg border border-ink-border bg-ink px-3 py-2 text-sm text-ink-fg focus:border-brand focus:outline-none" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-fg mb-1">النبذة</label>
            <textarea [(ngModel)]="editForm.bio" rows="3" class="w-full rounded-lg border border-ink-border bg-ink px-3 py-2 text-sm text-ink-fg focus:border-brand focus:outline-none"></textarea>
          </div>
        </div>
      } @else {
        @if (profile()!.bio) {
          <p class="mt-4 max-w-2xl text-sm text-ink-fg/90">{{ profile()!.bio }}</p>
        }
      }

      @if (isPrivateAndNotFollowing()) {
        <div class="mt-10 grid place-items-center rounded-2xl border border-ink-border bg-ink-2 p-10 text-center">
          <app-icon iconName="LockPasswordIcon" [iconSize]="40" iconColor="var(--color-ink-muted)"></app-icon>
          <div class="mt-4 font-display text-lg text-ink-fg">
            هذا الحساب خاص
          </div>
          <p class="mt-1 max-w-sm text-sm text-ink-muted">
            اطلب متابعته لمشاهدة فعالياته ونشاطه.
          </p>
        </div>
      } @else {
        <!-- Tabs -->
        <div class="mt-6 flex gap-2 overflow-x-auto border-b border-ink-border">
          @for (tb of tabs(); track $index) {
            <button
              (click)="tab.set(tb.key)"
              class="shrink-0 border-b-2 px-3 py-2 text-sm transition"
              [ngClass]="
                tab() === tb.key
                  ? 'border-brand text-ink-fg'
                  : 'border-transparent text-ink-muted hover:text-ink-fg'
              "
            >
              {{ tb.label }} <span class="text-xs tabular-nums text-ink-muted">{{ tb.count }}</span>
            </button>
          }
        </div>

        <div class="mt-5">
          @if (tab() === 'posts') {
            <div class="grid gap-4 lg:grid-cols-2">
              @if (isMe()) {
                <div class="lg:col-span-2">
                  <app-post-composer></app-post-composer>
                </div>
              }
              @if (userPosts().length === 0) {
                <div class="lg:col-span-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-border p-12 text-center">
                  <h3 class="font-display text-lg text-ink-fg">لا منشورات بعد</h3>
                  <p class="mt-2 text-sm text-ink-muted">
                    {{ isMe() ? 'ابدأ مشاركة أفكارك مع متابعينك.' : 'لم ينشر هذا الحساب أي شيء بعد.' }}
                  </p>
                </div>
              } @else {
                @for (p of userPosts(); track $index) {
                  <app-post-card [post]="p"></app-post-card>
                }
              }
            </div>
          }

          @if (tab() === 'followers' || tab() === 'following') {
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (p of currentPeople(); track $index) {
                <div class="flex items-center justify-between gap-2 rounded-2xl border border-ink-border bg-ink-2 p-2">
                  <a [routerLink]="[profileRouteBase(), p.username]" class="flex items-center gap-2 overflow-hidden hover:opacity-80 transition-opacity">
                    <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-3 text-sm font-semibold text-ink-fg">
                      {{ initials(p.displayName) }}
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-sm font-medium text-ink-fg leading-tight">{{ p.displayName }}</div>
                      <div class="truncate text-xs text-ink-muted leading-tight">&#64;{{ p.username }}</div>
                    </div>
                  </a>
                </div>
              }
            </div>
            @if (currentPeople().length === 0) {
              <div class="flex justify-center p-10 text-sm text-ink-muted">
                لا يوجد أحد بعد
              </div>
            }
          }
        </div>
      }
    }
    </div>
  `,
})
export class ProfilePageComponent {
  route = inject(ActivatedRoute);
  router = inject(Router);
  socialStore = inject(SocialStore);
  authStore = inject(authStore);

  tab = signal<TabKey>('posts');
  isEditing = signal(false);
  editForm = { displayName: '', city: '', bio: '' };

  username = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('username') ?? '')),
    { initialValue: '' },
  );

  profile = computed(() => {
    const un = this.username();
    if (!un) return null;
    return this.socialStore.findProfile({ username: un });
  });

  isMe = computed(() => {
    const user = this.authStore.user();
    const p = this.profile();
    return user && p ? user.id === p.id || user.userName === p.username : false;
  });

  followStatus = computed(() => {
    const user = this.authStore.user();
    const p = this.profile();
    if (!user || !p || this.isMe()) return 'none';
    return this.socialStore.followState(user.id, p.id);
  });

  isPrivateAndNotFollowing = computed(() => {
    const p = this.profile();
    if (!p) return false;
    return (
      p.kind === 'user' && p.privateFollows && !this.isMe() && this.followStatus() !== 'approved'
    );
  });

  followers = computed(() => {
    const p = this.profile();
    return p ? this.socialStore.followersOf(p.id) : [];
  });

  following = computed(() => {
    const p = this.profile();
    return p ? this.socialStore.followingOf(p.id) : [];
  });

  userPosts = computed(() => {
    const p = this.profile();
    return p ? this.socialStore.postsBy(p.id) : [];
  });

  profileRouteBase = computed(() => '/user/profile');

  homeRoute = computed(() =>
    this.authStore.user()?.accountType === 'organization'
      ? '/organization/dashboard'
      : '/user/dashboard',
  );

  tabs = computed(() => {
    const p = this.profile();
    if (!p) return [];
    return [
      { key: 'posts' as TabKey, label: 'المنشورات', count: this.userPosts().length },
      { key: 'followers' as TabKey, label: 'المتابعون', count: this.followers().length },
      { key: 'following' as TabKey, label: 'يتابع', count: this.following().length },
    ];
  });

  currentPeople = computed(() => {
    const t = this.tab();
    const list = t === 'followers' ? this.followers() : this.following();
    return list
      .map((f) => this.socialStore.getAuthor(t === 'followers' ? f.followerId : f.followeeId))
      .filter(Boolean) as any[];
  });

  coverGradient() {
    const p = this.profile();
    if (!p) return '';
    return p.kind === 'org'
      ? 'radial-gradient(circle at 30% 30%, hsl(var(--brand)/0.35), transparent 55%), radial-gradient(circle at 80% 70%, hsl(var(--brand)/0.18), transparent 55%)'
      : 'radial-gradient(circle at 30% 30%, hsl(var(--ink-fg)/0.18), transparent 55%), radial-gradient(circle at 80% 70%, hsl(var(--ink-fg)/0.08), transparent 55%)';
  }

  initials(s: string) {
    return s
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  goBack() {
    this.router.navigate([this.homeRoute()]);
  }

  toggleFollow() {
    const user = this.authStore.user();
    const p = this.profile();
    if (!user || !p) return;
    if (this.followStatus() === 'none') {
      this.socialStore.follow(user.id, p.id);
    } else {
      this.socialStore.unfollow(user.id, p.id);
    }
  }

  openEdit() {
    const p = this.profile();
    if (p) {
      this.editForm = {
        displayName: p.displayName || '',
        city: p.city || '',
        bio: p.bio || '',
      };
      this.isEditing.set(true);
    }
  }

  saveEdit() {
    const p = this.profile();
    if (p) {
      this.socialStore.updateProfile({
        ...p,
        displayName: this.editForm.displayName,
        city: this.editForm.city,
        bio: this.editForm.bio,
      });
      this.isEditing.set(false);
    }
  }
}
