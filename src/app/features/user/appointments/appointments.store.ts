import { patchState, signalStore, withComputed, withMethods, withState, withHooks } from '@ngrx/signals';
import { computed, effect, inject, untracked } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of, EMPTY } from 'rxjs';
import { AppointmentService } from '../calendar/services/appointment.service';
import { authStore } from '../../auth/auth.store';
import { Appointment, AppointmentPayload } from './interfaces/IAppointment';
import { AcceptInvitePayload, InvitService, PendingInvite } from '../map/services/invit.service';

export type AppointmentsState = {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  invitationWarnings:string[] | null
  pendingInvites:PendingInvite[]
};

export const AppointmentsStore = signalStore(
  { providedIn: 'root' },
  withState<AppointmentsState>({
    appointments: [],
    isLoading: false,
    error: null,
    invitationWarnings:null,
    pendingInvites:[]
  }),
  withMethods((store, appointmentService = inject(AppointmentService),invitService=inject(InvitService)) => ({
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
              patchState(store, {
                pendingInvites: response.data.invites,
                isLoading: false
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
    tap(() => patchState(store, { isLoading: true, error: null })),
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
                isLoading: false
              });

            }
          },
          error: (err) => {
            patchState(store, { 
              error: err.error?.message || 'Failed to accept invitation', 
              isLoading: false 
            });
          }
        }),
        catchError((err) => {
          patchState(store, { 
            error: err.error?.message || 'Failed to accept invitation', 
            isLoading: false 
          });
          return of(null);
        })
      )
    )
  )
),
declineInvitation: rxMethod<string>(
  pipe(
    tap(() => patchState(store, { isLoading: true, error: null })),
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
                isLoading: false
              });

              console.log('تم رفض الدعوة بنجاح وتحديث الـ Store!');
            }
          },
          error: (err) => {
            patchState(store, { 
              error: err.error?.message || 'Failed to decline invitation', 
              isLoading: false 
            });
          }
        }),
        catchError((err) => {
          patchState(store, { 
            error: err.error?.message || 'Failed to decline invitation', 
            isLoading: false 
          });
          return of(null);
        })
      )
    )
  )
),
  })),
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
