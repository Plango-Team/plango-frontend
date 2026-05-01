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
  imports: [
    RouterLink,
    LandingNavbarComponent,
    LandingHeroMockupComponent,
    LandingFooterComponent,
    IconComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnInit {
  private readonly animationService = inject(AnimationService);

  readonly navLinks: readonly LandingNavLink[] = [
    { href: '#features', label: 'المميزات' },
    { href: '#how', label: 'كيف يعمل' },
    { href: '#pricing', label: 'الأسعار' },
    { href: '#faq', label: 'الأسئلة' },
  ];

  readonly heroBadges: readonly HeroBadge[] = [
    { label: 'بدون بطاقة ائتمان' },
    { label: 'دعم كامل للغة العربية' },
    { label: 'تجربة Pro لمدة 14 يوم' },
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
    { time: '10:30', title: 'اجتماع دوري مع فريق التطوير', highlighted: true },
    { time: '13:00', title: 'مراجعة التصاميم الجديدة', highlighted: false },
    { time: '16:15', title: 'ورشة عمل تقنية', highlighted: false },
  ];

  readonly calendarWeekDays = ['س', 'أ', 'ا', 'ث', 'ر', 'خ', 'ج'] as const;

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
    { name: 'نادر', status: 'في الطريق', distance: '1.2 كم', progress: 72 },
    { name: 'بسمة', status: 'غادر الآن', distance: '3.5 كم', progress: 36 },
    { name: 'مرام', status: 'وصلت', distance: '0.8 كم', progress: 100 },
  ];

  readonly analyticsBars = [40, 60, 35, 78, 90, 55, 82] as const;

  readonly journeySteps: readonly JourneyStep[] = [
    {
      id: 1,
      title: 'أنشئ حسابك',
      description: 'سجل في دقائق، وحدد تفضيلات التنقل والمدينة التي تتحرك داخلها.',
      icon: 'user',
    },
    {
      id: 2,
      title: 'أضف مواعيدك',
      description: 'أدخل مواعيدك يدويًا أو اربط تقويم Google لتظهر كل التزاماتك تلقائياً.',
      icon: 'calendar',
    },
    {
      id: 3,
      title: 'احصل على التنبيهات',
      description: 'PlanGo يقترح وقت المغادرة المثالي اعتماداً على الزحام والطقس والمسار.',
      icon: 'bell',
    },
    {
      id: 4,
      title: 'وصل في الموعد',
      description: 'تابع يومك بثقة أقل توتراً وتنظيم أعلى، من أول مشوار لآخر موعد.',
      icon: 'target',
    },
  ];

  readonly stats: readonly StatCard[] = [
    {
      value: '42%',
      label: 'تحسن في الالتزام بالمواعيد',
      description: 'متوسط الزيادة في دقة الوصول بعد شهر استخدام.',
    },
    {
      value: '69%',
      label: 'تقليل التوتر اليومي',
      description: 'من المستخدمين قالوا إن يومهم أصبح أكثر هدوءاً.',
    },
    {
      value: '1337+',
      label: 'رحلة محسنة يومياً',
      description: 'يتم تحسينها باستخدام التنبؤ الذكي للمسارات.',
    },
  ];

  readonly pricingPlans: readonly PricingPlan[] = [
    {
      name: 'مجاني',
      price: '0',
      tag: 'للبداية',
      cta: 'ابدأ الآن',
      popular: false,
      features: [
        'مواعيد بلا حدود',
        '3 تنبيهات ذكية يومياً',
        'مزامنة مع Google Calendar',
        'لوحة متابعة أساسية',
      ],
    },
    {
      name: 'مميز',
      price: '200',
      tag: 'الأكثر شيوعاً',
      cta: 'اشترك الآن',
      popular: true,
      features: [
        'تنبيهات ذكية بلا حدود',
        'مسارات بديلة في الوقت الفعلي',
        'تحليلات أسبوعية لإنتاجيتك',
        'مزامنة بين كل الأجهزة',
      ],
    },
    {
      name: 'عمل',
      price: '500',
      tag: 'للفرق',
      cta: 'تواصل معنا',
      popular: false,
      features: ['كل مزايا المميز', 'رحلات مشتركة للفرق', 'لوحة تحكم إدارية', 'دعم فني 24/7'],
    },
  ];

  readonly faqs: readonly FaqItem[] = [
    {
      question: 'هل PlanGo مجاني فعلاً؟',
      answer:
        'نعم، الخطة المجانية ستظل متاحة دائماً. يمكنك الترقية فقط إذا احتجت المزايا المتقدمة.',
    },
    {
      question: 'كيف يحسب PlanGo وقت المغادرة؟',
      answer:
        'يعتمد على بيانات المرور والطقس في الوقت الفعلي مع تفضيلاتك للوصول المبكر ووسيلة التنقل.',
    },
    {
      question: 'هل التطبيق يدعم اللغة العربية بالكامل؟',
      answer: 'نعم، التجربة مبنية بالعربية أولاً مع دعم RTL وخطوط عربية محسنة للقراءة الطويلة.',
    },
    {
      question: 'هل يمكن ربطه مع Google Calendar؟',
      answer:
        'نعم، المزامنة ثنائية الاتجاه متاحة، ويمكن إيقافها أو تخصيصها من الإعدادات في أي وقت.',
    },
  ];

  readonly creators: readonly CreatorProfile[] = [
    {
      name: 'Nader Mohamed',
      role: 'Front-end Developer',
      bio: 'يقود تصميم تجربة المنتج والهوية البصرية لرحلة المستخدم.',
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
      bio: 'تضمن جودة المنصة واكتشاف المشكلات قبل الإطلاق.',
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
      bio: 'يعمل على نماذج التنبؤ بالازدحام واقتراح وقت المغادرة.',
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
      bio: 'مسؤول بناء الواجهات التفاعلية وتجربة المستخدم على الويب.',
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
      bio: 'تعمل على تجربة الموبايل وسلاسة التنبيهات أثناء التنقل.',
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
      bio: 'تدير خدمات البيانات وتحسين أداء واجهات التكامل.',
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
      title: 'روابط سريعة',
      links: ['عن بلان جو', 'المميزات', 'الأسعار', 'الأسئلة الشائعة'],
    },
    {
      title: 'المنتج',
      links: ['لوحة التحكم', 'الخريطة', 'الفعاليات', 'الإعدادات'],
    },
    {
      title: 'الدعم',
      links: ['مركز المساعدة', 'تواصل معنا', 'الشكاوى', 'حالة الخدمة'],
    },
  ];

  readonly legalLinks: readonly LandingFooterLegalLink[] = [
    { label: 'الشروط', href: '#' },
    { label: 'الخصوصية', href: '#' },
    { label: 'سياسة الاستخدام', href: '#' },
  ];

  readonly openFaqIndex = signal(0);
  readonly copyrightText = `© ${new Date().getFullYear()} PlanGo - جميع الحقوق محفوظة`;

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
