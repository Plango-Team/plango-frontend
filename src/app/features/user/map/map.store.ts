import { signalStore, withState, withMethods, patchState, withHooks } from '@ngrx/signals';
import { ChatMessage, IAppointment, IRouteResponse, MapState } from './interfaces/Imap';
import { inject } from '@angular/core';
import { MapService } from './services/map.service';
import polyline from '@mapbox/polyline';
import { authStore } from '../../auth/auth.store';


let watchId : number | null = null;

const initialState: MapState = {
  userLocation: null,
  appointments: null,
  currentRoute: null,
  routeData: null,
  isLoading: false,
  error: null,
  userHeading: null,
  events: [
    { id: 101, title: 'ورشة', lat: 28.1130, lng: 30.7450 },
    { id: 102, title: 'معرض الفن', lat: 27.9350, lng: 30.8350 }
  ],
  friends:null,
  trips:[],
};

export const MapStore = signalStore(
  {
    providedIn: 'root',
  },
  withState(initialState),

  withMethods((store, mapService = inject(MapService), authstore = inject(authStore)) => ({
    // فنكشن بتجيب اللوكيشن الحالي من المتصفح
    getCurrentLocation() {
      if (!navigator.geolocation) {
        patchState(store, { error: 'Geolocation is not supported' });
        return;
      }

      if (watchId !== null) return;

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

    loadFullData() {
    patchState(store, { isLoading: true });
    mapService.getAppointments().subscribe(data => {
      patchState(store, { appointments: data, isLoading: false });
    });
    mapService.getTripInfo().subscribe(info => {
      patchState(store, {trips: [info]}); 
    });
    mapService.getFriends().subscribe(data => {
      patchState(store, { friends: data, isLoading: false });
    });
    },

    toggleTripMenu(index: number) {
      patchState(store,(state) => {
        const updatedTrips = [...(state.trips ?? [])]
        if(updatedTrips[index]){
          updatedTrips[index] = {
            ...updatedTrips[index],
            showTripMenu: !updatedTrips[index].showTripMenu
          }
        }
        return {trips:updatedTrips}
      })
    },

    deleteTrip(index:number){
      patchState(store, (state) => ({
        trips:(state.trips ?? []).filter((_,i) => i !== index)
      }))
    },

    addMessage(messageText:string){
    const username = authstore.user().firstName + ' ' + authstore.user().lastName
      const newMessage : ChatMessage = {
        id: Date.now(),
        sender: username,
        text: messageText,
        time: new Date().toLocaleTimeString('ar-EG',{hour:'numeric',minute:'numeric',hour12:true}),
      };
      patchState(store,(state) => {
        const updatedTrips = [...state.trips];
        if(updatedTrips[0]){
          updatedTrips[0] = {
            ...updatedTrips[0],chatMessages:[...
              (updatedTrips[0].chatMessages || []),newMessage
            ]
          }
        }
        return {trips:updatedTrips}
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
          patchState(store, {currentRoute:coordinates,routeData:response,isLoading:false});
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
      store.loadFullData();
    },
  })
);
