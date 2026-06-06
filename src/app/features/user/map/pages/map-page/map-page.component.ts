import { Component, effect, inject, signal, ViewChild, viewChild } from '@angular/core';
import { MapComponent } from "../../components/map/map.component";
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { CardComponent } from "../../../../../shared/ui/card/card.component";
import { MapStore } from '../../map.store';
import { TripsComponent } from '../../components/trips/trips.component';
import { InvitModalComponent } from '../../components/invit-modal/invit-modal.component';
@Component({
  selector: 'app-map-page',
  imports: [MapComponent, IconComponent, CardComponent, TripsComponent,InvitModalComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.css',
})
export class MapPageComponent {
  mapStore = inject(MapStore)
  isFullScreen = signal(false)
  @ViewChild(MapComponent)
  mapComponent!:MapComponent;

  toggelFullScreen(){
    this.isFullScreen.update(prev => ! prev)
  }
  
}
