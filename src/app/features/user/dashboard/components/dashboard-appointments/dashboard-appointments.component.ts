import { Component, inject, computed } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { RouterLink } from "@angular/router";
import { AppointmentsStore } from '../../../appointments/appointments.store';

@Component({
  selector: 'app-dashboard-appointments',
  imports: [IconComponent, RouterLink],
  templateUrl: './dashboard-appointments.component.html',
  styleUrl: './dashboard-appointments.component.css',
})
export class DashboardAppointmentsComponent {
  private appointmentStore = inject(AppointmentsStore);

  upcomingAppointments = computed(() => {
    return this.appointmentStore.appointments().slice()
      .sort((a, b) => {
        return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
      }).slice(0, 3);
  });

  getMinutesRemaining(arrivalTime:string | Date) : number{
  if (!arrivalTime) return -1;
  const now = new Date();
  const eventTime = new Date(arrivalTime);
  const diffMins = eventTime.getTime() - now.getTime();
  return Math.floor(diffMins / (1000 * 60))
}

formatDate(arrivalTime: string | Date): string {
  if (!arrivalTime) return '';
  const dateObj = new Date(arrivalTime);
  return dateObj.toISOString().split('T')[0]; 
}
formatTime(arrivalTime: string | Date): string {
  if (!arrivalTime) return '';
  const dateObj = new Date(arrivalTime);
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
}
