import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SocialStore } from '../../../social/social.store';
import { authStore } from '../../../../auth/auth.store';

type NetworkTab = 'discover' | 'followers' | 'following' | 'requests';

@Component({
  selector: 'app-network-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './network-page.component.html',
  styleUrl: './network-page.component.css',
})
export class NetworkPageComponent {
  socialStore = inject(SocialStore);
  auth = inject(authStore);
  activeTab = signal<NetworkTab>('discover');
  searchQuery = signal('');

  stats = computed(() => ({
    followers: this.socialStore.myFollowers().length,
    following: this.socialStore.myFollowing().length,
    pending: this.socialStore.pendingRequests().length,
  }));

  tabs = computed(() => [
    {
      key: 'discover' as NetworkTab,
      label: 'اكتشف',
      count: this.socialStore.profiles().filter((profile) => profile.id !== this.auth.user()?._id)
        .length,
    },
    { key: 'followers' as NetworkTab, label: 'المتابعون', count: this.stats().followers },
    { key: 'following' as NetworkTab, label: 'أتابعهم', count: this.stats().following },
    { key: 'requests' as NetworkTab, label: 'طلبات', count: this.stats().pending },
  ]);

  filteredFollowers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.socialStore.myFollowers();
    if (!q) return list;
    return list.filter((f) => {
      const name = f.follower?.name?.toLowerCase() ?? '';
      const username = f.follower?.username?.toLowerCase() ?? '';
      return name.includes(q) || username.includes(q);
    });
  });

  filteredFollowing = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.socialStore.myFollowing();
    if (!q) return list;
    return list.filter((f) => {
      const user = f.following;
      if (typeof user === 'object') {
        return (
          user.name?.toLowerCase().includes(q) || user.username?.toLowerCase().includes(q)
        );
      }
      return false;
    });
  });

  filteredRequests = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.socialStore.pendingRequests();
    if (!q) return list;
    return list.filter((r) => {
      const name = r.follower?.name?.toLowerCase() ?? '';
      const username = r.follower?.username?.toLowerCase() ?? '';
      return name.includes(q) || username.includes(q);
    });
  });

  discoverProfiles = computed(() => {
    const myId = this.auth.user()?._id;
    const query = this.searchQuery().trim().toLowerCase();
    return this.socialStore
      .profiles()
      .filter((profile) => profile.id !== myId)
      .filter(
        (profile) =>
          !query ||
          profile.displayName.toLowerCase().includes(query) ||
          profile.username.toLowerCase().includes(query),
      )
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'user' ? -1 : 1;
        return a.displayName.localeCompare(b.displayName, 'ar');
      });
  });

  selectTab(tab: NetworkTab) {
    this.activeTab.set(tab);
  }

  onSearchChange(value: string) {
    this.searchQuery.set(value);
  }

  unfollowUser(userId: string) {
    const myId = this.auth.user()?._id;
    if (!myId) return;
    this.socialStore.unfollow(myId, userId);
  }

  toggleFollow(userId: string) {
    const myId = this.auth.user()?._id;
    if (!myId || myId === userId) return;
    if (this.socialStore.followState(myId, userId) === 'none') {
      this.socialStore.follow(myId, userId);
    } else {
      this.socialStore.unfollow(myId, userId);
    }
  }

  followLabel(userId: string, isPrivate: boolean): string {
    const state = this.socialStore.followState(this.auth.user()?._id ?? null, userId);
    if (state === 'accepted') return 'إلغاء المتابعة';
    if (state === 'pending') return 'إلغاء الطلب';
    return isPrivate ? 'طلب متابعة' : 'متابعة';
  }

  isPrivate(userId: string): boolean {
    return this.socialStore.findProfile({ id: userId })?.isPrivate ?? false;
  }

  acceptRequest(followerId: string) {
    const myId = this.auth.user()?._id;
    if (!myId) return;
    this.socialStore.approveFollow(followerId, myId);
  }

  rejectRequest(followerId: string) {
    const myId = this.auth.user()?._id;
    if (!myId) return;
    this.socialStore.denyFollow(followerId, myId);
  }

  getInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  getAvatarGradient(name: string): string {
    const gradients = [
      'from-amber-400 to-orange-500',
      'from-fuchsia-500 to-pink-500',
      'from-sky-500 to-cyan-400',
      'from-emerald-500 to-teal-400',
      'from-violet-500 to-purple-500',
      'from-rose-500 to-red-500',
      'from-indigo-500 to-blue-500',
      'from-lime-500 to-green-500',
    ];
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  }

  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }
}
