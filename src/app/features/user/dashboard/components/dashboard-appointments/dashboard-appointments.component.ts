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
    return this.appointmentStore.appointments()
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 3);
  });

  getMinutesRemaining(date: string, time: string) : number{
  if (!date || !time) return -1;
  const now = new Date();
  const eventTime = new Date(`${date}T${time}`);
  const diffMins = eventTime.getTime() - now.getTime();
  return Math.floor(diffMins / (1000 * 60))
}
}
