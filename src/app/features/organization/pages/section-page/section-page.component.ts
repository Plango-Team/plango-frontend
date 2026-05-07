import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-organization-section-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './section-page.component.html',
})
export class OrganizationSectionPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly teamMembers = [
    { name: 'نادر محمد', role: 'Owner', status: 'نشط' },
    { name: 'بسمة جمال', role: 'Event manager', status: 'قيد المراجعة' },
    { name: 'أريج حسنين', role: 'Operations', status: 'نشط' },
  ];

  readonly eventRows = [
    { title: 'ورشة مساء الخميس', attendees: '84 / 100', status: 'Confirmed' },
    { title: 'جلسة المتابعة', attendees: '18 / 25', status: 'Draft' },
    { title: 'لقاء الشركاء', attendees: '42 / 60', status: 'Published' },
  ];

  get section(): string {
    return this.route.snapshot.data['section'] ?? 'section';
  }

  get title(): string {
    return this.route.snapshot.data['title'] ?? 'القسم';
  }

  get description(): string {
    return this.route.snapshot.data['description'] ?? '';
  }
}
