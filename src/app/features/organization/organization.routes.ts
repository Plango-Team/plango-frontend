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
    path: 'events',
    loadComponent: () =>
      import('./pages/section-page/section-page.component').then(
        (m) => m.OrganizationSectionPageComponent,
      ),
    data: {
      section: 'events',
      title: 'فعاليات المؤسسة',
      description: 'تابع الفعاليات القادمة وحالات الحضور من لوحة موحدة.',
    },
  },
  {
    path: 'members',
    loadComponent: () =>
      import('./pages/section-page/section-page.component').then(
        (m) => m.OrganizationSectionPageComponent,
      ),
    data: {
      section: 'members',
      title: 'أعضاء الفريق',
      description: 'أدِر الموظفين والمشرفين المرتبطين بحساب المؤسسة.',
    },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/section-page/section-page.component').then(
        (m) => m.OrganizationSectionPageComponent,
      ),
    data: {
      section: 'settings',
      title: 'إعدادات المؤسسة',
      description: 'اضبط معلومات الحساب، الشعار، وطرق التواصل.',
    },
  },
];
