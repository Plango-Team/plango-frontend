import { Routes } from '@angular/router';

export const userRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/pages/dashboard-page/dashboard-page.component').then((m) => m.DashboardPageComponent),
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
    path: 'map',
    loadComponent: () => import('./map/pages/map-page/map-page.component').then((m) => m.MapPageComponent),
  }
];
