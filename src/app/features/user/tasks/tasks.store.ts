import { patchState, signalStore, withMethods, withState, withHooks } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { TaskService, Task } from './services/task.service';
import { authStore } from '../../auth/auth.store';

export type TasksState = {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
};

export const TasksStore = signalStore(
  { providedIn: 'root' },
  withState<TasksState>({
    tasks: [],
    isLoading: false,
    error: null,
  }),
  withMethods((store, taskService = inject(TaskService), authStoreInstance = inject(authStore)) => ({
    loadTasks: rxMethod<string | undefined>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((userId) => {
          if (!userId) {
            patchState(store, { isLoading: false, tasks: [] });
            return of(null);
          }
          return taskService.getTasksByUser(userId).pipe(
            tap({
              next: (tasks) => patchState(store, { tasks, isLoading: false }),
              error: (err) => patchState(store, { error: err.message, isLoading: false }),
            }),
            catchError(() => {
              patchState(store, { error: 'Failed to load tasks', isLoading: false });
              return of(null);
            })
          );
        })
      )
    ),

    addTask: rxMethod<Task>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((task) =>
          taskService.createTask(task).pipe(
            tap({
              next: (res) => patchState(store, {
                tasks: [res, ...store.tasks()],
                isLoading: false
              }),
              error: (err) => patchState(store, { error: err.message, isLoading: false }),
            }),
            catchError(() => {
              patchState(store, { error: 'Failed to create task', isLoading: false });
              return of(null);
            })
          )
        )
      )
    ),

    updateTask: rxMethod<Task>(
      pipe(
        switchMap((task) =>
          taskService.updateTask(task).pipe(
            tap({
              next: (res) => patchState(store, {
                tasks: store.tasks().map(t => t.id === res.id ? res : t)
              }),
            }),
            catchError(() => of(null))
          )
        )
      )
    ),

    removeTask: rxMethod<string>(
      pipe(
        switchMap((id) =>
          taskService.deleteTask(id).pipe(
            tap(() => patchState(store, {
              tasks: store.tasks().filter(t => t.id !== id)
            })),
            catchError(() => of(null))
          )
        )
      )
    ),

    // Local-only quick helpers (update server in background)
    setTaskStatus(id: string, status: 'todo' | 'in_progress' | 'done') {
      const task = store.tasks().find(t => t.id === id);
      if (!task) return;
      const updated = {
        ...task,
        status,
        completedAt: status === 'done' ? Date.now() : undefined
      } as Task;
      patchState(store, {
        tasks: store.tasks().map(t => t.id === id ? updated : t)
      });
      taskService.updateTask(updated).subscribe();
    },

    toggleSubtask(taskId: string, subId: string) {
      const task = store.tasks().find(t => t.id === taskId);
      if (!task) return;
      const updated = {
        ...task,
        subtasks: task.subtasks.map(s =>
          s.id === subId ? { ...s, done: !s.done } : s
        )
      } as Task;
      patchState(store, {
        tasks: store.tasks().map(t => t.id === taskId ? updated : t)
      });
      taskService.updateTask(updated).subscribe();
    },

    addSubtask(taskId: string, title: string) {
      if (!title.trim()) return;
      const task = store.tasks().find(t => t.id === taskId);
      if (!task) return;
      const newSub = { id: 'st_' + Math.random().toString(36).slice(2, 8), title: title.trim(), done: false };
      const updated = {
        ...task,
        subtasks: [...task.subtasks, newSub]
      } as Task;
      patchState(store, {
        tasks: store.tasks().map(t => t.id === taskId ? updated : t)
      });
      taskService.updateTask(updated).subscribe();
    },

    removeSubtask(taskId: string, subId: string) {
      const task = store.tasks().find(t => t.id === taskId);
      if (!task) return;
      const updated = {
        ...task,
        subtasks: task.subtasks.filter(s => s.id !== subId)
      } as Task;
      patchState(store, {
        tasks: store.tasks().map(t => t.id === taskId ? updated : t)
      });
      taskService.updateTask(updated).subscribe();
    },
  })),
  withHooks({
    onInit(store, authStoreInstance = inject(authStore)) {
      const userId = computed(() => authStoreInstance.user()?._id);
      store.loadTasks(userId);
    }
  })
);
