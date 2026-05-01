import { Component, input } from '@angular/core';
import { IconComponent } from "../../../../../shared/components/icon/icon.component";

@Component({
  selector: 'app-dashboard-card',
  imports: [IconComponent],
  templateUrl: './dashboard-card.component.html',
  styleUrl: './dashboard-card.component.css',
})
export class DashboardCardComponent {
  title = input.required<string>();
  value = input.required<string>();
  iconName = input.required<any>();
  iconColor = input.required<string>();
  iconBackGround = input.required<string>();
}
