import { signalStore, withState, withMethods, patchState, withHooks, withComputed } from '@ngrx/signals';
import { MapState } from './interfaces/Imap';
import { computed, effect, inject, untracked } from '@angular/core';
import polyline from '@mapbox/polyline';
import { authStore } from '../../auth/auth.store';
import { AppointmentsStore } from '../appointments/appointments.store';
import { EventsStore } from '../events/events.store';
import { Appointment } from '../appointments/interfaces/IAppointment';


let watchId : number | null = null;

const initialState: MapState = {
  userLocation: null,
  currentRoute: null,
  isLoading: false,
  error: null,
  userHeading: null,
};

export const MapStore = signalStore(
  {
    providedIn: 'root',
  },
  withState(initialState),

  withComputed((_store, appointmentStore = inject(AppointmentsStore), eventsStore = inject(EventsStore)) => {
    const sortedAppointments = computed(() => {
      const list = appointmentStore.appointments() || [];
      const now = Date.now();
      return [...list]
      .filter((appointment) => !appointment.isCompleted && new Date(appointment.arrivalTime).getTime() >= now)
      .sort((a, b) => {
        return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime();
      });
    });
    const mapEvents = computed(() => {
      const now = Date.now();
      return eventsStore
        .events()
        .filter((event) => {
          const coords = event.location?.coordinates;
          return (
            event.isActive &&
            new Date(event.endDate).getTime() >= now &&
            Array.isArray(coords) &&
            coords.length >= 2
          );
        });
    });

    return {
      sortedAppointments,
      nextAppointment: computed(() => sortedAppointments()[0] ?? null),
      mapEvents,
    };
  }),

  withMethods((store) => ({
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

    loadRouteFromAppointment(appointment: Appointment) {
      if (!appointment || !appointment.polyline) {
        patchState(store, { error: 'لا يوجد مسار مسجل لهذا الميعاد' });
        return;
      }

      try {
        patchState(store, { isLoading: true });
        const decodedPoly = polyline.decode(appointment.polyline);
        const coordinates = decodedPoly.map(p => [p[1], p[0]]);
        
        patchState(store, { 
          currentRoute: coordinates, 
          isLoading: false, 
          error: null 
        });
      } catch (e) {
        patchState(store, { isLoading: false, error: 'فشل في قراءة مسار الميعاد' });
      }
    },

    clearRoute(){
      patchState(store, {currentRoute: null})
    },
  })),

  withHooks({
    onInit(store) {
      const auth = inject(authStore);
      const eventsStore = inject(EventsStore);
      store.getCurrentLocation();

      // Wait for auth before making API calls
      effect(() => {
        const user = auth.user();
            if (user) {
              untracked(() => {
            eventsStore.loadEvents();
          });
        }
      });
    },
  })
);
