import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SocialStore } from '../../../social/social.store';
import { authStore } from '../../../../auth/auth.store';

type NetworkTab = 'people' | 'organizations' | 'requests';

type NetworkCard = {
  name: string;
  username: string;
  profileRoute: string[];
  title: string;
  location: string;
  bio: string;
  avatar: string;
  badge: string;
  accentClass: string;
  tags: string[];
  ctaLabel: string;
  secondaryActionLabel?: string;
  showSecondaryAction?: boolean;
};

@Component({
  selector: 'app-network-page',
  imports: [RouterModule],
  templateUrl: './network-page.component.html',
  styleUrl: './network-page.component.css',
})
export class NetworkPageComponent {
  socialStore = inject(SocialStore);
  authStore = inject(authStore);
  activeTab: NetworkTab = 'people';
  searchQuery = '';

  readonly tabs: Array<{ key: NetworkTab; label: string; hint: string }> = [
    { key: 'people', label: 'أشخاص', hint: '30 مقترحاً' },
    { key: 'organizations', label: 'مؤسسات', hint: '8 تتابعها' },
    { key: 'requests', label: 'طلبات', hint: '4 جديدة' },
  ];

  readonly stats = computed(() => {
    const user = this.authStore.user();
    const userId = user?.id ?? null;

    if (!userId) {
      return { following: 0, suggestions: 0, pending: 0 };
    }

    const following = this.socialStore.followingOf(userId);
    const followingIds = new Set(following.map((item) => item.followeeId));
    const suggestions = this.socialStore
      .profiles()
      .filter((profile) => profile.id !== userId && !followingIds.has(profile.id)).length;

    return {
      following: following.length,
      suggestions,
      pending: this.socialStore.pendingRequestsFor(userId).length,
    };
  });

