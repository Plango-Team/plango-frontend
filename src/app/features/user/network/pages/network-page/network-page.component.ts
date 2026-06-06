import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { SocialStore } from '../../../social/social.store';
import { authStore } from '../../../../auth/auth.store';

type NetworkTab = 'followers' | 'following' | 'requests';

@Component({
  selector: 'app-network-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IconComponent],
  templateUrl: './network-page.component.html',
  styleUrl: './network-page.component.css',
})
export class NetworkPageComponent {
  socialStore = inject(SocialStore);
  auth = inject(authStore);
  activeTab = signal<NetworkTab>('followers');
  searchQuery = signal('');

  stats = computed(() => ({
    followers: this.socialStore.myFollowers().length,
    following: this.socialStore.myFollowing().length,
    pending: this.socialStore.pendingRequests().length,
  }));

  tabs = computed(() => [
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
