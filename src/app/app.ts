import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FlowbiteService } from './core/services/flowbite/flowbite.service';
import { initFlowbite } from 'flowbite/lib/esm/components';
import { authStore } from './features/auth/auth.store';
import { ToastOutletComponent } from './shared/components/toast-outlet/toast-outlet.component';
import { NotificationsStore } from './shared/stores/notifications.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('PlanGo');
  private authStore = inject(authStore);
  private notificationsStore = inject(NotificationsStore);
  // flowbite تاني
  constructor(private flowbiteService: FlowbiteService) {
    this.authStore.initAuth();
  }
  ngOnInit(): void {
    this.flowbiteService.loadFlowbite((flowbite) => {
      initFlowbite();
    });
  }
}
