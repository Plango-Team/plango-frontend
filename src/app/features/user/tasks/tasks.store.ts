import { patchState, signalStore, withMethods, withState, withHooks } from '@ngrx/signals';
import { effect, inject, untracked } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import {
  TaskService,
  Task,
  TaskStatus,
  CreateTaskPayload,
  LinkableAppointment,
} from './services/task.service';
import { authStore } from '../../auth/auth.store';

export type TasksState = {
  tasks: Task[];
  linkableAppointments: LinkableAppointment[];
  isLoading: boolean;
  error: string | null;
};

export const TasksStore = signalStore(
  { providedIn: 'root' },
  withState<TasksState>({
    tasks: [],
    linkableAppointments: [],
    isLoading: false,
    error: null,
  }),
  withMethods((store, taskService = inject(TaskService)) => {
    const loadTasks = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          taskService.getTasks().pipe(
            tap({
              next: (tasks) => patchState(store, { tasks, isLoading: false }),
              error: (err) => patchState(store, { error: err.message, isLoading: false }),
            }),
            catchError(() => {
              patchState(store, { error: 'Failed to load tasks', isLoading: false });
              return of(null);
            })
          )
        )
      )
    );

    const loadLinkableAppointments = rxMethod<void>(
      pipe(
        switchMap(() =>
          taskService.getLinkableAppointments().pipe(
            tap({
              next: (appointments) => patchState(store, { linkableAppointments: appointments }),
            }),
            catchError(() => of(null))
          )
        )
      )
    );

    const addTask = rxMethod<CreateTaskPayload>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((payload) =>
          taskService.createTask(payload).pipe(
            tap({
              next: (task) => {
                let populatedTask = { ...task };
                if (task.linkedAppointment && typeof task.linkedAppointment === 'string') {
                  const appt = store.linkableAppointments().find(a => a._id === task.linkedAppointment);
                  if (appt) {
                    populatedTask.linkedAppointment = {
                      _id: appt._id,
                      title: appt.title,
                      arrivalTime: appt.arrivalTime,
                    };
                  }
                }
                patchState(store, {
                  tasks: [populatedTask, ...store.tasks()],
                  isLoading: false,
                });
                // Background refresh to guarantee everything is in sync
                loadTasks();
              },
              error: (err) => patchState(store, { error: err.message, isLoading: false }),
            }),
            catchError(() => {
              patchState(store, { error: 'Failed to create task', isLoading: false });
              return of(null);
            })
          )
        )
      )
    );

    const updateTask = rxMethod<{ id: string; data: Partial<CreateTaskPayload & { status: TaskStatus }> }>(
      pipe(
        switchMap(({ id, data }) =>
          taskService.updateTask(id, data).pipe(
            tap({
              next: (updated) =>
                patchState(store, {
                  tasks: store.tasks().map((t) => {
                    if (t._id === updated._id) {
                      const linkedAppointment = (updated.linkedAppointment && typeof updated.linkedAppointment === 'object')
                        ? updated.linkedAppointment
                        : (t.linkedAppointment && typeof t.linkedAppointment === 'object' && typeof updated.linkedAppointment === 'string' && t.linkedAppointment._id === updated.linkedAppointment)
                          ? t.linkedAppointment
                          : updated.linkedAppointment;
                      return { ...updated, linkedAppointment };
                    }
                    return t;
                  }),
                }),
            }),
            catchError(() => of(null))
          )
        )
      )
    );

    const removeTask = rxMethod<string>(
      pipe(
        switchMap((id) =>
          taskService.deleteTask(id).pipe(
            tap(() =>
              patchState(store, {
                tasks: store.tasks().filter((t) => t._id !== id),
              })
            ),
            catchError(() => of(null))
          )
        )
      )
    );

    const setTaskStatus = (id: string, status: TaskStatus) => {
      // Optimistic update
      patchState(store, {
        tasks: store.tasks().map((t) => (t._id === id ? { ...t, status } : t)),
      });
      updateTask({ id, data: { status } });
    };

    return {
      loadTasks,
      loadLinkableAppointments,
      addTask,
      updateTask,
      removeTask,
      setTaskStatus,
    };
  }),
  withHooks({
    onInit(store) {
      const auth = inject(authStore);

      // Reactively load data when user becomes available
      effect(() => {
        const user = auth.user();
        if (user) {
          untracked(() => {
            store.loadTasks();
            store.loadLinkableAppointments();
          });
        }
      });
    },
  })
);