  readonly cardsByTab: Record<NetworkTab, NetworkCard[]> = {
    people: [
      {
        name: 'احمد هشام',
        username: 'ahmed',
        profileRoute: ['/user/profile', 'ahmed'],
        title: 'مصمم تجربة المستخدم',
        location: 'القاهرة، مصر',
        bio: 'أحب تصميم المنتجات البسيطة التي تجعل المهام اليومية أسهل، وأشارك في ورش عمل للابتكار الرقمي.',
        avatar: 'أس',
        badge: '12 مشتركا',
        accentClass: 'from-amber-400 to-orange-500',
        tags: ['UX', 'تصميم', 'منتج'],
        ctaLabel: 'متابعة',
      },
      {
        name: 'بسمة جمال',
        username: 'basma',
        profileRoute: ['/user/profile', 'basma'],
        title: 'مديرة علاقات العملاء',
        location: 'الرياض، السعودية',
        bio: 'تساعد الشركات على بناء المزيد من الثقة مع العملاء من خلال تجربة مميزة قبل وبعد البيع.',
        avatar: 'نع',
        badge: '9 مشتركا',
        accentClass: 'from-fuchsia-500 to-pink-500',
        tags: ['بيع', 'علاقات', 'استراتيجية'],
        ctaLabel: 'متابعة',
      },
      {
        name: 'اريج حسنيين',
        username: 'areej',
        profileRoute: ['/user/profile', 'areej'],
        title: 'باحث سوقي',
        location: 'دبي، الإمارات',
        bio: 'يعمل على فك رموز اتجاهات السوق وتقديم رؤى تساعد الفرق على اتخاذ القرار بثقة أكبر.',
        avatar: 'يق',
        badge: '7 مشتركا',
        accentClass: 'from-sky-500 to-cyan-400',
        tags: ['تحليل', 'سوق', 'ذكاء'],
        ctaLabel: 'متابعة',
      },
    ],
    organizations: [
      {
        name: 'PlanGo org',
        username: 'plango_organization',
        profileRoute: ['/user/profile', 'plango_organization'],
        title: 'منصة تنظيم رحلات الأعمال',
        location: 'القاهرة، مصر',
        bio: 'تطوير أدوات ذكية لتنسيق الفعاليات والموارد بطرق أكثر سلاسة للمجموعات العاملة عن بُعد.',
        avatar: 'PG',
        badge: 'مؤسسة نشطة',
        accentClass: 'from-emerald-500 to-teal-400',
        tags: ['سفر', 'مؤسسات', 'تقنية'],
        ctaLabel: 'تابع المؤسسة',
      },
      {
        name: 'Dev Cairo',
        username: 'devcairo',
        profileRoute: ['/user/profile', 'devcairo'],
        title: 'مختبرات تجارب العملاء',
        location: 'الرياض، السعودية',
        bio: 'تجربات رقمية تساعد الشركات على فهم سلوك المستخدم وتحويله إلى منتجات أكثر وضوحاً.',
        avatar: 'BL',
        badge: 'موصى بها',
        accentClass: 'from-violet-500 to-purple-500',
        tags: ['تحويل', 'تحليل', 'عملاء'],
        ctaLabel: 'تابع المؤسسة',
      },
      {
        name: 'Cairo UX Community',
        username: 'uxcairo',
        profileRoute: ['/user/profile', 'uxcairo'],
        title: 'وكالة محتوى وإعلانات',
        location: 'دبي، الإمارات',
        bio: 'تقدّم مفاهيم إبداعية للحملات الرقمية مع التركيز على العرض والروابط القوية مع الجمهور.',
        avatar: 'NC',
        badge: 'مؤسسة متخصصة',
        accentClass: 'from-rose-500 to-red-500',
        tags: ['إعلام', 'محتوى', 'حملات'],
        ctaLabel: 'تابع المؤسسة',
      },
    ],
    requests: [
      {
        name: 'نادر محمد',
        username: 'nader',
        profileRoute: ['/user/profile', 'nader'],
        title: 'منسقة فعاليات',
        location: 'جدة، السعودية',
        bio: 'ترغب في التعاون في تنظيم فعاليات متخصصة وتبادل الفرص المهنية مع خبراء المجال.',
        avatar: 'مه',
        badge: 'طلب جديد',
        accentClass: 'from-indigo-500 to-blue-500',
        tags: ['فعاليات', 'تنسيق', 'شبكات'],
        ctaLabel: 'قبول',
        secondaryActionLabel: 'رفض',
        showSecondaryAction: true,
      },
      {
        name: 'مرام عامر',
        username: 'maram',
        profileRoute: ['/user/profile', 'maram'],
        title: 'مصمم جرافيك',
        location: 'الظهران، السعودية',
        bio: 'يقدم حلول هوية بصرية للشركات الناشئة ويبحث عن شراكات مع فرق تسويقية.',
        avatar: 'سز',
        badge: 'طلب متابعة',
        accentClass: 'from-lime-500 to-green-500',
        tags: ['هوية', 'تصميم', 'تسويق'],
        ctaLabel: 'قبول',
        secondaryActionLabel: 'رفض',
        showSecondaryAction: true,
      },
      {
        name: 'جهاد عاشور',
        username: 'jehad',
        profileRoute: ['/user/profile', 'jehad'],
        title: 'محلل علاقات عامة',
        location: 'عمان، الأردن',
        bio: 'تبحث عن مزيد من التواصل مع فرق التواصل الاجتماعي والخبراء في بناء العلامات.',
        avatar: 'لب',
        badge: 'انتظار الموافقة',
        accentClass: 'from-yellow-500 to-amber-400',
        tags: ['علاقات عامة', 'علامة', 'تواصل'],
        ctaLabel: 'قبول',
        secondaryActionLabel: 'رفض',
        showSecondaryAction: true,
      },
    ],
  };

  get currentCards(): NetworkCard[] {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return this.cardsByTab[this.activeTab];
    }

    return this.cardsByTab[this.activeTab].filter((card) => {
      const haystack = `${card.name} ${card.title} ${card.bio} ${card.location}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  selectTab(tab: NetworkTab): void {
    this.activeTab = tab;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
  }
}
