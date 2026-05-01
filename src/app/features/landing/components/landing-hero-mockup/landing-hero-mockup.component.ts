import { ChangeDetectionStrategy, Component } from '@angular/core';

interface DashboardMetric {
  readonly label: string;
  readonly value: string;
  readonly meta: string;
}

interface AgendaItem {
  readonly time: string;
  readonly title: string;
  readonly highlighted: boolean;
  readonly completed: boolean;
}

interface RouteStop {
  readonly top: string;
  readonly left: string;
  readonly avatar: string;
  readonly alt: string;
}

@Component({
  selector: 'app-landing-hero-mockup',
  standalone: true,
  templateUrl: './landing-hero-mockup.component.html',
  styleUrl: './landing-hero-mockup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHeroMockupComponent {
  protected readonly metrics: readonly DashboardMetric[] = [
    { label: 'المسافة', value: '8.2 كم', meta: 'سيارة' },
    { label: 'الطقس', value: '24°', meta: 'مشمس' },
    { label: 'الوجهة', value: 'الزمالك', meta: 'مكتب العمل' },
  ];

  protected readonly agenda: readonly AgendaItem[] = [
    { time: '09:00', title: 'ستاند أب الفريق', highlighted: false, completed: true },
    { time: '10:30', title: 'اجتماع تصميم المنتج', highlighted: true, completed: false },
    { time: '13:00', title: 'غداء مع سارة', highlighted: false, completed: false },
    { time: '16:00', title: 'مراجعة النسخة التجريبية', highlighted: false, completed: false },
  ];

  protected readonly routeStops: readonly RouteStop[] = [
    { top: '30%', left: '18%', avatar: '/images/nader.png', alt: 'نادر' },
    { top: '18%', left: '56%', avatar: '/images/areej.png', alt: 'أريج' },
    { top: '34%', left: '86%', avatar: '/images/maram.png', alt: 'مرام' },
    { top: '78%', left: '24%', avatar: '/images/ahmed.png', alt: 'أحمد' },
  ];
}
