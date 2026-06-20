import {
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import maplibregl, { Map, Marker, Popup, GeoJSONSource } from 'maplibre-gl';
import { MapStore } from '../../map.store';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { MapService } from '../../services/map.service';
import { environment } from '../../../../../../environments/environment';
import { Appointment } from '../../../appointments/interfaces/IAppointment';

@Component({
  selector: 'app-map',
  imports: [IconComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnDestroy {
  readonly mapStore = inject(MapStore);
  mapService = inject(MapService)
  public lastFlyTo: { lng: number; lat: number } | null = null;
  isMapReady: boolean = false;
  userMarker: Marker | null = null;
  private currentMarkers: Marker[] = [];
  private currentEvents: Marker[] = [];
  isLayersOpen = signal(false);
  layers = signal({
    appointments: true,
    events: true,
  });
  searchRes : any[] = []
    showDropDown = false

  constructor() {
    this.mapStore.getCurrentLocation();
    effect(() => {
      const location = this.mapStore.userLocation();
      if (location && this.map && this.isMapReady) {
        const isFirstTime = !this.lastFlyTo;
        const distance = this.lastFlyTo
          ? Math.sqrt(
              Math.pow(location.lng - this.lastFlyTo.lng, 2) +
                Math.pow(location.lat - this.lastFlyTo.lat, 2),
            )
          : 1;
        if (isFirstTime || distance > 0.001) {
          this.recenter();
        }
      }
    });

    effect(() => {
      const route = this.mapStore.currentRoute();
      if (route && this.isMapReady) {
        this.drawRouteOnMap(route);
        this.fitMapToPoints(route);
      }
    });

    effect(() => {
      this.layers();
      this.mapStore.sortedAppointments();
      this.mapStore.mapEvents();
      const location = this.mapStore.userLocation();
      if (this.isMapReady) {
        if (location) {
          this.addUserMarker(location.lng, location.lat);
        }
        this.addMarkers();
        this.addEventsLayer();
      }
    });
  }
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  map!: Map;

  ngAfterViewInit() {
    // init map
    this.map = new Map({
      container: this.mapContainer.nativeElement,
      // ال map style
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${environment.mapTilerKey}`,
      center: [31.2357, 30.0444],
      zoom: 10,
    });
    this.map.on('load', () => {
      this.isMapReady = true;
      // علشان شكل الكوره الارضيه لما نصغر الزوم
      this.map.setProjection({ type: 'globe' });
      this.addMarkers();
      this.addEventsLayer();
      const currentRoute = this.mapStore.currentRoute();
      if (currentRoute) {
        this.drawRouteOnMap(currentRoute);
        this.fitMapToPoints(currentRoute);
      }
      this.map.resize();
    });

    this.map.setPitch(45);
  }

  addUserMarker(lng: number, lat: number) {
    const userLoc = this.mapStore.userLocation();
    if (!userLoc || !this.map) return;
    if (this.userMarker) {
      this.userMarker.setLngLat([lng, lat]);
      return;
    }
    const el = document.createElement('div');
    el.innerHTML = `<div class="relative w-10 h-10 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full border-2 border-blue-500 animate-ring"></div> 
      <div class="relative w-3.5 h-3.5 bg-white rounded-full border-2 border-blue-600 shadow-lg z-10"></div>
    </div>`;

    this.userMarker = new Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(this.map);
  }

  addMarkers() {
    const appointments = this.mapStore.sortedAppointments();
    if (!appointments || !this.map) return;
    this.currentMarkers.forEach((m) => m.remove());
    this.currentMarkers = [];
    if (!this.layers().appointments) return;
    appointments.forEach((app, index) => {
      const isNext = index === 0;
      const customCss = isNext ? 'bg-primary-500 animate-popup' : 'bg-black';
      const el = document.createElement('div');
      el.className = `flex flex-col item-center gap-1 cursor-pointer custom-marker`;

      el.innerHTML = `<div class="w-8 h-8 rounded-full ${customCss} flex items-center justify-center shadow-lg border-2 border-white">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21C12 21 20 15 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 15 12 21 12 21Z" 
            stroke="white" 
            stroke-width="1.5" 
            fill="none"/>
      <circle cx="12" cy="9" r="3" 
              stroke="white" 
              stroke-width="1.5" 
              fill="none"/>
    </svg>
  </div>
  
  <span class="text-[10px] font-bold text-black bg-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
    ${app.title} 
  </span>`;
  const coords = app.destinationLocation?.coordinates;
  if(!coords || coords.length < 2) return;
      const marker = new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([coords[0], coords[1]])
        .addTo(this.map);
      marker.getElement().addEventListener('click', () => {
        this.loadRouteForAppointment(app);
      });
      this.currentMarkers.push(marker);
    });
  }

  addEventsLayer() {
    const events = this.mapStore.mapEvents();
    if (!events || !this.map) return;
    this.currentEvents.forEach((m) => m.remove());
    this.currentEvents = [];
    if (!this.layers().events) return;
    events.forEach((event) => {
      const coords = event.location?.coordinates;
      if (!coords || coords.length < 2) return;
      const locationLabel =
        event.location?.addressName || event.location?.fullAddress || '';
      const el = document.createElement('div');
      el.className = `flex flex-col item-center gap-1 cursor-pointer custom-marker`;

      el.innerHTML = `<div class="relative flex flex-col items-center group">
    <div class="relative w-8 h-8 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full border-2 border-orange-500/40 animate-pulse"></div>
      
      <div class="relative w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.5 12.5l2-2M18.5 8.5l-2 2M12.5 14.5l-2 2M8.5 18.5l2-2"/>
  <path d="M12 12l.5-1M12 12l-.5-1M12 12l-1-.5M12 12l-1 .5"/>
  <path d="M12 2v2M2 12h2M12 22v-2M22 12h-2M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M19.07 4.93l-1.41 1.41"/>
</svg>
      </div>
      
      <div class="absolute -bottom-1 w-3 h-3 bg-orange-500 rotate-45 border-r-2 border-b-2 border-white"></div>
    </div>

    <div class="mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
       <span class="text-[10px] font-bold text-black bg-white px-2 py-1 rounded-md shadow-md whitespace-nowrap">
         ${event.title || 'فعالية جديدة'}
       </span>
    </div>
  </div>
;`;
      const marker = new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([coords[0], coords[1]])
        .setPopup(
          new Popup({ offset: 18 }).setHTML(
            `<div dir="rtl" style="font-family:inherit">
              <strong>${event.title}</strong>
              <div style="font-size:12px;margin-top:4px">${locationLabel}</div>
            </div>`,
          ),
        )
        .addTo(this.map);
      marker.getElement().addEventListener('click', () => {
        this.map.flyTo({ center: [coords[0], coords[1]], zoom: 14, duration: 1000 });
      });
      this.currentEvents.push(marker);
    });
  }

  loadRouteForAppointment(appointment: Appointment) {
    this.mapStore.clearRoute();
    this.mapStore.loadRouteFromAppointment(appointment)
  }

  drawRouteOnMap(coordinates: number[][]) {
    if (!this.map || !coordinates || coordinates.length === 0) return;
    const geoJsonData = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coordinates },
    } as const;
    const source = this.map.getSource('route') as GeoJSONSource;
    if (source) {
      source.setData(geoJsonData);
    } else {
      this.map.addSource('route', { type: 'geojson', data: geoJsonData });
      this.map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#891e10',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8,
        },
      });
    }
  }

  fitMapToPoints(coordinates: number[][]) {
    if (!this.map || coordinates.length === 0) return;
    const bounds = coordinates.reduce(
      (bounds, coord) => {
        return bounds.extend(coord as [number, number]);
      },
      new maplibregl.LngLatBounds(
        coordinates[0] as [number, number],
        coordinates[0] as [number, number],
      ),
    );
    this.map.fitBounds(bounds, { padding: 50, duration: 1000 });
  }

  recenter() {
    const userLoc = this.mapStore.userLocation();
    if (userLoc && this.map) {
      this.map.flyTo({
        center: [userLoc.lng, userLoc.lat],
        zoom: 10,
        pitch: 45,
        essential: true,
        duration: 3000,
      });
      this.lastFlyTo = userLoc;
    }
  }

  toggelLayersMenue() {
    this.isLayersOpen.update((v) => !v);
  }

  toggelLayers(key: 'appointments' | 'events') {
    this.layers.update((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  onLocationEnter(searchTerm : string){
      if(!searchTerm.trim()){
        this.searchRes = []
        this.showDropDown = false
        return;
      }
      this.mapService.searchLocation(searchTerm).subscribe({
        next:(data) => {
          this.searchRes = data
          this.showDropDown = data.length > 0
        },
        error: (e) => {
          // console.error('Error searching location:', e);
          this.searchRes = []
          this.showDropDown = false
        }
      })
  }
  
  selectLocation(loc : any){
    this.map.flyTo({
      center:[loc.lng , loc.lat],
      zoom:14,
      essential:true,
      duration:2000
    })
      this.searchRes = []
      this.showDropDown = false
  }

  ngOnDestroy(): void {
    // this.mapStore.clearLocationTracking();
    this.map.remove();
  }
}
