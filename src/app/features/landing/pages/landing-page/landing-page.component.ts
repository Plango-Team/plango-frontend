import { TranslatePipe } from '@ngx-translate/core';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LandingFooterComponent,
  LandingFooterGroup,
  LandingFooterLegalLink,
} from '../../components/landing-footer/landing-footer.component';

import { AnimationService } from '../../../../core/services/animation.service';
import {
  HugeiconsIconName,
  IconComponent,
} from '../../../../shared/components/icon/icon.component';
import { LandingHeroMockupComponent } from '../../components/landing-hero-mockup/landing-hero-mockup.component';
import {
  LandingNavbarComponent,
  LandingNavLink,
} from '../../components/landing-navbar/landing-navbar.component';
import { LanguageService } from '../../../../core/services/language.service';

interface HeroBadge {
  readonly label: string;
}

interface ScheduleItem {
  readonly time: string;
  readonly title: string;
  readonly highlighted: boolean;
}

interface CalendarDay {
  readonly day: number;
  readonly active: boolean;
  readonly hasEvent: boolean;
}

interface TravelerProgress {
  readonly name: string;
  readonly status: string;
  readonly distance: string;
  readonly progress: number;
}

type StepIcon = 'user' | 'calendar' | 'bell' | 'target';

interface JourneyStep {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly icon: StepIcon;
}

interface StatCard {
  readonly value: string;
  readonly label: string;
  readonly description: string;
}

interface PricingPlan {
  readonly name: string;
  readonly price: string;
  readonly tag: string;
  readonly cta: string;
  readonly popular: boolean;
  readonly features: readonly string[];
}

interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

interface CreatorProfile {
  readonly name: string;
  readonly role: string;
  readonly bio: string;
  readonly image: string;
  readonly socials: readonly CreatorSocial[];
}

