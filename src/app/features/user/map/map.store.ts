import { signalStore, withState, withMethods, patchState, withHooks } from '@ngrx/signals';
import { IAppointment, IRouteResponse } from './interfaces/Imap';
import { inject } from '@angular/core';
import { MapService } from './services/map.service';
import polyline from '@mapbox/polyline';

interface MapState {
  userLocation: {
    lng: number;
    lat: number
  } | null;
  appointments: IAppointment[] | null;
  currentRoute: number[][] | null;
  routeData: IRouteResponse['data'] | null;
  isLoading: boolean;
  error: string | null;
  userHeading : number | null;
}
let watchId : number | null = null;

const initialState: MapState = {
  userLocation: null,
  appointments: null,
  currentRoute: null,
  routeData: null,
  isLoading: false,
  error: null,
  userHeading: null
};

export const MapStore = signalStore(
  {
    providedIn: 'root',
  },
  withState(initialState),

  withMethods((store, mapService = inject(MapService)) => ({
    // فنكشن بتجيب اللوكيشن الحالي من المتصفح
    getCurrentLocation() {
      if (!navigator.geolocation) {
        patchState(store, { error: 'Geolocation is not supported' });
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          patchState(store , {
            userLocation: {
              lng: position.coords.longitude,
              lat: position.coords.latitude
            },
            userHeading: position.coords.heading,
            error: null
          })
        },
        (err) => patchState(store , {
          error: err.message
        }),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    },
    
    // علشان نوقف ال tracking بتاع ال watch
    clearLocationTracking() {
      if(watchId !== null){
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    },

    loadAppointments() {
      patchState(store, { isLoading: true });

      mapService.getAppointments().subscribe({
        next: (appointments) => {
          patchState(store,{
            appointments:appointments,
            isLoading:false
          });
        },
        error:(e) => {
          // error msg
          patchState(store, {isLoading:false})
        }
      })
    },

    loadRoute(origin: {lat:number,lng:number},destination:{lat:number,lng:number}){
      patchState(store,{isLoading:true});
      mapService.getRoute(origin,destination).subscribe({
        next: (response) => {
          // بفكه علشان بيكون راجع سترينج مش احداثيات
          const decodedPoly = polyline.decode(response.data.polyline)
          // بعكسه علشان الديكود بيرجع [lat,lng] واحنا عاوزيين العكس
          const coordinates = decodedPoly.map(p => [p[1], p[0]]);
          patchState(store, {currentRoute:coordinates,isLoading:false});
        },
        error:(e) => {
          // error msg
          patchState(store, {isLoading:false})
        } 
      })
    },

    clearRoute(){
      patchState(store, {currentRoute: null})
    }
  })),

  withHooks({
    onInit(store) {
      store.getCurrentLocation();
      store.loadAppointments();
    },
  })
);