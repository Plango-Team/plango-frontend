import { Routes } from '@angular/router';

export const organizationRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard-page/dashboard-page.component').then(
        (m) => m.OrganizationDashboardPageComponent,
      ),
  },
  {
    path: 'feed',
    loadComponent: () =>
      import('./pages/feed-page/feed-page.component').then((m) => m.OrganizationFeedPageComponent),
  },
  {
    path: 'posts',
    loadComponent: () =>
      import('./pages/posts-page/posts-page.component').then(
        (m) => m.OrganizationPostsPageComponent,
      ),
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./pages/events-page/events-page.component').then(
        (m) => m.OrganizationEventsPageComponent,
      ),
  },
  {
    path: 'followers',
    loadComponent: () =>
      import('./pages/followers-page/followers-page.component').then(
        (m) => m.OrganizationFollowersPageComponent,
      ),
  },
  {
    path: 'profile/:username',
    loadComponent: () =>
      import('../user/social/pages/profile-page/profile-page.component').then(
        (m) => m.ProfilePageComponent,
      ),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings-page/settings-page.component').then(
        (m) => m.OrganizationSettingsPageComponent,
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('../user/notifications/pages/notifications-page/notifications-page.component').then(
        (m) => m.NotificationsPageComponent,
      ),
  },
];
