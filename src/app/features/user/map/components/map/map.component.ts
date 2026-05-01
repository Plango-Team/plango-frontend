import { Component, effect, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import maplibregl, { Map , NavigationControl , Marker , Popup, GeoJSONSource} from 'maplibre-gl'
import { MapStore } from '../../map.store';
import { IAppointment } from '../../interfaces/Imap';
import { MapService } from '../../services/map.service';

@Component({
  selector: 'app-map',
  imports: [],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnDestroy{
  readonly mapStore = inject(MapStore)
  private mapService = inject(MapService)
  // بغير سينتر الخريطة علي حسب لوكيشن اليوزر من خلال ال flyTo
  public lastFlyTo : {lng : number , lat : number} | null = null
  isMapReady : boolean = false;
  private currentMarkers: Marker[] = [];

  constructor(){
    effect(() => {
      const location = this.mapStore.userLocation();
      if(location && this.map && this.isMapReady){
        const isFirstTime = !this.lastFlyTo
        const distance = this.lastFlyTo ? Math.sqrt(Math.pow(location.lng - this.lastFlyTo.lng , 2)
      + Math.pow(location.lat - this.lastFlyTo.lat , 2)) : 1;
      if(isFirstTime || distance > 0.001){
        this.map.flyTo({
          center : [location.lng , location.lat],
          zoom : 10,
          essential : true,
          duration : 3000
        });
        this.lastFlyTo = location
      }
      }
    })

    effect(() => {
      const route = this.mapStore.currentRoute();
      if(route && this.isMapReady){
        this.drawRouteOnMap(route);
        this.fitMapToPoints(route);
      }
    })

    effect(() => {
     const appointments = this.mapStore.appointments();
     if (this.isMapReady && appointments && appointments.length > 0) {
       this.addMarkers(); 
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
      style: 'https://api.maptiler.com/maps/landscape-v4/style.json?key=o1yZvP8beaDxphCCCwBU', 
      center: [31.2357, 30.0444], 
      zoom: 8,
    });
    // علشان شكل الكوره الارضيه لما نصغر الزوم
    this.map.on('load' , () => {
      this.isMapReady = true;
      this.map.setProjection({type:'globe'});
      this.addMarkers();
      const currentRoute = this.mapStore.currentRoute();
      if(currentRoute){
        this.drawRouteOnMap(currentRoute);
        this.fitMapToPoints(currentRoute);
      }
     }); 

   // زراير التحكم
    this.map.addControl(new NavigationControl({
      visualizePitch : true,
      showCompass : true,
      showZoom : true
    }),
    'top-right'
  );
  this.map.setPitch(45)
  // رسم البوب اب بعد مالخريطه تجهز
  this.map.on('load' , () => {
    this.addMarkers();
  })
  }

  addMarkers(){
    const appointments = this.mapStore.appointments()
    if(!appointments || !this.map) return
    this.currentMarkers.forEach(m => m.remove());
    this.currentMarkers = []
    appointments!.forEach((app , index) => {
      const isNext = index === 0
      const color = isNext? '#d32e18' : 'black'
      const el = document.createElement('div');
      el.className = isNext? 'custom-marker next' : 'custom-marker';
      
      el.innerHTML = `<svg width="40" height="56" viewBox="0 0 40 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C8.95 0 0 8.95 0 20C0 35 20 56 20 56C20 56 40 35 40 20C40 8.95 31.05 0 20 0Z" fill= "${color}"/>
        <circle cx="20" cy="20" r="17" fill="white"/>
        <defs>
        <pattern id="img${app.id}" patternUnits="userSpaceOnUse" width="100%" height="100%">
        <image href="" x="0" y="0" width="40" height="40" preserveAspectRatio="xMidYMid slice"/>
        </pattern>
        </defs>
        <circle cx="20" cy="20" r="16" fill="url(#img${app.id})"/>
      </svg>`;
      const popup = new Popup({offset : [0,-25], closeButton : false , anchor : 'bottom'}).setText(app.title);
      const marker = new Marker({element : el , anchor : 'bottom'}).setLngLat([app.lng , app.lat])
      .setPopup(popup).addTo(this.map);
      marker.getElement().addEventListener('click', () => {
          this.loadRouteForAppointment(app)
      })
      this.currentMarkers.push(marker)
    })
  }

  loadRouteForAppointment(appointment : IAppointment){
   this.mapStore.clearRoute();
    const userLoc = this.mapStore.userLocation();
    if(userLoc){
      this.mapStore.loadRoute(
        {lat:userLoc.lat , lng:userLoc.lng},
        {lat:appointment.lat , lng:appointment.lng}
      )
    }
  }

  drawRouteOnMap(coordinates: number[][])
  {
    if(!this.map || !coordinates || coordinates.length === 0) return
    const geoJsonData = {
      type: 'Feature',
      properties: {},
      geometry: {type: 'LineString', coordinates: coordinates}
    } as const
    const source = this.map.getSource('route') as GeoJSONSource;
    if(source){
      source.setData(geoJsonData);
    }else{
      this.map.addSource('route', {type:'geojson',data:geoJsonData});
      this.map.addLayer({
        id:'route-line',
        type:'line',
        source:'route',
        layout:{'line-join':'round','line-cap':'round'},
        paint:{
          'line-color':'#38bdf8',
          'line-width': 16,
          'line-opacity':0.9
        }
      })
    }
  }

  fitMapToPoints(coordinates: number[][]) {
  if (!this.map || coordinates.length === 0) return;
  const bounds = coordinates.reduce((bounds,coord) => {
    return bounds.extend(coord as [number,number])
  }, new maplibregl.LngLatBounds(coordinates[0] as [number , number], coordinates[0] as [number,number])
)
  this.map.fitBounds(bounds, { padding: 50, duration: 1000 });
}

ngOnDestroy(): void {
  this.mapStore.clearLocationTracking();
  this.map.remove()
}
}
