import { TranslatePipe } from '@ngx-translate/core';
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-header',
  imports: [TranslatePipe],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.css',
})
export class DashboardHeaderComponent {

}
