import { patchState, signalStore, withComputed, withMethods, withState, withHooks } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { AppointmentService, Appointment } from '../calendar/services/appointment.service';
import { authStore } from '../../auth/auth.store';

export type AppointmentsState = {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
};

export const AppointmentsStore = signalStore(
  { providedIn: 'root' },
  withState<AppointmentsState>({
    appointments: [],
    isLoading: false,
    error: null,
  }),
  withMethods((store, appointmentService = inject(AppointmentService), authStoreInstance = inject(authStore)) => ({
    loadAppointments: rxMethod<string | undefined>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((userId) => {
          if (!userId) {
            patchState(store, { isLoading: false, appointments: [] });
            return of(null);
          }
          return appointmentService.getAppointmentsByUser(userId).pipe(
            tap({
              next: (appointments) => patchState(store, { appointments, isLoading: false }),
              error: (err) => patchState(store, { error: err.message, isLoading: false }),
            }),
            catchError(() => {
               patchState(store, { error: 'Failed to load appointments', isLoading: false });
               return of(null);
            })
          );
        })
      )
    ),
    addAppointment: rxMethod<Appointment>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((appointment) => 
          appointmentService.createAppointment(appointment).pipe(
            tap({
              next: (res) => patchState(store, { 
                appointments: [...store.appointments(), res],
                isLoading: false
              }),
              error: (err) => patchState(store, { error: err.message, isLoading: false }),
            }),
            catchError(() => {
               patchState(store, { error: 'Failed to create appointment', isLoading: false });
               return of(null);
            })
          )
        )
      )
    ),
    removeAppointment: rxMethod<string>(
      pipe(
        switchMap((id) =>
          appointmentService.deleteAppointment(id).pipe(
            tap(() => patchState(store, {
              appointments: store.appointments().filter(a => a.id !== id)
            })),
            catchError(() => of(null))
          )
        )
      )
    )
  })),
  withHooks({
    onInit(store, authStoreInstance = inject(authStore)) {
      const userId = computed(() => authStoreInstance.user()?.id);
      store.loadAppointments(userId);
    }
  })
);
