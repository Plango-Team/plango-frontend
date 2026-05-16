import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { authStore } from '../../auth/auth.store';
import { ToastService } from '../../../shared/services/toast.service';
import { NotificationsStore } from '../../../shared/stores/notifications.store';
import { FollowEdge, Post, Profile, SocialService } from './services/social.service';

type SocialState = {
  profiles: Profile[];
  posts: Post[];
  follows: FollowEdge[];
  loaded: boolean;
};

const initial: SocialState = { profiles: [], posts: [], follows: [], loaded: false };

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
          store.profiles().find((profile) => profile.id === user.id || profile.username === user.userName) ??
          null
        );
      }),
    };
  }),

  withMethods((store) => {
    const svc = inject(SocialService);
    const auth = inject(authStore);
    const notificationsStore = inject(NotificationsStore);
    const toastService = inject(ToastService);

    const isArabic = () => auth.user()?.preferences?.language !== 'en';
    const t = (ar: string, en: string) => (isArabic() ? ar : en);

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

    const profileLink = (kind: 'user' | 'org', username: string) =>
      `${kind === 'org' ? '/organization/profile' : '/user/profile'}/${username}`;

    const communityLinkFor = (ownerId: string) => {
      const owner = profileById(ownerId);
      return owner?.kind === 'org' ? '/organization/followers' : '/user/network';
    };

    const currentAuthProfile = (): Profile | null => {
      const user = auth.user();
      if (!user) return null;

      return {
        id: user.id,
        kind: user.accountType === 'organization' ? 'org' : 'user',
        username: user.userName,
        displayName: user.displayName?.trim() || `${user.firstName} ${user.lastName}`.trim(),
        bio: user.bio,
        privateFollows: user.privateFollows,
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
        svc.loadAll().subscribe(({ profiles, posts, follows }) => {
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
        });
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

      followersOf(profileId: string): FollowEdge[] {
        return store
          .follows()
          .filter((edge) => edge.followeeId === profileId && edge.status === 'approved');
      },

      followingOf(profileId: string): FollowEdge[] {
        return store
          .follows()
          .filter((edge) => edge.followerId === profileId && edge.status === 'approved');
      },

      pendingRequestsFor(profileId: string): FollowEdge[] {
        return store
          .follows()
          .filter((edge) => edge.followeeId === profileId && edge.status === 'pending');
      },

      followState(followerId: string | null, followeeId: string): 'none' | 'pending' | 'approved' {
        if (!followerId) return 'none';
        const edge = store
          .follows()
          .find((item) => item.followerId === followerId && item.followeeId === followeeId);
        return edge?.status ?? 'none';
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

        const existing = store
          .follows()
          .find((edge) => edge.followerId === followerId && edge.followeeId === followeeId);
        if (existing) return;

        const followee = profileById(followeeId);
        const follower = profileById(followerId);
        const status: 'pending' | 'approved' =
          followee?.kind === 'org' || !followee?.privateFollows ? 'approved' : 'pending';

        const edge: FollowEdge = { followerId, followeeId, status, createdAt: Date.now() };
        svc.createFollow(edge).subscribe({
          next: (created) => {
            patchState(store, { follows: [...store.follows(), created] });

            notificationsStore.push({
              ownerId: followeeId,
              kind: 'info',
              title:
                status === 'pending'
                  ? t('طلب متابعة جديد', 'New follow request')
                  : t('متابع جديد', 'New follower'),
              body: t(
                `${follower?.displayName ?? 'مستخدم'} يريد متابعتك`,
                `${follower?.displayName ?? 'Someone'} wants to follow you`,
              ),
              link: communityLinkFor(followeeId),
            });

            if (status === 'pending') {
              toastService.info(
                t('تم إرسال طلب المتابعة', 'Follow request sent'),
                t('سنُعلمك عند القبول.', 'We will notify you once approved.'),
              );
            } else {
              toastService.success(
                t('تمت المتابعة بنجاح', 'Now following'),
                t(
                  `أنت الآن تتابع ${followee?.displayName ?? 'هذا الحساب'}.`,
                  `You are now following ${followee?.displayName ?? 'this account'}.`,
                ),
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
        const edge = store
          .follows()
          .find((item) => item.followerId === followerId && item.followeeId === followeeId);
        if (!edge?.id) return;

        svc.deleteFollow(edge.id).subscribe({
          next: () => {
            patchState(store, {
              follows: store.follows().filter((item) => item.id !== edge.id),
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
        const edge = store
          .follows()
          .find((item) => item.followerId === followerId && item.followeeId === followeeId);
        if (!edge?.id) return;

        const updated: FollowEdge = { ...edge, status: 'approved' };
        patchState(store, {
          follows: store.follows().map((item) => (item.id === edge.id ? updated : item)),
        });

        svc.updateFollow(updated).subscribe({
          next: () => {
            const followee = profileById(followeeId);
            notificationsStore.push({
              ownerId: followerId,
              kind: 'info',
              title: t('تم قبول طلب المتابعة', 'Follow request approved'),
              body: t(
                `${followee?.displayName ?? 'الحساب'} وافق على طلب متابعتك.`,
                `${followee?.displayName ?? 'This account'} approved your follow request.`,
              ),
              link:
                followee?.username && followee?.kind
                  ? profileLink(followee.kind, followee.username)
                  : '/user/feed',
            });

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
        const edge = store
          .follows()
          .find((item) => item.followerId === followerId && item.followeeId === followeeId);
        if (!edge?.id) return;

        patchState(store, {
          follows: store.follows().filter((item) => item.id !== edge.id),
        });

        svc.deleteFollow(edge.id).subscribe({
          next: () => {
            const followee = profileById(followeeId);
            notificationsStore.push({
              ownerId: followerId,
              kind: 'info',
              title: t('تم رفض طلب المتابعة', 'Follow request declined'),
              body: t(
                `${followee?.displayName ?? 'الحساب'} رفض طلب المتابعة.`,
                `${followee?.displayName ?? 'This account'} declined your follow request.`,
              ),
              link: '/user/network',
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
      store.loadAll();
    },
  }),
);
