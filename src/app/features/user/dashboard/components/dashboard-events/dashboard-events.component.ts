import { Component, signal } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-dashboard-events',
  imports: [IconComponent],
  templateUrl: './dashboard-events.component.html',
  styleUrl: './dashboard-events.component.css',
})
export class DashboardEventsComponent {
  events = signal<any[]>([
    {
      id : 1,
      title : 'مؤتمر التقني العربي',
      date : 'مارس 31',
      location : 'القاهرة'
    },
    {
      id : 2,
      title : 'ورشة عمل تصميم',
      date : 'فبراير 2',
      location : 'أونلاين'
    },
  ])

}
