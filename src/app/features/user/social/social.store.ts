import { computed, effect, inject, untracked } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Subscription, catchError, forkJoin, map, of } from 'rxjs';
import { authStore } from '../../auth/auth.store';
import { NotificationRealtimeService } from '../../../shared/services/notification-realtime.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';
import {
  FollowService,
  FollowerItem,
  FollowingItem,
  PendingRequest,
} from './services/follow.service';
import {
  FollowEdge,
  Post,
  Profile,
  SocialService,
  postFromBackend,
} from './services/social.service';

type SocialState = {
  viewerId: string | null;
  profiles: Profile[];
  posts: Post[];
  follows: FollowEdge[];
  loaded: boolean;
  postsLoading: boolean;
  postsLoadingMore: boolean;
  postsError: string | null;
  postsPage: number;
  postsPages: number;
  myFollowers: FollowerItem[];
  myFollowing: FollowingItem[];
  pendingRequests: PendingRequest[];
  sentPendingIds: string[];
  followDataLoaded: boolean;
  profileLoadingIds: string[];
  profileLoadedIds: string[];
  profileFailedIds: string[];
  relationLoadingIds: string[];
  relationLoadedIds: string[];
  profileFollowers: Record<string, FollowerItem[]>;
  profileFollowing: Record<string, FollowingItem[]>;
};

const initial: SocialState = {
  viewerId: null,
  profiles: [],
  posts: [],
  follows: [],
  loaded: false,
  postsLoading: false,
  postsLoadingMore: false,
  postsError: null,
  postsPage: 0,
  postsPages: 1,
  myFollowers: [],
  myFollowing: [],
  pendingRequests: [],
  sentPendingIds: [],
  followDataLoaded: false,
  profileLoadingIds: [],
  profileLoadedIds: [],
  profileFailedIds: [],
  relationLoadingIds: [],
  relationLoadedIds: [],
  profileFollowers: {},
  profileFollowing: {},
};

const mergePosts = (current: Post[], incoming: Post[]): Post[] => {
  const posts = new Map<string, Post>();
  for (const post of [...incoming, ...current]) {
    if (post.id && !posts.has(post.id)) posts.set(post.id, post);
  }
  return [...posts.values()].sort((a, b) => b.createdAt - a.createdAt);
};

