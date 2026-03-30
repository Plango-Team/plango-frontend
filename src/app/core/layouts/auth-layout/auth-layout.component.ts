import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingBarComponent } from '../../../shared/components/loading-bar/loading-bar.component';
import { authStore } from '../../../features/auth/auth.store';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, LoadingBarComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  readonly store = inject(authStore);
}
