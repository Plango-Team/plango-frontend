import { computed, effect, inject, untracked } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { forkJoin } from 'rxjs';
import { authStore } from '../../auth/auth.store';
import { ToastService } from '../../../shared/services/toast.service';
import { NotificationsStore } from '../../../shared/stores/notifications.store';
import { FollowEdge, Post, Profile, SocialService } from './services/social.service';
import {
  FollowService,
  FollowerItem,
  FollowingItem,
  PendingRequest,
} from './services/follow.service';

type SocialState = {
  profiles: Profile[];
  posts: Post[];
  follows: FollowEdge[];
  loaded: boolean;
  myFollowers: FollowerItem[];
  myFollowing: FollowingItem[];
  pendingRequests: PendingRequest[];
  sentPendingIds: string[];
  followDataLoaded: boolean;
};

const initial: SocialState = {
  profiles: [],
  posts: [],
  follows: [],
  loaded: false,
  myFollowers: [],
  myFollowing: [],
  pendingRequests: [],
  sentPendingIds: [],
  followDataLoaded: false,
};

export const SocialStore = signalStore(
  { providedIn: 'root' },
  withState(initial),

  withComputed((store) => {
    const auth = inject(authStore);

    return {
      /** Current user's social profile (matched by username or id). */
      myProfile: computed(() => {
        const user = auth.user();
        if (!user) return null;
        return (
          store.profiles().find((profile) => profile.id === user._id || profile.username === user.name) ??
          null
        );
      }),
    };
  }),

  withMethods((store) => {
    const svc = inject(SocialService);
    const followSvc = inject(FollowService);
    const auth = inject(authStore);
    const notificationsStore = inject(NotificationsStore);
    const toastService = inject(ToastService);

    const isArabic = () => auth.user();
    const t = (ar: string, en: string) => (isArabic() ? ar : en);

    // Helper to reload follow data (extracted so it can be called within withMethods)
    const reloadFollowData = () => {
      const user = auth.user();
      if (!user) return;
      forkJoin({
        followers: followSvc.getFollowers(user._id),
        following: followSvc.getFollowing(user._id),
        pending: followSvc.getPendingRequests(),
      }).subscribe({
        next: ({ followers, following, pending }) => {
          patchState(store, {
            myFollowers: followers ?? [],
            myFollowing: following ?? [],
            pendingRequests: pending ?? [],
            followDataLoaded: true,
          });
        },
        error: () => {
          patchState(store, { followDataLoaded: true });
        },
      });
    };

    const asEpoch = (value: unknown): number => {
      if (value instanceof Date) return value.getTime();
      if (typeof value === 'string' || typeof value === 'number') {
        const ts = new Date(value).getTime();
        if (!Number.isNaN(ts)) return ts;
      }
      return Date.now();
    };

    const profileById = (id: string): Profile | null =>
      store.profiles().find((profile) => profile.id === id) ?? null;

    const profileLink = (_kind: 'user' | 'org', username: string) =>
      `/user/profile/${username}`;

    const communityLinkFor = (ownerId: string) => {
      const owner = profileById(ownerId);
      return owner?.kind === 'org' ? '/organization/followers' : '/user/network';
    };

    const currentAuthProfile = (): Profile | null => {
      const user = auth.user();
      if (!user) return null;

      return {
        id: user._id,
        kind: (user as any).accountType === 'organization' ? 'org' : 'user',
        username: user.username,
        displayName: user.name,
        bio: (user as any).bio,
        privateFollows: user.isPrivate ?? false,
        createdAt: asEpoch(user.createdAt),
      };
    };

    const ensureAuthProfile = (profiles?: Profile[]) => {
      const profile = currentAuthProfile();
      if (!profile) return;

      const source = profiles ?? store.profiles();
      const exists = source.some(
        (p) => p.id === profile.id || p.username.toLowerCase() === profile.username.toLowerCase(),
      );
      if (exists) return;

      if (!profiles) {
        patchState(store, { profiles: [profile, ...source] });
      }

      svc.createProfile(profile).subscribe();
    };

    return {
      loadAll() {
        svc.loadAll().subscribe({
          next: ({ profiles, posts, follows }) => {
            ensureAuthProfile(profiles);
            const authProfile = currentAuthProfile();
            const nextProfiles =
              authProfile &&
              !profiles.some(
                (profile) =>
                  profile.id === authProfile.id ||
                  profile.username.toLowerCase() === authProfile.username.toLowerCase(),
              )
                ? [authProfile, ...profiles]
                : profiles;

            patchState(store, { profiles: nextProfiles, posts, follows, loaded: true });
          },
          error: () => {
            // Mock API endpoints (/profiles, /posts, /follows) may not exist on production.
            // Still mark as loaded and create an auth profile locally.
            const authProfile = currentAuthProfile();
            const profiles = authProfile ? [authProfile] : [];
            patchState(store, { profiles, posts: [], follows: [], loaded: true });
          },
        });
      },

      loadFollowData() {
        reloadFollowData();
      },

      findProfile(by: { id?: string; username?: string }): Profile | null {
        if (by.id) return store.profiles().find((profile) => profile.id === by.id) ?? null;
        if (by.username) {
          return (
            store
              .profiles()
              .find(
                (profile) =>
                  profile.username.toLowerCase() === by.username!.toLowerCase().replace(/^@/, ''),
              ) ?? null
          );
        }
        return null;
      },

      feedFor(profileId: string | null): Post[] {
        const all = store.posts();
        if (!profileId) return [...all].sort((a, b) => b.createdAt - a.createdAt);

        const followingIds = new Set(
          store
            .follows()
            .filter((edge) => edge.followerId === profileId && edge.status === 'approved')
            .map((edge) => edge.followeeId),
        );
        followingIds.add(profileId);

        return all
          .filter((post) => followingIds.has(post.authorId))
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      postsBy(profileId: string): Post[] {
        return store
          .posts()
          .filter((post) => post.authorId === profileId)
          .sort((a, b) => b.createdAt - a.createdAt);
      },

      followersOf(profileId: string): FollowerItem[] {
        const user = auth.user();
        if (user && user._id === profileId) {
          return store.myFollowers();
        }
        return [];
      },

      followingOf(profileId: string): FollowingItem[] {
        const user = auth.user();
        if (user && user._id === profileId) {
          return store.myFollowing();
        }
        return [];
      },

      pendingRequestsFor(profileId: string): PendingRequest[] {
        const user = auth.user();
        if (user && user._id === profileId) {
          return store.pendingRequests();
        }
        return [];
      },

      followState(followerId: string | null, followeeId: string): 'none' | 'pending' | 'accepted' {
        if (!followerId) return 'none';
        const isFollowing = store.myFollowing().some((f) => {
          const fid = typeof f.following === 'object' ? f.following._id : f.following;
          return fid === followeeId;
        });
        if (isFollowing) return 'accepted';
        if (store.sentPendingIds().includes(followeeId)) return 'pending';
        return 'none';
      },

      getAuthor(authorId: string): Profile | null {
        return store.profiles().find((profile) => profile.id === authorId) ?? null;
      },

      updateProfile(updated: Profile) {
        patchState(store, {
          profiles: store.profiles().map((profile) => (profile.id === updated.id ? updated : profile)),
        });

        svc.updateProfile(updated).subscribe({
          next: () => {
            toastService.success(
              t('تم حفظ التعديلات', 'Profile updated'),
              t('تم تحديث معلومات الملف الشخصي.', 'Your profile details were updated.'),
            );
          },
          error: () => {
            toastService.error(
              t('تعذر حفظ التعديلات', 'Could not save profile'),
              t('حاول مرة أخرى بعد قليل.', 'Please try again in a moment.'),
            );
          },
        });
      },

      createPost(authorId: string, body: string) {
        ensureAuthProfile();
        const cleanBody = body.trim();
        const post: Post = {
          authorId,
          body: cleanBody,
          likes: [],
          createdAt: Date.now(),
        };

        svc.createPost(post).subscribe({
          next: (created) => {
            patchState(store, { posts: [created, ...store.posts()] });

            const author = profileById(authorId);
            if (author) {
              notificationsStore.push({
                ownerId: authorId,
                kind: 'info',
                title: t('تم نشر منشور جديد', 'Post published'),
                body: cleanBody.slice(0, 100),
                link: author.kind === 'org' ? '/organization/posts' : '/user/feed',
              });

              const followers = store
                .follows()
                .filter((edge) => edge.followeeId === authorId && edge.status === 'approved');
              for (const edge of followers) {
                const recipient = profileById(edge.followerId);
                notificationsStore.push({
                  ownerId: edge.followerId,
                  kind: 'info',
                  title: t(
                    `${author.displayName} نشر تحديثًا جديدًا`,
                    `${author.displayName} posted a new update`,
                  ),
                  body: cleanBody.slice(0, 100),
                  link: profileLink(recipient?.kind ?? 'user', author.username),
                });
              }
            }

            toastService.success(
              t('تم نشر المنشور', 'Post published'),
              t('شاركته الآن مع متابعيك.', 'Your update is now live.'),
            );
          },
          error: () => {
            toastService.error(
              t('تعذر نشر المنشور', 'Could not publish post'),
              t('حاول مرة أخرى.', 'Please try again.'),
            );
          },
        });
      },

      deletePost(postId: string) {
        svc.deletePost(postId).subscribe({
          next: () => {
            patchState(store, { posts: store.posts().filter((post) => post.id !== postId) });
            toastService.info(
              t('تم حذف المنشور', 'Post removed'),
              t('تمت إزالة المنشور من الخلاصة.', 'The post was removed from your feed.'),
            );
          },
          error: () => {
            toastService.error(
              t('تعذر حذف المنشور', 'Could not remove post'),
              t('حاول مرة أخرى.', 'Please try again.'),
            );
          },
        });
      },

      toggleLike(postId: string, profileId: string) {
        const post = store.posts().find((item) => item.id === postId);
        if (!post) return;

        const liked = post.likes.includes(profileId);
        const updatedPost: Post = {
          ...post,
          likes: liked ? post.likes.filter((id) => id !== profileId) : [...post.likes, profileId],
        };

        patchState(store, {
          posts: store.posts().map((item) => (item.id === postId ? updatedPost : item)),
        });

        svc.updatePost(updatedPost).subscribe({
          next: () => {
            if (!liked && post.authorId !== profileId) {
              const actor = profileById(profileId);
              const author = profileById(post.authorId);
              if (author) {
                notificationsStore.push({
                  ownerId: author.id,
                  kind: 'info',
                  title: t(
                    `${actor?.displayName ?? 'مستخدم'} أعجب بمنشورك`,
                    `${actor?.displayName ?? 'Someone'} liked your post`,
                  ),
                  link: profileLink(author.kind, author.username),
                });
              }
            }
          },
          error: () => {
            patchState(store, {
              posts: store.posts().map((item) => (item.id === postId ? post : item)),
            });
          },
        });
      },

      follow(followerId: string, followeeId: string) {
        if (followerId === followeeId) return;

        followSvc.followUser(followeeId).subscribe({
          next: (res) => {
            if (res.status === 'accepted') {
              reloadFollowData();
              toastService.success(
                t('تمت المتابعة بنجاح', 'Now following'),
                t('أنت الآن تتابع هذا الحساب.', 'You are now following this account.'),
              );
            } else {
              patchState(store, {
                sentPendingIds: [...store.sentPendingIds(), followeeId],
              });
              toastService.info(
                t('تم إرسال طلب المتابعة', 'Follow request sent'),
                t('سنُعلمك عند القبول.', 'We will notify you once approved.'),
              );
            }
          },
          error: () => {
            toastService.error(
              t('تعذر تنفيذ المتابعة', 'Could not follow'),
              t('حاول مرة أخرى.', 'Please try again.'),
            );
          },
        });
      },

      unfollow(followerId: string, followeeId: string) {
        followSvc.unfollowUser(followeeId).subscribe({
          next: () => {
            patchState(store, {
              myFollowing: store.myFollowing().filter((f) => {
                const fid = typeof f.following === 'object' ? f.following._id : f.following;
                return fid !== followeeId;
              }),
              sentPendingIds: store.sentPendingIds().filter((id) => id !== followeeId),
            });
            toastService.info(t('تم إلغاء المتابعة', 'Unfollowed'));
          },
          error: () => {
            toastService.error(
              t('تعذر إلغاء المتابعة', 'Could not unfollow'),
              t('حاول مرة أخرى.', 'Please try again.'),
            );
          },
        });
      },

      approveFollow(followerId: string, followeeId: string) {
        const request = store.pendingRequests().find((r) => r.follower._id === followerId);
        if (!request) return;

        followSvc.acceptFollowRequest(request._id).subscribe({
          next: () => {
            reloadFollowData();
            toastService.success(
              t('تم قبول الطلب', 'Request approved'),
              t('أصبح المستخدم الآن ضمن متابعيك.', 'The follower is now approved.'),
            );
          },
          error: () => {
            toastService.error(
              t('تعذر قبول الطلب', 'Could not approve request'),
              t('حاول مرة أخرى.', 'Please try again.'),
            );
          },
        });
      },

      denyFollow(followerId: string, followeeId: string) {
        const request = store.pendingRequests().find((r) => r.follower._id === followerId);
        if (!request) return;

        followSvc.rejectFollowRequest(request._id).subscribe({
          next: () => {
            patchState(store, {
              pendingRequests: store.pendingRequests().filter((r) => r._id !== request._id),
            });
            toastService.info(t('تم رفض الطلب', 'Request declined'));
          },
          error: () => {
            toastService.error(
              t('تعذر رفض الطلب', 'Could not decline request'),
              t('حاول مرة أخرى.', 'Please try again.'),
            );
          },
        });
      },
    };
  }),

  withHooks({
    onInit(store) {
      const auth = inject(authStore);

      // Reactively load data when user becomes available
      effect(() => {
        const user = auth.user();
        if (user) {
          untracked(() => {
            store.loadAll();
            store.loadFollowData();
          });
        }
      });
    },
  }),
);
