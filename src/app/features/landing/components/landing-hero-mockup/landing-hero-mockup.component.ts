import { TranslatePipe } from '@ngx-translate/core';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../../../../core/services/language.service';

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
  imports: [TranslatePipe],
  templateUrl: './landing-hero-mockup.component.html',
  styleUrl: './landing-hero-mockup.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingHeroMockupComponent {
  protected readonly language = inject(LanguageService);
  protected readonly metrics: readonly DashboardMetric[] = [
    { label: 'landing.mockup.distance', value: '8.2 km', meta: 'landing.mockup.car' },
    { label: 'landing.mockup.weather', value: '24°', meta: 'landing.mockup.sunny' },
    { label: 'landing.mockup.destination', value: 'Zamalek', meta: 'landing.mockup.office' },
  ];

  protected readonly agenda: readonly AgendaItem[] = [
    { time: '09:00', title: 'landing.mockup.standup', highlighted: false, completed: true },
    { time: '10:30', title: 'landing.mockup.productMeeting', highlighted: true, completed: false },
    { time: '13:00', title: 'landing.mockup.lunch', highlighted: false, completed: false },
    { time: '16:00', title: 'landing.mockup.betaReview', highlighted: false, completed: false },
  ];

  protected readonly routeStops: readonly RouteStop[] = [
    { top: '30%', left: '18%', avatar: '/images/nader.png', alt: 'Nader' },
    { top: '18%', left: '56%', avatar: '/images/areej.png', alt: 'Areej' },
    { top: '34%', left: '86%', avatar: '/images/maram.png', alt: 'Maram' },
    { top: '78%', left: '24%', avatar: '/images/ahmed.png', alt: 'Ahmed' },
  ];
}
