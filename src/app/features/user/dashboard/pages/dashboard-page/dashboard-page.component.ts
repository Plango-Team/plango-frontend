import { Component, inject } from '@angular/core';
import { DashboardAppointmentsComponent } from '../../components/dashboard-appointments/dashboard-appointments.component';
import { CardComponent } from "../../../../../shared/ui/card/card.component";
import { IconComponent } from "../../../../../shared/components/icon/icon.component";
import { authStore } from '../../../../auth/auth.store';

@Component({
  imports: [DashboardAppointmentsComponent, CardComponent, IconComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  public authStore = inject(authStore);
}
