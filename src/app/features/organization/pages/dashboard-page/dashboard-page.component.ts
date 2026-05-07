import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { authStore } from '../../../auth/auth.store';

@Component({
  selector: 'app-organization-dashboard-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-page.component.html',
})
export class OrganizationDashboardPageComponent {
  readonly authStore = inject(authStore);

  readonly highlights = [
    { label: 'فعاليات هذا الشهر', value: '18' },
    { label: 'الأعضاء النشطون', value: '42' },
    { label: 'الحضور المؤكد', value: '96%' },
  ];

  readonly upcomingEvents = [
    { title: 'ورشة التصميم المجتمعية', time: 'اليوم 06:00 PM', status: 'مكتمل الحضور' },
    { title: 'لقاء فريق المنتجات', time: 'غداً 11:30 AM', status: 'قيد التأكيد' },
    { title: 'جلسة التخطيط الشهري', time: 'الخميس 02:00 PM', status: 'مفتوح' },
  ];
}
