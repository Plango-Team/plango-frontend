import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SocialStore } from '../../social.store';
import { authStore } from '../../../../auth/auth.store';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostComposerComponent } from '../../components/post-composer/post-composer.component';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PostCardComponent, PostComposerComponent, IconComponent],
  template: `
    <div class="mb-6 px-4 mt-4 sm:px-6 lg:px-8">
      <h1 class="font-display text-2xl tracking-tight sm:text-3xl text-ink-fg">
        خلاصتك
      </h1>
      <p class="text-sm text-ink-muted">
        آخر التحديثات من الأشخاص والمؤسسات الذين تتابعهم.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-12 px-4 pb-10 sm:px-6 lg:px-8">
      <section class="flex flex-col gap-4 lg:col-span-8">
        <app-post-composer></app-post-composer>
        
        @if (posts().length === 0) {
          <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-border p-12 text-center">
            <app-icon iconName="SparklesIcon" [iconSize]="24" iconColor="var(--color-brand)"></app-icon>
            <h3 class="mt-4 font-display text-lg text-ink-fg">
              خلاصتك فارغة
            </h3>
            <p class="mt-2 text-sm text-ink-muted max-w-sm">
              تابع مؤسسات وأصدقاء لترى منشوراتهم وفعالياتهم هنا.
            </p>
            <a
              routerLink="/user/network"
              class="mt-6 rounded-full bg-brand px-4 py-2 text-xs font-medium text-brand-foreground hover:bg-brand/90"
            >
              اكتشف الشبكة
            </a>
          </div>
        } @else {
          @for (p of posts(); track $index) {
            <app-post-card [post]="p"></app-post-card>
          }
        }
      </section>

      <aside class="space-y-4 lg:col-span-4">
        <!-- Upcoming Events -->
        <div class="rounded-2xl border border-ink-border bg-ink-2 p-4">
          <div class="mb-3 flex items-center gap-2 text-sm font-medium text-ink-fg">
            <app-icon iconName="Calendar01Icon" [iconSize]="16" iconColor="var(--color-brand)"></app-icon>
            فعاليات قادمة لمتابعينك
          </div>
          <p class="text-xs text-ink-muted">لا فعاليات قادمة حالياً.</p>
        </div>

        <!-- Suggested Orgs -->
        <div class="rounded-2xl border border-ink-border bg-ink-2 p-4">
          <div class="mb-3 flex items-center gap-2 text-sm font-medium text-ink-fg">
            <app-icon iconName="UserGroupIcon" [iconSize]="16" iconColor="var(--color-brand)"></app-icon>
            مؤسسات مقترحة
          </div>
          <div class="space-y-2">
            @for (org of suggestedOrgs(); track $index) {
              <a
                [routerLink]="['/user/profile', org.username]"
                class="flex items-center gap-3 rounded-xl border border-ink-border bg-ink p-2 text-xs hover:bg-ink-3 transition-colors"
              >
                <div class="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
                  {{ org.displayName[0] }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-ink-fg">
                    {{ org.displayName }}
                  </div>
                  <div class="truncate text-ink-muted">&#64;{{ org.username }}</div>
                </div>
              </a>
            }
            @if (suggestedOrgs().length === 0) {
              <p class="text-xs text-ink-muted py-2">لا توجد اقتراحات حالياً</p>
            }
          </div>
        </div>
      </aside>
    </div>
  `,
})
export class FeedPageComponent {
  socialStore = inject(SocialStore);
  authStore = inject(authStore);

  posts = computed(() => {
    const user = this.authStore.user();
    return this.socialStore.feedFor(user?._id ?? null);
  });

  followingIds = computed(() => {
    const user = this.authStore.user();
    if (!user) return new Set<string>();
    return new Set(this.socialStore.followingOf(user._id).map(f => f.followeeId));
  });

  suggestedOrgs = computed(() => {
    const user = this.authStore.user();
    const followed = this.followingIds();
    return this.socialStore.profiles()
      .filter(p => p.kind === 'org' && !followed.has(p.id) && p.id !== user?._id)
      .slice(0, 4);
  });
}
