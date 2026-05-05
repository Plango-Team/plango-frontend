import { Component, effect, ElementRef, inject, input, OnDestroy, signal, ViewChild } from '@angular/core';
import maplibregl, { Map , NavigationControl , Marker , Popup, GeoJSONSource} from 'maplibre-gl'
import { MapStore } from '../../map.store';
import { IAppointment } from '../../interfaces/Imap';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { MapService } from '../../services/map.service';

@Component({
  selector: 'app-map',
  imports: [IconComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css',
})
export class MapComponent implements OnDestroy{
  readonly mapStore = inject(MapStore)
  // بغير سينتر الخريطة علي حسب لوكيشن اليوزر من خلال ال flyTo
  public lastFlyTo : {lng : number , lat : number} | null = null
  isMapReady : boolean = false;
  userMarker : Marker | null = null
  private currentMarkers: Marker[] = [];
  private currentFriends: Marker[] = [];
  private currentEvents: Marker[] = [];
  routeReady = false
  isLayersOpen = signal(false)
  layers = signal({
    appointments: true,
    friends:true,
    events:true
  });

  constructor(){

    effect(() => {
      const location = this.mapStore.userLocation();
      if(location && this.map && this.isMapReady){
        const isFirstTime = !this.lastFlyTo
        const distance = this.lastFlyTo ? Math.sqrt(Math.pow(location.lng - this.lastFlyTo.lng , 2)
      + Math.pow(location.lat - this.lastFlyTo.lat , 2)) : 1;
      if(isFirstTime || distance > 0.001){
        this.recenter()
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
     const currentLayers = this.layers()
     const appointments = this.mapStore.appointments();
     const friends = this.mapStore.friends();
     const events = this.mapStore.events();
     const location = this.mapStore.userLocation();
     if (this.isMapReady) {
     this.addUserMarker(location.lng,location.lat)
       if(appointments && appointments.length > 0){
         this.addMarkers();
       }
       if(friends && friends.length > 0){
        this.addFriendsLayer()
       }
       if(events && events.length > 0){
        this.addEventsLayer()
       }
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
      zoom: 10,
    });
    this.map.on('load' , () => {
      this.isMapReady = true;
      // علشان شكل الكوره الارضيه لما نصغر الزوم
      this.map.setProjection({type:'globe'});
      this.addMarkers();
      this.addFriendsLayer()
      this.addEventsLayer()
      const currentRoute = this.mapStore.currentRoute();
      if(currentRoute){
        this.drawRouteOnMap(currentRoute);
        this.fitMapToPoints(currentRoute);
      }
      this.map.resize()
     }); 

  this.map.setPitch(45)
  } 

  addUserMarker(lng:number , lat:number){
    const userLoc = this.mapStore.userLocation()
    if(!userLoc || !this.map) return;
    if(this.userMarker){
      this.userMarker.setLngLat([lng,lat])
      return;
    }
    const el = document.createElement('div')
    el.innerHTML = `<div class="relative w-10 h-10 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full border-2 border-blue-500 animate-ring"></div> 
      <div class="relative w-3.5 h-3.5 bg-white rounded-full border-2 border-blue-600 shadow-lg z-10"></div>
    </div>`

    this.userMarker = new Marker({element:el , anchor : 'bottom'}).setLngLat([lng,lat]).addTo(this.map)
  }

  addMarkers(){
    const appointments = this.mapStore.appointments()
    if(!appointments || !this.map) return;
    this.currentMarkers.forEach(m => m.remove());
    this.currentMarkers = []
    if(!this.layers().appointments) return;
    appointments.forEach((app , index) => {
      const isNext = index === 0
      const customCss = isNext? 'bg-primary-500 animate-popup' : 'bg-black'
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
      const marker = new Marker({element : el , anchor : 'bottom'}).setLngLat([app.lng , app.lat]).addTo(this.map);
      marker.getElement().addEventListener('click', () => {
          this.loadRouteForAppointment(app)
      })
      this.currentMarkers.push(marker)
    })
  }

  addFriendsLayer(){
    const friends = this.mapStore.friends()
    if(!friends || !this.map) return;
    this.currentFriends.forEach(m => m.remove());
    this.currentFriends = []
    if(!this.layers().friends) return;
    friends.forEach((app) => {
      const el = document.createElement('div'); 
      el.className = 'flex flex-col item-center gap-1 cursor-pointer custom-marker';
      
      el.innerHTML = `<div class="relative flex flex-col items-center group cursor-pointer">
    <div class="relative w-10 h-10 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full border border-green-500/60 animate-ring"></div> 
      <div class="relative w-3.5 h-3.5 bg-green-600 rounded-full border border-white shadow-md z-10"></div>
    </div>
    <div class="absolute -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
       <span class="text-[10px] font-bold text-black bg-white px-2 py-1 rounded-md shadow-md whitespace-nowrap border border-gray-100">
         ${app.name}
       </span>
    </div>
    
  </div>`;
      const marker = new Marker({element : el , anchor : 'bottom'}).setLngLat([app.lng , app.lat]).addTo(this.map); 
      marker.getElement().addEventListener('click', () => {
          this.loadRouteForAppointment(app as any)
      })
      this.currentFriends.push(marker)
    })
  }

  addEventsLayer(){
    const events = this.mapStore.events()
    if(!events || !this.map) return;
    this.currentEvents.forEach(m => m.remove());
    this.currentEvents = []
    if(!this.layers().events) return;
    events.forEach((app) => {
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
         ${app.title || 'فعالية جديدة'}
       </span>
    </div>
  </div>
;`;
      const marker = new Marker({element : el , anchor : 'bottom'}).setLngLat([app.lng , app.lat]).addTo(this.map); 
      marker.getElement().addEventListener('click', () => {
          this.loadRouteForAppointment(app)
      })
      this.currentEvents.push(marker)
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
          'line-color':'#891e10',
          'line-width': 3,
          'line-dasharray':[2,2],
          'line-opacity':0.8
        }
      })
    }
  }

  drawFullRoute(){
    const tripRoute = this.mapStore.trips()[0]
    const userloc = this.mapStore.userLocation()
    if(tripRoute && userloc){
      const fullRoute : number[][] = [
        [userloc.lng, userloc.lat],
        [tripRoute.lng , tripRoute.lat]
      ] 
      this.drawRouteOnMap(fullRoute)
      this.fitMapToPoints(fullRoute)
      this.routeReady = true
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

  recenter() {
  const userLoc = this.mapStore.userLocation();
  if (userLoc && this.map) {
    this.map.flyTo({
      center: [userLoc.lng, userLoc.lat], 
      zoom: 10, 
      pitch: 45,
      essential: true,
      duration: 3000
    });
    this.lastFlyTo = userLoc
  } 
  }

  toggelLayersMenue(){
    this.isLayersOpen.update(v => !v);
  }

  toggelLayers(key:'appointments' | 'friends' | 'events'){
    this.layers.update(prev => ({
      ...prev,
      [key]: !prev[key] 
    }));
  }



ngOnDestroy(): void {
  this.mapStore.clearLocationTracking();
  this.map.remove()
}
}
