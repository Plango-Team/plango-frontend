import { Routes } from '@angular/router';

export const userRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page.component').then((m) => m.DashboardPageComponent),
  },
  {
    path: 'calendar',
    loadComponent: () => import('./calendar/pages/calendar-page/calendar-page.component').then((m) => m.CalendarPageComponent),
  },
  {
    path: 'tasks',
    loadComponent: () => import('./tasks/pages/tasks-page/tasks-page.component').then((m) => m.TasksPageComponent),
  },
  {
    path: 'map',
    loadComponent: () => import('./map/pages/map-page/map-page.component').then((m) => m.MapPageComponent),
  },
  {
    path: 'events',
    loadComponent: () => import('./events/pages/events-page/events-page.component').then((m) => m.EventsPageComponent),
  },
  {
    path: 'network',
    loadComponent: () => import('./network/pages/network-page/network-page.component').then((m) => m.NetworkPageComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/pages/settings-page/settings-page.component').then((m) => m.SettingsPageComponent),
  },
  {
    path: 'appointments',
    loadComponent: () => import('./appointments/pages/appointments-page/appointments-page.component').then((m) => m.AppointmentsPageComponent),
  },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/pages/notifications-page/notifications-page.component').then((m) => m.NotificationsPageComponent),
  },
  {
    path: 'feed',
    loadComponent: () => import('./social/pages/feed-page/feed-page.component').then((m) => m.FeedPageComponent),
  },
  {
    path: 'profile/:username',
    loadComponent: () => import('./social/pages/profile-page/profile-page.component').then((m) => m.ProfilePageComponent),
  }
];
