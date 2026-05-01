import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LoadingBarComponent } from '../../../shared/components/loading-bar/loading-bar.component';
import { authStore } from '../../../features/auth/auth.store';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, LoadingBarComponent ,RouterLink],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  readonly store = inject(authStore);
  public themeService = inject(ThemeService);
}
