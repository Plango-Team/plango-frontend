import { Component, signal } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-dashboard-notification',
  imports: [IconComponent],
  templateUrl: './dashboard-notification.component.html',
  styleUrl: './dashboard-notification.component.css',
})
export class DashboardNotificationComponent {
  notifictions = signal<any[]>([
    {
      id : 1,
      title : 'موعدك القادم بعد 30 دقيقة',
      date : 'منذ قليل',
      iconName : 'Notification01FreeIcons'
    },
    {
      id : 2,
      title : 'تمت دعوتك لفعالية "إفطار عمل"',
      date : 'منذ ساعة',
      iconName : 'FileAddFreeIcons'
    },
    {
      id : 3,
      title : 'مهمة "إرسال التقرير" تنتهي قريباً',
      date : 'منذ ساعتين',
      iconName : 'CheckmarkCircle03Icon'
    }
  ])
}
