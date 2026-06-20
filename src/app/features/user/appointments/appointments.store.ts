import { patchState, signalStore, withComputed, withMethods, withState, withHooks } from '@ngrx/signals';
import { computed, effect, inject, untracked } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, EMPTY, firstValueFrom, forkJoin } from 'rxjs';
import { AppointmentService } from '../calendar/services/appointment.service';
import { authStore } from '../../auth/auth.store';
import { Appointment, AppointmentPayload } from './interfaces/IAppointment';
import {
  AcceptInvitePayload,
  DisplayPendingInvite,
  InvitService,
  normalizePendingInvite,
} from '../map/services/invit.service';

export type AppointmentsState = {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  invitationWarnings: string[] | null;
  pendingInvites: DisplayPendingInvite[];
  activeInviteId: string | null;
};

export const AppointmentsStore = signalStore(
  { providedIn: 'root' },
  withState<AppointmentsState>({
    appointments: [],
    isLoading: false,
    error: null,
    invitationWarnings: null,
    pendingInvites: [],
    activeInviteId: null,
  }),
  withMethods((store, appointmentService = inject(AppointmentService),invitService=inject(InvitService), auth = inject(authStore)) => {
    const enrichAppointments = (appointments: Appointment[]) => {
      if (!appointments.length) {
        return of([] as Appointment[]);
      }

      return forkJoin(
        appointments.map((appointment) =>
          appointmentService.getAppointmentById(appointment._id).pipe(
            catchError(() => of(appointment)),
          ),
        ),
      );
    };

    const loadAppointmentsWithDetails = (userId: string) =>
      appointmentService.getAppointmentsByUser(userId).pipe(
        switchMap((appointments) => enrichAppointments(appointments)),
      );

    return ({
    loadAppointments: rxMethod<string | undefined>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((userId) => {
          if (!userId) {
            patchState(store, { isLoading: false, appointments: [] });
            return of([] as Appointment[]);
          }
          return loadAppointmentsWithDetails(userId).pipe(
            tap({
              next: (appointments) => patchState(store, { appointments, isLoading: false }),
              error: (err) => patchState(store, { error: err.message, isLoading: false }),
            }),
            catchError((err) => {
               patchState(store, { error: err.error?.message || err.message || 'Failed to load appointments', isLoading: false });
               return of([] as Appointment[]);
            })
          );
        })
      )
    ), 
    upsertAppointment(appointment: Appointment) {
      const appointments = store.appointments();
      const exists = appointments.some((item) => item._id === appointment._id);
      patchState(store, {
        appointments: exists
          ? appointments.map((item) => (item._id === appointment._id ? appointment : item))
          : [...appointments, appointment],
      });
    },
    async removeAppointmentNow(id: string): Promise<boolean> {
      try {
        await firstValueFrom(appointmentService.deleteAppointment(id));
        patchState(store, {
          appointments: store.appointments().filter((appointment) => appointment._id !== id),
        });
        return true;
      } catch {
        return false;
      }
    },
    reloadAppointmentsNow() {
      const user = auth.user();
      if (!user) return;
      patchState(store, { isLoading: true, error: null });
      loadAppointmentsWithDetails(user._id).subscribe({
        next: (appointments) => patchState(store, { appointments, isLoading: false }),
        error: (err) =>
          patchState(store, {
            error: err.error?.message || err.message || 'Failed to load appointments',
            isLoading: false,
          }),
      });
    },
    addAppointment: rxMethod<AppointmentPayload>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((payload) => 
          appointmentService.createAppointment(payload).pipe(
            tap({
              next: (res : any) => {
                const newAppt = res.data?.appointment || res
                patchState(store, { 
                appointments: [...store.appointments(), newAppt as Appointment],
                isLoading: false,
              });
            },}),
            catchError((err) => {
               patchState(store, { error: err.error?.message || 'Failed to create appointment', isLoading: false });
               console.log(err)
               return of(null);
            })
          )
        )
      )
    ),
    updateAppointment: rxMethod<{ id: string; payload: any }>(
  pipe(
    tap(() => patchState(store, { isLoading: true, error: null })),
    switchMap(({ id, payload }) => 
      appointmentService.updateAppointment(id, payload).pipe(
        tap({
          next: (response) => {
            if (response.status === 'success') {
              const updatedAppt = response.data.appointment;
              
              patchState(store, {
                appointments: store.appointments().map((appt) =>
                  appt._id === updatedAppt._id ? updatedAppt : appt
                ),
                isLoading: false
              });
            }
          },
          error: (err) => patchState(store, { error: err.message, isLoading: false })
        }),
        catchError(() => {
          patchState(store, { error: 'Failed to update appointment', isLoading: false });
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
            tap(() => { patchState(store, {
              appointments: store.appointments().filter(a => a._id !== id)
            });}),
            catchError((err) => {
              return EMPTY;
            }
          )
        )
      )
    )),
    removeSerialAppointment: rxMethod<string>(
      pipe(
        switchMap((recurrenceId) =>
          appointmentService.deleteSerialAppointment(recurrenceId).pipe(
            tap((res) => {
              patchState(store,{
                appointments:store.appointments().filter(a => a.recurrenceId !== recurrenceId)
              });
            }), 
            catchError((err) => {
              return EMPTY;
            }
          )
        ) 
      )
    )),
    sendInvitations: rxMethod<{ appointmentId: string; usernames: string[] }>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, invitationWarnings: null })),
        switchMap(({ appointmentId, usernames }) => 
          invitService.sendInvitation(appointmentId, usernames).pipe(
            tap({
              next: (response) => {
                if (response.status === 'success') {
                  const warnings = response.data?.warnings || null;
                  
                  patchState(store, { 
                    isLoading: false,
                    invitationWarnings: warnings
                  });
                  
                  console.log('تم إرسال الدعوات بنجاح من الـ Store!');
                }
              },
              error: (err) => {
                patchState(store, { 
                  error: err.error?.message || 'Failed to send invitations', 
                  isLoading: false 
                });
              }
            }),
            catchError((err) => {
              patchState(store, { 
                error: err.error?.message || 'Failed to send invitations', 
                isLoading: false 
              });
              return of(null);
            })
          )
        )
      )
    ),
    loadPendingInvitations: rxMethod<void>(
  pipe(
    tap(() => patchState(store, { isLoading: true, error: null })),
    switchMap(() =>
      invitService.getMyPendingInvitations().pipe(
        tap({
          next: (response) => {
            if (response.status === 'success') {
              const pendingInvites = (response.data?.invites ?? [])
                .map(normalizePendingInvite)
                .filter((invite): invite is DisplayPendingInvite => invite !== null);
              patchState(store, {
                pendingInvites,
                isLoading: false,
              });
            }
          },
          error: (err) => {
            patchState(store, { 
              error: err.error?.message || 'Failed to load pending invitations', 
              isLoading: false 
            });
          }
        }),
        catchError((err) => {
          patchState(store, { 
            error: err.error?.message || 'Failed to load pending invitations', 
            isLoading: false 
          });
          return of(null);
        })
      )
    )
  )
),
acceptInvitation: rxMethod<{ appointmentId: string; payload: AcceptInvitePayload }>(
  pipe(
    tap(({ appointmentId }) =>
      patchState(store, { activeInviteId: appointmentId, error: null }),
    ),
    switchMap(({ appointmentId, payload }) =>
      invitService.acceptInvitation(appointmentId, payload).pipe(
        tap({
          next: (response) => {
            if (response.status === 'success') {
              const updatedPending = store.pendingInvites().filter(
                (invite) => invite.appointmentId._id !== appointmentId
              );

              patchState(store, {
                pendingInvites: updatedPending,
                activeInviteId: null,
              });
              const user = auth.user();
              if (user) {
                patchState(store, { isLoading: true });
                loadAppointmentsWithDetails(user._id).subscribe({
                  next: (appointments) => patchState(store, { appointments, isLoading: false }),
                  error: (err) => patchState(store, {
                    error: err.error?.message || err.message || 'Failed to load appointments',
                    isLoading: false
                  }),
                });
              }

            }
          },
          error: (err) => {
            patchState(store, { 
              error: err.error?.message || 'Failed to accept invitation', 
              activeInviteId: null,
            });
          }
        }),
        catchError((err) => {
          patchState(store, { 
            error: err.error?.message || 'Failed to accept invitation', 
            activeInviteId: null,
          });
          return of(null);
        })
      )
    )
  )
),
declineInvitation: rxMethod<string>(
  pipe(
    tap((appointmentId) =>
      patchState(store, { activeInviteId: appointmentId, error: null }),
    ),
    switchMap((appointmentId) =>
      invitService.declineInvitation(appointmentId).pipe(
        tap({
          next: (response) => {
            if (response.status === 'success') {
              const updatedPending = store.pendingInvites().filter(
                (invite) => invite.appointmentId._id !== appointmentId
              );

              patchState(store, {
                pendingInvites: updatedPending,
                activeInviteId: null,
              });

              console.log('تم رفض الدعوة بنجاح وتحديث الـ Store!');
            }
          },
          error: (err) => {
            patchState(store, { 
              error: err.error?.message || 'Failed to decline invitation', 
              activeInviteId: null,
            });
          }
        }),
        catchError((err) => {
          patchState(store, { 
            error: err.error?.message || 'Failed to decline invitation', 
            activeInviteId: null,
          });
          return of(null);
        })
      )
    )
  )
),
    });
  }),
  withHooks({
    onInit(store) {
      const auth = inject(authStore);

      // Reactively load appointments when user becomes available
      effect(() => {
        const user = auth.user();
        if (user) {
          untracked(() => {
            store.loadAppointments(user._id);
            store.loadPendingInvitations()
          });
        }
      });
    }
  })
);
