import { Component, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SocialStore } from '../../social.store';
import { authStore } from '../../../../auth/auth.store';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostComposerComponent } from '../../components/post-composer/post-composer.component';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { EventsStore } from '../../../events/events.store';
import { IEvent } from '../../../events/interfaces/Ievents';

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterModule,
    PostCardComponent,
    PostComposerComponent,
    IconComponent,
  ],
  template: `
    <div class="mb-6 px-4 mt-4 sm:px-6 lg:px-8">
      <h1 class="font-display text-2xl tracking-tight sm:text-3xl text-ink-fg">
        آخر المنشورات
      </h1>
      <p class="text-sm text-ink-muted">
        آخر التحديثات من مجتمع PlanGo.
      </p>
    </div>

    <div class="grid gap-6 lg:grid-cols-12 px-4 pb-10 sm:px-6 lg:px-8">
      <section class="flex flex-col gap-4 lg:col-span-8">
        <app-post-composer></app-post-composer>

        @if (socialStore.postsLoading()) {
          @for (item of [1, 2, 3]; track item) {
            <div class="h-36 animate-pulse rounded-2xl border border-ink-border bg-ink-2"></div>
          }
        } @else if (socialStore.postsError() && posts().length === 0) {
          <div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p class="text-sm text-red-300">{{ socialStore.postsError() }}</p>
            <button
              type="button"
              (click)="socialStore.loadAll()"
              class="mt-4 rounded-full border border-red-400/40 px-4 py-2 text-xs text-red-200"
            >
              إعادة المحاولة
            </button>
          </div>
        } @else if (posts().length === 0) {
          <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-border p-12 text-center">
            <app-icon iconName="SparklesIcon" [iconSize]="24" iconColor="var(--color-brand)"></app-icon>
            <h3 class="mt-4 font-display text-lg text-ink-fg">
              لا توجد منشورات بعد
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
          @for (p of posts(); track p.id) {
            <app-post-card [post]="p"></app-post-card>
          }
          @if (socialStore.hasMorePosts()) {
            <button
              type="button"
              (click)="socialStore.loadMorePosts()"
              [disabled]="socialStore.postsLoadingMore()"
              class="mx-auto rounded-full border border-ink-border bg-ink-2 px-5 py-2 text-xs font-medium text-ink-fg hover:bg-ink-3 disabled:opacity-50"
            >
              {{ socialStore.postsLoadingMore() ? 'جارٍ التحميل...' : 'تحميل منشورات أقدم' }}
            </button>
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
          @if (upcomingEvents().length === 0) {
            <p class="text-xs text-ink-muted">لا فعاليات قادمة حالياً.</p>
          } @else {
            <div class="space-y-2">
              @for (event of upcomingEvents(); track event._id) {
                <a
                  routerLink="/user/events"
                  class="block rounded-xl border border-ink-border bg-ink p-3 hover:bg-ink-3"
                >
                  <div class="line-clamp-1 text-xs font-medium text-ink-fg">
                    {{ event.title }}
                  </div>
                  <div class="mt-1 text-[11px] text-ink-muted">
                    {{ event.startDate | date: 'd MMM، h:mm a' }} · {{ companyName(event) }}
                  </div>
                </a>
              }
            </div>
          }
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
  eventsStore = inject(EventsStore);

  posts = computed(() => {
    const user = this.authStore.user();
    return this.socialStore.feedFor(user?._id ?? null);
  });

  followingIds = computed(() => {
    const user = this.authStore.user();
    if (!user) return new Set<string>();
    return new Set(this.socialStore.followingOf(user._id).map(f =>
      typeof f.following === 'object' ? f.following._id : String(f.following)
    ));
  });

  suggestedOrgs = computed(() => {
    const user = this.authStore.user();
    const followed = this.followingIds();
    return this.socialStore.profiles()
      .filter(p => p.kind === 'org' && !followed.has(p.id) && p.id !== user?._id)
      .slice(0, 4);
  });

  upcomingEvents = computed(() =>
    this.eventsStore
      .events()
      .filter((event) => new Date(event.endDate).getTime() >= Date.now())
      .slice(0, 3),
  );

  companyName(event: IEvent): string {
    return typeof event.companyId === 'string' ? 'مؤسسة PlanGo' : event.companyId.name;
  }
}