interface CreatorSocial {
  readonly label: string;
  readonly href: string;
  readonly icon: HugeiconsIconName;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [TranslatePipe, RouterLink,
    LandingNavbarComponent,
    LandingHeroMockupComponent,
    LandingFooterComponent,
    IconComponent,],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit {
  private readonly animationService = inject(AnimationService);
  readonly language = inject(LanguageService);

  readonly navLinks: readonly LandingNavLink[] = [
    { href: '#features', label: 'landing.navigation.features' },
    { href: '#how', label: 'landing.navigation.howItWorks' },
    { href: '#pricing', label: 'landing.navigation.pricing' },
    { href: '#faq', label: 'landing.navigation.faq' },
  ];

  readonly heroBadges: readonly HeroBadge[] = [
    { label: 'landing.hero.noCard' },
    { label: 'landing.hero.bilingual' },
    { label: 'landing.hero.trial' },
  ];

  readonly trustedBrands: readonly string[] = [
    'NorthStar',
    'Bayan',
    'Kayan Co.',
    'Marsa',
    'Tafkeer',
    'Nibras',
  ];

  readonly scheduleItems: readonly ScheduleItem[] = [
    { time: '10:30', title: 'landing.demo.developmentMeeting', highlighted: true },
    { time: '13:00', title: 'landing.demo.designReview', highlighted: false },
    { time: '16:15', title: 'landing.demo.technicalWorkshop', highlighted: false },
  ];

  readonly calendarWeekDays = [
    'landing.week.saturday',
    'landing.week.sunday',
    'landing.week.monday',
    'landing.week.tuesday',
    'landing.week.wednesday',
    'landing.week.thursday',
    'landing.week.friday',
  ] as const;

  readonly calendarDays: readonly CalendarDay[] = Array.from(
    { length: 21 },
    (_, index): CalendarDay => {
      const day = index + 1;

      return {
        day,
        active: day === 11,
        hasEvent: day === 9 || day === 15 || day === 20,
      };
    },
  );

  readonly travelers: readonly TravelerProgress[] = [
    { name: 'Nader', status: 'landing.demo.onTheWay', distance: '1.2 km', progress: 72 },
    { name: 'Basma', status: 'landing.demo.leaveNow', distance: '3.5 km', progress: 36 },
    { name: 'Maram', status: 'landing.demo.arrived', distance: '0.8 km', progress: 100 },
  ];

  readonly analyticsBars = [40, 60, 35, 78, 90, 55, 82] as const;

  readonly journeySteps: readonly JourneyStep[] = [
    {
      id: 1,
      title: 'landing.steps.create.title',
      description: 'landing.steps.create.description',
      icon: 'user',
    },
    {
      id: 2,
      title: 'landing.steps.appointments.title',
      description: 'landing.steps.appointments.description',
      icon: 'calendar',
    },
    {
      id: 3,
      title: 'landing.steps.alerts.title',
      description: 'landing.steps.alerts.description',
      icon: 'bell',
    },
    {
      id: 4,
      title: 'landing.steps.arrive.title',
      description: 'landing.steps.arrive.description',
      icon: 'target',
    },
  ];

  readonly stats: readonly StatCard[] = [
    {
      value: '42%',
      label: 'landing.stats.punctuality.label',
      description: 'landing.stats.punctuality.description',
    },
    {
      value: '69%',
      label: 'landing.stats.stress.label',
      description: 'landing.stats.stress.description',
    },
    {
      value: '1337+',
      label: 'landing.stats.routes.label',
      description: 'landing.stats.routes.description',
    },
  ];

  readonly pricingPlans: readonly PricingPlan[] = [
    {
      name: 'landing.pricing.free.name',
      price: '0',
      tag: 'landing.pricing.free.tag',
      cta: 'landing.pricing.free.cta',
      popular: false,
      features: [
        'landing.pricing.features.unlimitedAppointments',
        'landing.pricing.features.threeAlerts',
        'landing.pricing.features.googleCalendar',
        'landing.pricing.features.basicDashboard',
      ],
    },
    {
      name: 'landing.pricing.pro.name',
      price: '200',
      tag: 'landing.pricing.pro.tag',
      cta: 'landing.pricing.pro.cta',
      popular: true,
      features: [
        'landing.pricing.features.unlimitedAlerts',
        'landing.pricing.features.liveRoutes',
        'landing.pricing.features.weeklyAnalytics',
        'landing.pricing.features.deviceSync',
      ],
    },
    {
      name: 'landing.pricing.business.name',
      price: '500',
      tag: 'landing.pricing.business.tag',
      cta: 'landing.pricing.business.cta',
      popular: false,
      features: [
        'landing.pricing.features.allPro',
        'landing.pricing.features.teamTrips',
        'landing.pricing.features.adminDashboard',
        'landing.pricing.features.support',
      ],
    },
  ];

  readonly faqs: readonly FaqItem[] = [
    {
      question: 'landing.faq.free.question',
      answer: 'landing.faq.free.answer',
    },
    {
      question: 'landing.faq.departure.question',
      answer: 'landing.faq.departure.answer',
    },
    {
      question: 'landing.faq.language.question',
      answer: 'landing.faq.language.answer',
    },
    {
      question: 'landing.faq.calendar.question',
      answer: 'landing.faq.calendar.answer',
    },
  ];

  readonly creators: readonly CreatorProfile[] = [
    {
      name: 'Nader Mohamed',
      role: 'Front-end Developer',
      bio: 'landing.team.nader',
      image: '/images/nader.png',
      socials: [
        { label: 'Behance', href: '#', icon: 'Behance01Icon' },
        { label: 'Dribbble', href: '#', icon: 'DribbbleIcon' },
        { label: 'LinkedIn', href: '#', icon: 'Linkedin01Icon' },
      ],
    },
    {
      name: 'Basma Gamal',
      role: 'Front-end Lead',
      bio: 'landing.team.basma',
      image: '/images/basma.png',
      socials: [
        { label: 'LinkedIn', href: '#', icon: 'Linkedin01Icon' },
        { label: 'X', href: '#', icon: 'NewTwitterIcon' },
        { label: 'Mail', href: 'mailto:team@plango.app', icon: 'Mail01Icon' },
      ],
    },
    {
      name: 'Jehad Ashour',
      role: 'UI/UX Designer',
      bio: 'landing.team.jehad',
      image: '/images/jehad.png',
      socials: [
        { label: 'Kaggle', href: '#', icon: 'AiBrain02Icon' },
        { label: 'GitHub', href: '#', icon: 'Github01Icon' },
        { label: 'LinkedIn', href: '#', icon: 'Linkedin01Icon' },
      ],
    },
    {
      name: 'Ahmed Hisham',
      role: 'Back-end Lead',
      bio: 'landing.team.ahmed',
      image: '/images/ahmed.png',
      socials: [
        { label: 'GitHub', href: '#', icon: 'Github01Icon' },
        { label: 'LinkedIn', href: '#', icon: 'Linkedin01Icon' },
        { label: 'Portfolio', href: '#', icon: 'Link01Icon' },
      ],
    },
    {
      name: 'Areej Hassanein',
      role: 'Back-end Developer',
      bio: 'landing.team.areej',
      image: '/images/areej.png',
      socials: [
        { label: 'GitHub', href: '#', icon: 'Github01Icon' },
        { label: 'LinkedIn', href: '#', icon: 'Linkedin01Icon' },
        { label: 'Mail', href: 'mailto:team@plango.app', icon: 'Mail01Icon' },
      ],
    },
    {
      name: 'Maram Amer',
      role: 'Back-end Developer',
      bio: 'landing.team.maram',
      image: '/images/maram.png',
      socials: [
        { label: 'GitHub', href: '#', icon: 'Github01Icon' },
        { label: 'LinkedIn', href: '#', icon: 'Linkedin01Icon' },
        { label: 'Docs', href: '#', icon: 'File01Icon' },
      ],
    },
  ];

  readonly footerGroups: readonly LandingFooterGroup[] = [
    {
      title: 'landing.footer.quickLinks',
      links: [
        'landing.footer.about',
        'landing.navigation.features',
        'landing.navigation.pricing',
        'landing.navigation.faq',
      ],
    },
    {
      title: 'landing.footer.product',
      links: [
        'navigation.dashboard',
        'navigation.map',
        'navigation.events',
        'navigation.settings',
      ],
    },
    {
      title: 'landing.footer.support',
      links: [
        'landing.footer.help',
        'landing.footer.contact',
        'landing.footer.complaints',
        'landing.footer.status',
      ],
    },
  ];

  readonly legalLinks: readonly LandingFooterLegalLink[] = [
    { label: 'landing.footer.terms', href: '#' },
    { label: 'landing.footer.privacy', href: '#' },
    { label: 'landing.footer.usage', href: '#' },
  ];

  readonly openFaqIndex = signal(0);
  readonly copyrightText = 'landing.footer.copyright';

  ngOnInit(): void {
    this.animationService.initAos();
  }

  toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? -1 : index));
  }

  isFaqOpen(index: number): boolean {
    return this.openFaqIndex() === index;
  }
}
