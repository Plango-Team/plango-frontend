import { Routes } from '@angular/router';
import { isUserGuard } from './core/guards/is-user-guard';
import { isAdminGuard } from './core/guards/is-admin-guard';
import { isOrganizationGuard } from './core/guards/is-organization-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./core/layouts/public-layout/public-layout.component').then(
        (m) => m.PublicLayoutComponent,
      ),
    loadChildren: () => import('./features/landing/landing.routes').then((m) => m.landingRoutes),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./core/layouts/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'user',
    canActivate: [isUserGuard],
    loadComponent: () =>
      import('./core/layouts/user-layout/user-layout.component').then((m) => m.UserLayoutComponent),
    loadChildren: () => import('./features/user/user.routes').then((m) => m.userRoutes),
  },
  {
    path: 'organization',
    canActivate: [isOrganizationGuard],
    loadComponent: () =>
      import('./core/layouts/organization-layout/organization-layout.component').then(
        (m) => m.OrganizationLayoutComponent,
      ),
    loadChildren: () =>
      import('./features/organization/organization.routes').then((m) => m.organizationRoutes),
  },
  {
    path: 'admin',
    canActivate: [isAdminGuard],
    loadComponent: () =>
      import('./core/layouts/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '**',
    redirectTo: 'auth',
  },
];
