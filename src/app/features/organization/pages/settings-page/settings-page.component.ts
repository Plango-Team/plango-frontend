import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { authStore } from '../../../auth/auth.store';
import { SocialStore } from '../../../user/social/social.store';
import { Profile } from '../../../user/social/services/social.service';

@Component({
  selector: 'app-organization-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings-page.component.html',
})
export class OrganizationSettingsPageComponent implements OnInit {
  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);

  readonly currentProfile = computed<Profile | null>(() => {
    const fromSocial = this.socialStore.myProfile();
    if (fromSocial) return fromSocial;

    const user = this.authStore.user();
    if (!user || user.accountType !== 'organization') return null;

    return {
      id: user.id,
      kind: 'org',
      username: user.userName,
      displayName:
        user.displayName?.trim() ||
        user.organizationName ||
        `${user.firstName} ${user.lastName}`.trim(),
      bio: user.bio || user.organizationDescription,
      privateFollows: user.privateFollows,
      createdAt: this.asEpoch(user.createdAt),
    };
  });

  readonly followersCount = computed(() => {
    const profile = this.currentProfile();
    return profile ? this.socialStore.followersOf(profile.id).length : 0;
  });

  readonly broadcastsCount = computed(() => {
    const profile = this.currentProfile();
    return profile ? this.socialStore.postsBy(profile.id).length : 0;
  });

  displayName = '';
  username = '';
  city = '';
  bio = '';
  contactEmail = '';
  website = '';

  autoApprove = true;
  allowMentions = true;
  broadcastReminders = true;
  selectedLanguage: 'ar' | 'en' = 'ar';

  private initial = {
    displayName: '',
    username: '',
    city: '',
    bio: '',
  };

  ngOnInit(): void {
    this.authStore.clearError();
    this.authStore.clearSuccess();
    this.hydrateForm();
  }

  get isDirty(): boolean {
    return (
      this.displayName !== this.initial.displayName ||
      this.username !== this.initial.username ||
      this.city !== this.initial.city ||
      this.bio !== this.initial.bio
    );
  }

  saveSettings(): void {
    const user = this.authStore.user();
    const profile = this.currentProfile();
    if (!user || !profile) return;

    const nextDisplayName = this.displayName.trim() || profile.displayName;
    const nextUsername = this.normalizeUsername(this.username) || profile.username;
    const nextCity = this.city.trim() || undefined;
    const nextBio = this.bio.trim() || undefined;

    const existingProfile = this.socialStore.findProfile({ id: profile.id });
    if (existingProfile) {
      this.socialStore.updateProfile({
        ...existingProfile,
        displayName: nextDisplayName,
        username: nextUsername,
        city: nextCity,
        bio: nextBio,
        privateFollows: !this.autoApprove,
      });
    }

    this.authStore.updateCurrentUser({
      displayName: nextDisplayName,
      userName: nextUsername,
      bio: nextBio,
      privateFollows: !this.autoApprove,
      email: this.contactEmail.trim() || user.email,
      organizationName: nextDisplayName,
      organizationDescription: nextBio,
      preferences: {
        ...user.preferences,
        language: this.selectedLanguage,
        notifications: {
          ...user.preferences.notifications,
          push: this.broadcastReminders,
        },
      },
    });

    localStorage.setItem(this.allowMentionsKey(user.id), JSON.stringify(this.allowMentions));
    this.initial = {
      displayName: nextDisplayName,
      username: nextUsername,
      city: nextCity ?? '',
      bio: nextBio ?? '',
    };
  }

  setLanguage(language: 'ar' | 'en'): void {
    this.selectedLanguage = language;
  }

  private hydrateForm(): void {
    const user = this.authStore.user();
    const profile = this.currentProfile();
    if (!user || !profile) return;

    const displayName = profile.displayName || user.organizationName || user.displayName || '';
    const username = profile.username || user.userName || '';
    const city = profile.city || '';
    const bio = profile.bio || user.organizationDescription || user.bio || '';

    this.displayName = displayName;
    this.username = username;
    this.city = city;
    this.bio = bio;
    this.contactEmail = user.email || `hello@${username}.com`;
    this.website = `https://${username}.com`;
    this.autoApprove = !(profile.privateFollows ?? user.privateFollows ?? false);
    this.broadcastReminders = user.preferences.notifications.push;
    this.selectedLanguage = user.preferences.language;

    const mentions = localStorage.getItem(this.allowMentionsKey(user.id));
    this.allowMentions = mentions === null ? true : mentions === 'true';

    this.initial = { displayName, username, city, bio };
  }

  private normalizeUsername(value: string): string {
    return value.trim().replace(/^@+/, '').replace(/\s+/g, '_').toLowerCase();
  }

  private allowMentionsKey(userId: string): string {
    return `plango.org.allowMentions.${userId}`;
  }

  private asEpoch(value: unknown): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') {
      const ts = new Date(value).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    return Date.now();
  }
}
