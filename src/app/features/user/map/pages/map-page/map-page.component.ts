import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MapComponent } from "../../components/map/map.component";
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { CardComponent } from "../../../../../shared/ui/card/card.component";
import { MapStore } from '../../map.store';
import { TripsComponent } from '../../components/trips/trips.component';
import { InvitModalComponent } from '../../components/invit-modal/invit-modal.component';
import { AppointmentsStore } from '../../../appointments/appointments.store';
@Component({
  selector: 'app-map-page',
  imports: [MapComponent, IconComponent, CardComponent, TripsComponent, InvitModalComponent, RouterLink],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.css',
})
export class MapPageComponent {
  mapStore = inject(MapStore)
  appStore = inject(AppointmentsStore)
  isFullScreen = signal(false)
  nextAppointment = computed(() => this.mapStore.nextAppointment());
  nearbyEventsCount = computed(() => {
    const now = Date.now();
    const twoHoursFromNow = now + 2 * 60 * 60 * 1000;
    return this.mapStore
      .mapEvents()
      .filter((event) => {
        const start = new Date(event.startDate).getTime();
        return start >= now && start <= twoHoursFromNow;
      }).length;
  });
  @ViewChild(MapComponent)
  mapComponent!:MapComponent;

  toggelFullScreen(){
    this.isFullScreen.update(prev => ! prev)
  }

  showNextRoute(): void {
    const appointment = this.nextAppointment();
    if (!appointment || !this.mapComponent) return;
    this.toggelFullScreen();
    this.mapComponent.loadRouteForAppointment(appointment);
  }
  
}