export const SocialStore = signalStore(
  { providedIn: 'root' },
  withState(initial),

  withComputed((store) => {
    const auth = inject(authStore);

    return {
      myProfile: computed(() => {
        const user = auth.user();
        if (!user) return null;
        return (
          store
            .profiles()
            .find((profile) => profile.id === user._id || profile.username === user.username) ?? null
        );
      }),
      hasMorePosts: computed(() => store.postsPage() < store.postsPages()),
    };
  }),

  withMethods((store) => {
    const service = inject(SocialService);
    const followService = inject(FollowService);
    const auth = inject(authStore);
    const toast = inject(ToastService);
    const language = inject(LanguageService);
    const apiErrors = inject(ApiErrorService);

    const t = (ar: string, en: string) => language.text(ar, en);

    const asEpoch = (value: unknown): number => {
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'string' || typeof value === 'number') {
        const timestamp = new Date(value).getTime();
        if (!Number.isNaN(timestamp)) return timestamp;
      }
      return Date.now();
    };

    const currentAuthProfile = (): Profile | null => {
      const user = auth.user();
      if (!user) return null;

      return {
        id: user._id,
        kind: user.role === 'org' ? 'org' : 'user',
        username: user.username,
        displayName: user.name,
        bio: (user as { bio?: string }).bio,
        city: user.location,
        isPrivate: user.isPrivate ?? false,
        createdAt: asEpoch(user.createdAt),
      };
    };

    const withAuthProfile = (profiles: Profile[]): Profile[] => {
      const profile = currentAuthProfile();
      if (!profile) return profiles;
      const exists = profiles.some(
        (item) =>
          item.id === profile.id ||
          item.username.toLowerCase() === profile.username.toLowerCase(),
      );
      return exists ? profiles : [profile, ...profiles];
    };

    const profileById = (id: string): Profile | null =>
      store.profiles().find((profile) => profile.id === id) ?? null;

    const addId = (ids: string[], id: string): string[] =>
      ids.includes(id) ? ids : [...ids, id];

    const removeId = (ids: string[], id: string): string[] =>
      ids.filter((item) => item !== id);

    const patchProfile = (profileId: string, changes: Partial<Profile>) => {
      patchState(store, {
        profiles: store
          .profiles()
          .map((profile) => (profile.id === profileId ? { ...profile, ...changes } : profile)),
      });
    };

    const localFollowState = (
      followerId: string | null,
      followeeId: string,
    ): 'none' | 'pending' | 'accepted' => {
      if (!followerId) return 'none';

      const following = store.myFollowing().some((item) => {
        const id = typeof item.following === 'object' ? item.following._id : item.following;
        return id === followeeId;
      });
      if (following) return 'accepted';

      const profileStatus = profileById(followeeId)?.followStatus;
      if (profileStatus === 'accepted') return 'accepted';
      if (store.sentPendingIds().includes(followeeId) || profileStatus === 'pending') {
        return 'pending';
      }
      return 'none';
    };

    const canViewProfile = (profileId: string, viewerId = auth.user()?._id ?? null): boolean => {
      if (viewerId === profileId) return true;
      const profile = profileById(profileId);
      if (!profile) return false;
      if (!profile.isPrivate) return true;
      return (
        profile.limitedProfile === false ||
        localFollowState(viewerId, profileId) === 'accepted'
      );
    };

    const clearProfileRelations = (profileId: string) => {
      const followers = { ...store.profileFollowers() };
      const following = { ...store.profileFollowing() };
      delete followers[profileId];
      delete following[profileId];
      patchState(store, {
        profileFollowers: followers,
        profileFollowing: following,
        relationLoadingIds: removeId(store.relationLoadingIds(), profileId),
        relationLoadedIds: removeId(store.relationLoadedIds(), profileId),
      });
    };

    const reloadFollowData = () => {
      const user = auth.user();
      if (!user) return;

      forkJoin({
        followers: followService.getFollowers(user._id),
        following: followService.getFollowing(user._id),
        pending: followService.getPendingRequests(),
      }).subscribe({
        next: ({ followers, following, pending }) => {
          patchState(store, {
            myFollowers: followers ?? [],
            myFollowing: following ?? [],
            pendingRequests: pending ?? [],
            followDataLoaded: true,
          });
        },
        error: () => patchState(store, { followDataLoaded: true }),
      });
    };

    const loadProfileRelations = (profileId: string) => {
      const viewerId = auth.user()?._id ?? null;
      if (!canViewProfile(profileId, viewerId)) {
        clearProfileRelations(profileId);
        return;
      }

      if (profileId === viewerId) {
        patchState(store, {
          relationLoadedIds: addId(store.relationLoadedIds(), profileId),
        });
        return;
      }

      if (
        store.relationLoadingIds().includes(profileId) ||
        store.relationLoadedIds().includes(profileId)
      ) {
        return;
      }

      patchState(store, {
        relationLoadingIds: addId(store.relationLoadingIds(), profileId),
      });

      forkJoin({
        followers: followService.getFollowers(profileId),
        following: followService.getFollowing(profileId),
      }).subscribe({
        next: ({ followers, following }) => {
          if (!canViewProfile(profileId)) {
            clearProfileRelations(profileId);
            return;
          }
          patchState(store, {
            profileFollowers: {
              ...store.profileFollowers(),
              [profileId]: followers ?? [],
            },
            profileFollowing: {
              ...store.profileFollowing(),
              [profileId]: following ?? [],
            },
            relationLoadingIds: removeId(store.relationLoadingIds(), profileId),
            relationLoadedIds: addId(store.relationLoadedIds(), profileId),
          });
        },
        error: () => {
          patchState(store, {
            relationLoadingIds: removeId(store.relationLoadingIds(), profileId),
            relationLoadedIds: addId(store.relationLoadedIds(), profileId),
          });
        },
      });
    };

    return {
      loadAll() {
        if (store.postsLoading()) return;
        patchState(store, { postsLoading: true, postsError: null });

        forkJoin({
          profiles: service.getProfiles().pipe(catchError(() => of([]))),
          postsResult: service.getPosts(1, 20).pipe(
            map((value) => ({ ok: true as const, value })),
            catchError(() =>
              of({
                ok: false as const,
                value: { posts: [], total: 0, page: 1, limit: 20, pages: 1 },
              }),
            ),
          ),
          followStatuses: service.searchUsers('').pipe(catchError(() => of([]))),
        }).subscribe(({ profiles, postsResult, followStatuses }) => {
          patchState(store, {
            profiles: withAuthProfile(profiles),
            posts: postsResult.value.posts,
            postsPage: postsResult.value.page,
            postsPages: Math.max(1, postsResult.value.pages),
            sentPendingIds: followStatuses
              .filter((profile) => profile.followStatus === 'pending')
              .map((profile) => profile.id),
            loaded: true,
            postsLoading: false,
            postsError: postsResult.ok ? null : 'تعذر تحميل المنشورات. حاول مرة أخرى.',
          });
        });
      },

      loadMorePosts() {
        if (store.postsLoadingMore() || store.postsPage() >= store.postsPages()) return;
        const nextPage = store.postsPage() + 1;
        patchState(store, { postsLoadingMore: true, postsError: null });

        service.getPosts(nextPage, 20).subscribe({
          next: (page) => {
            patchState(store, {
              posts: mergePosts(store.posts(), page.posts),
              postsPage: page.page,
              postsPages: Math.max(1, page.pages),
              postsLoadingMore: false,
            });
          },
          error: (error) => {
            patchState(store, {
              postsLoadingMore: false,
              postsError: 'تعذر تحميل المزيد من المنشورات.',
            });
          },
        });
      },

      loadFollowData() {
        reloadFollowData();
      },

      loadProfile(userId: string) {
        patchState(store, {
          profileLoadingIds: addId(store.profileLoadingIds(), userId),
          profileFailedIds: removeId(store.profileFailedIds(), userId),
        });

        service.getProfile(userId).subscribe({
          next: (profile) => {
            const current = profileById(profile.id);
            const merged = current
              ? { ...current, ...profile, kind: current.kind, createdAt: current.createdAt }
              : profile;
            patchState(store, {
              profiles: [
                merged,
                ...store.profiles().filter((item) => item.id !== profile.id),
              ],
              profileLoadingIds: removeId(store.profileLoadingIds(), profile.id),
              profileLoadedIds: addId(store.profileLoadedIds(), profile.id),
              profileFailedIds: removeId(store.profileFailedIds(), profile.id),
            });
            if (merged.limitedProfile) {
              clearProfileRelations(merged.id);
            } else {
              loadProfileRelations(merged.id);
            }
          },
          error: (error) => {
            patchState(store, {
              profileLoadingIds: removeId(store.profileLoadingIds(), userId),
              profileFailedIds: addId(store.profileFailedIds(), userId),
            });
          },
        });
      },

      isProfileLoading(profileId: string): boolean {
        return store.profileLoadingIds().includes(profileId);
      },

      isProfileLoaded(profileId: string): boolean {
        return store.profileLoadedIds().includes(profileId);
      },

      didProfileLoadFail(profileId: string): boolean {
        return store.profileFailedIds().includes(profileId);
      },

      areProfileRelationsLoading(profileId: string): boolean {
        return store.relationLoadingIds().includes(profileId);
      },

      canViewProfileContent(profileId: string): boolean {
        return canViewProfile(profileId);
      },

      findProfile(by: { id?: string; username?: string }): Profile | null {
        if (by.id) return profileById(by.id);
        if (!by.username) return null;
        const username = by.username.toLowerCase().replace(/^@/, '');
        return (
          store.profiles().find((profile) => profile.username.toLowerCase() === username) ?? null
        );
      },

      feedFor(profileId: string | null): Post[] {
        return store
          .posts()
          .filter((post) => canViewProfile(post.authorId, profileId))
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      postsBy(profileId: string): Post[] {
        if (!canViewProfile(profileId)) return [];
        return store
          .posts()
          .filter((post) => post.authorId === profileId)
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      followersOf(profileId: string): FollowerItem[] {
        if (!canViewProfile(profileId)) return [];
        return auth.user()?._id === profileId
          ? store.myFollowers()
          : (store.profileFollowers()[profileId] ?? []);
      },

      followingOf(profileId: string): FollowingItem[] {
        if (!canViewProfile(profileId)) return [];
        return auth.user()?._id === profileId
          ? store.myFollowing()
          : (store.profileFollowing()[profileId] ?? []);
      },

      pendingRequestsFor(profileId: string): PendingRequest[] {
        return auth.user()?._id === profileId ? store.pendingRequests() : [];
      },

      followState(followerId: string | null, followeeId: string): 'none' | 'pending' | 'accepted' {
        return localFollowState(followerId, followeeId);
      },

      getAuthor(authorId: string): Profile | null {
        return profileById(authorId);
      },

      updateProfile(
        updated: Profile,
        callbacks?: { onSuccess?: (profile: Profile) => void; onError?: () => void },
      ) {
        const previous = profileById(updated.id);
        const optimistic = { ...updated, limitedProfile: false };
        patchState(store, {
          profiles: previous
            ? store
                .profiles()
                .map((profile) => (profile.id === updated.id ? optimistic : profile))
            : [optimistic, ...store.profiles()],
        });

        service.updateProfile(updated).subscribe({
          next: (saved) => {
            const merged = { ...optimistic, ...saved, limitedProfile: false };
            const savedExists = !!profileById(saved.id);
            patchState(store, {
              profiles: savedExists
                ? store
                    .profiles()
                    .map((profile) =>
                      profile.id === saved.id ? { ...profile, ...merged } : profile,
                    )
                : [merged, ...store.profiles()],
            });
            auth.patchCurrentUser({
              name: merged.displayName,
              bio: merged.bio,
              location: merged.city ?? '',
              isPrivate: merged.isPrivate,
            });
            callbacks?.onSuccess?.(merged);
            toast.success('تم حفظ التعديلات', 'تم تحديث معلومات الملف الشخصي.');
          },
          error: (error) => {
            if (previous) {
              patchState(store, {
                profiles: store.profiles().map((profile) =>
                  profile.id === previous.id ? previous : profile,
                ),
              });
            } else {
              patchState(store, {
                profiles: store.profiles().filter((profile) => profile.id !== updated.id),
              });
            }
            callbacks?.onError?.();
            toast.error(
              t('تعذر حفظ التعديلات', 'Could not save changes'),
              apiErrors.message(
                error,
                'حاول مرة أخرى بعد قليل.',
                'Please try again shortly.',
              ),
            );
          },
        });
      },

      createPost(authorId: string, body: string) {
        const content = body.trim();
        if (!content || content.length > 500) {
          toast.warning(
            t('تحقق من المنشور', 'Check the post'),
            t('يجب أن يكون المحتوى بين 1 و500 حرف.', 'Content must be between 1 and 500 characters.'),
          );
          return;
        }

        service.createPost(content).subscribe({
          next: (created) => {
            const post = { ...created, authorId: created.authorId || authorId };
            patchState(store, { posts: mergePosts(store.posts(), [post]) });
            toast.success(
              t('تم نشر المنشور', 'Post published'),
              t('ظهر المنشور الآن في الرئيسية.', 'The post is now visible in the feed.'),
            );
          },
          error: (error) =>
            toast.error(
              t('تعذر نشر المنشور', 'Could not publish post'),
              apiErrors.message(error, 'حاول مرة أخرى.', 'Please try again.'),
            ),
        });
      },

      deletePost(postId: string) {
        const previous = store.posts();
        patchState(store, { posts: previous.filter((post) => post.id !== postId) });

        service.deletePost(postId).subscribe({
          next: () => toast.info(t('تم حذف المنشور', 'Post deleted')),
          error: (error) => {
            patchState(store, { posts: previous });
            toast.error(
              t('تعذر حذف المنشور', 'Could not delete post'),
              apiErrors.message(error, 'حاول مرة أخرى.', 'Please try again.'),
            );
          },
        });
      },

      toggleLike(postId: string, profileId: string) {
        const original = store.posts().find((post) => post.id === postId);
        if (!original) return;

        const wasLiked = original.likes.includes(profileId);
        const optimistic: Post = {
          ...original,
          likes: wasLiked
            ? original.likes.filter((id) => id !== profileId)
            : [...original.likes, profileId],
          likeCount: Math.max(0, original.likeCount + (wasLiked ? -1 : 1)),
        };
        patchState(store, {
          posts: store.posts().map((post) => (post.id === postId ? optimistic : post)),
        });

        service.toggleLike(postId).subscribe({
          next: (result) => {
            patchState(store, {
              posts: store.posts().map((post) =>
                post.id === postId ? { ...post, likeCount: result.totalLikes } : post,
              ),
            });
          },
          error: () => {
            patchState(store, {
              posts: store.posts().map((post) => (post.id === postId ? original : post)),
            });
          },
        });
      },

      receiveRealtimePost(payload: unknown) {
        const post = postFromBackend(payload as Parameters<typeof postFromBackend>[0]);
        if (!post.id) return;
        patchState(store, { posts: mergePosts(store.posts(), [post]) });
      },

      receiveRealtimeLike(event: { postId: string; userId: string; liked: boolean }) {
        patchState(store, {
          posts: store.posts().map((post) => {
            if (post.id !== event.postId) return post;
            const hasUser = post.likes.includes(event.userId);
            const likes = event.liked
              ? hasUser
                ? post.likes
                : [...post.likes, event.userId]
              : post.likes.filter((id) => id !== event.userId);
            return { ...post, likes, likeCount: likes.length };
          }),
        });
      },

      receiveRealtimeDelete(event: { postId: string }) {
        patchState(store, {
          posts: store.posts().filter((post) => post.id !== event.postId),
        });
      },

      follow(followerId: string, followeeId: string) {
        if (followerId === followeeId) return;

        followService.followUser(followeeId).subscribe({
          next: (response) => {
            if (response.status === 'accepted') {
              const profile = profileById(followeeId);
              if (profile) {
                patchState(store, {
                  myFollowing: [
                    {
                      _id: response._id,
                      follower: followerId,
                      following: {
                        _id: profile.id,
                        name: profile.displayName,
                        username: profile.username,
                      },
                      status: 'accepted',
                    },
                    ...store.myFollowing(),
                  ],
                  sentPendingIds: store.sentPendingIds().filter((id) => id !== followeeId),
                });
                patchProfile(followeeId, {
                  followStatus: 'accepted',
                  limitedProfile: false,
                  followersCount: (profile.followersCount ?? 0) + 1,
                });
              }
              reloadFollowData();
              service.getProfile(followeeId).subscribe({
                next: (saved) => {
                  const current = profileById(followeeId);
                  patchProfile(followeeId, {
                    ...saved,
                    kind: current?.kind ?? saved.kind,
                    createdAt: current?.createdAt ?? saved.createdAt,
                  });
                  loadProfileRelations(followeeId);
                },
                error: () => void 0,
              });
              toast.success(t('تمت المتابعة بنجاح', 'Now following'));
            } else {
              patchState(store, {
                sentPendingIds: [...new Set([...store.sentPendingIds(), followeeId])],
              });
              patchProfile(followeeId, { followStatus: 'pending' });
              toast.info(t('تم إرسال طلب المتابعة', 'Follow request sent'));
            }
          },
          error: (error) =>
            toast.error(
              t('تعذر تنفيذ المتابعة', 'Could not follow'),
              apiErrors.normalize(error).message,
            ),
        });
      },

      unfollow(_followerId: string, followeeId: string) {
        const previousStatus = localFollowState(auth.user()?._id ?? null, followeeId);
        const profile = profileById(followeeId);
        followService.unfollowUser(followeeId).subscribe({
          next: () => {
            patchState(store, {
              myFollowing: store.myFollowing().filter((item) => {
                const id =
                  typeof item.following === 'object' ? item.following._id : item.following;
                return id !== followeeId;
              }),
              sentPendingIds: store.sentPendingIds().filter((id) => id !== followeeId),
            });
            patchProfile(followeeId, {
              followStatus: 'none',
              limitedProfile: profile?.isPrivate ? true : false,
              followersCount:
                previousStatus === 'accepted'
                  ? Math.max(0, (profile?.followersCount ?? 1) - 1)
                  : profile?.followersCount,
            });
            if (profile?.isPrivate) clearProfileRelations(followeeId);
            toast.info(t('تم إلغاء المتابعة', 'Unfollowed'));
          },
          error: (error) =>
            toast.error(
              t('تعذر إلغاء المتابعة', 'Could not unfollow'),
              apiErrors.normalize(error).message,
            ),
        });
      },

      approveFollow(followerId: string, _followeeId: string) {
        const request = store.pendingRequests().find((item) => item.follower._id === followerId);
        if (!request) return;
        followService.acceptFollowRequest(request._id).subscribe({
          next: () => {
            const ownProfile = profileById(auth.user()?._id ?? '');
            if (ownProfile) {
              patchProfile(ownProfile.id, {
                followersCount: (ownProfile.followersCount ?? store.myFollowers().length) + 1,
              });
            }
            reloadFollowData();
            toast.success(t('تم قبول الطلب', 'Request accepted'));
          },
          error: (error) =>
            toast.error(
              t('تعذر قبول الطلب', 'Could not accept request'),
              apiErrors.normalize(error).message,
            ),
        });
      },

      denyFollow(followerId: string, _followeeId: string) {
        const request = store.pendingRequests().find((item) => item.follower._id === followerId);
        if (!request) return;
        followService.rejectFollowRequest(request._id).subscribe({
          next: () => {
            patchState(store, {
              pendingRequests: store
                .pendingRequests()
                .filter((item) => item._id !== request._id),
            });
            toast.info(t('تم رفض الطلب', 'Request declined'));
          },
          error: (error) =>
            toast.error(
              t('تعذر رفض الطلب', 'Could not decline request'),
              apiErrors.normalize(error).message,
            ),
        });
      },
    };
  }),

  withHooks((store) => {
    const auth = inject(authStore);
    const realtime = inject(NotificationRealtimeService);
    const subscriptions = new Subscription();

    return {
      onInit() {
        subscriptions.add(
          realtime.postCreated$.subscribe((post) => store.receiveRealtimePost(post)),
        );
        subscriptions.add(
          realtime.postLiked$.subscribe((event) => store.receiveRealtimeLike(event)),
        );
        subscriptions.add(
          realtime.postDeleted$.subscribe((event) => store.receiveRealtimeDelete(event)),
        );

        effect(() => {
          const user = auth.user();
          untracked(() => {
            const viewerId = user?._id ?? null;
            if (store.viewerId() !== viewerId) {
              patchState(store, {
                ...initial,
                viewerId,
              });
            }
            if (!user) return;
            store.loadAll();
            store.loadFollowData();
          });
        });
      },
      onDestroy() {
        subscriptions.unsubscribe();
      },
    };
  }),
);
