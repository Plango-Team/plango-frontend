import { Component, signal } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-dashboard-appointments',
  imports: [IconComponent, RouterLink],
  templateUrl: './dashboard-appointments.component.html',
  styleUrl: './dashboard-appointments.component.css',
})
export class DashboardAppointmentsComponent {
appointments = signal<any[]>([
  {
    id : 1,
    title : 'أذهب إلي الدوام',
    date : 'اليوم , 10:30 ص',
    startTime : '2026-04-01T02:00:00'
  },
  {
    id : 2,
    title : 'اجتماع عمل',
    date : 'اليوم , 2:00 م',
    startTime : '2026-04-01T14:00:00'
  },
  {
    id : 3,
    title : 'موعد طبيب الأسنان',
    date : 'اليوم , 9:15 م',
    startTime : '2026-04-01T21:15:00'
  }
])
getMinutesRemaining(startTime:string) : number{
  const now = new Date();
  const eventTime = new Date(startTime);
  const diffMins = eventTime.getTime() - now.getTime();
  return Math.floor(diffMins / (1000 * 60))
}
}
