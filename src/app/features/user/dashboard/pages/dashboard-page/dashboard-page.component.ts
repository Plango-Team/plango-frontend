import { Component } from '@angular/core';
import { DashboardHeaderComponent } from "../../components/dashboard-header/dashboard-header.component";
import { DashboardCardComponent } from "../../components/dashboard-card/dashboard-card.component";
import { DashboardAppointmentsComponent } from '../../components/dashboard-appointments/dashboard-appointments.component';
import { DashboardEventsComponent } from '../../components/dashboard-events/dashboard-events.component';
import { DashboardCalenderSumComponent } from "../../components/dashboard-calender-sum/dashboard-calender-sum.component";
import { DashboardNotificationComponent } from "../../components/dashboard-notification/dashboard-notification.component";
import { DashboardMapComponent } from '../../components/dashboard-map/dashboard-map.component';

@Component({
  selector: 'app-dashboard-page',
  imports: [DashboardHeaderComponent, DashboardCardComponent, DashboardAppointmentsComponent, DashboardEventsComponent, DashboardCalenderSumComponent, DashboardMapComponent, DashboardNotificationComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {

}
