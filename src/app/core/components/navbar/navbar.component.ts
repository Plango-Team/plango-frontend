import { Component, inject, signal } from '@angular/core';
import { IconComponent } from "../../../shared/components/icon/icon.component";
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import { authStore } from '../../../features/auth/auth.store';

@Component({
  selector: 'app-navbar',
  imports: [IconComponent, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  public themeService = inject(ThemeService);
  public authStore = inject(authStore);

  public isMenuOpen = signal(false);

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  logout() {
    this.authStore.logOut();
    this.isMenuOpen.set(false);
  }
} 
