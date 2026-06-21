import { TranslatePipe } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { MapComponent } from '../../../map/components/map/map.component';

@Component({
  selector: 'app-dashboard-map',
  imports: [TranslatePipe, IconComponent, MapComponent],
  templateUrl: './dashboard-map.component.html',
  styleUrl: './dashboard-map.component.css',
})
export class DashboardMapComponent {

}
