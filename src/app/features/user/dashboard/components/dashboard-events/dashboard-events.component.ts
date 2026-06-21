import { TranslatePipe } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsStore } from '../../../events/events.store';
import { IEvent } from '../../../events/interfaces/Ievents';

@Component({
  selector: 'app-dashboard-events',
  imports: [TranslatePipe, DatePipe, RouterLink],
  templateUrl: './dashboard-events.component.html',
  styleUrl: './dashboard-events.component.css',
})
export class DashboardEventsComponent {
  readonly eventsStore = inject(EventsStore);

  readonly events = computed(() =>
    this.eventsStore
      .events()
      .filter((event) => new Date(event.endDate).getTime() >= Date.now())
      .slice(0, 3),
  );

  locationLabel(event: IEvent): string {
    return event.location?.addressName || event.location?.fullAddress || 'الموقع غير محدد';
  }
}
