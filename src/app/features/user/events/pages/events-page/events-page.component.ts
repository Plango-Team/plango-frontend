import { Component, inject } from '@angular/core';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { CardComponent } from '../../../../../shared/ui/card/card.component';
import { EventsStore } from '../../events.store';
import { DatePipe } from '@angular/common';
import { EventModalComponent } from '../../components/event-modal/event-modal.component';

@Component({
  selector: 'app-events-page',
  imports: [CardComponent,DatePipe,IconComponent,EventModalComponent],
  templateUrl: './events-page.component.html',
  styleUrl: './events-page.component.css',
})
export class EventsPageComponent {
store = inject(EventsStore)
cardStatuses: { [eventId: number]: string } = {};

updateCardStatus(eventId: number, status: string) {
  this.cardStatuses[eventId] = status;
}


}
