import { Component, inject } from '@angular/core';
import { IconComponent } from "../../../shared/components/icon/icon.component";
import { ThemeService } from '../../services/theme.service';
import { authStore } from '../../../features/auth/auth.store';
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-sidebar',
  imports: [IconComponent, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  public themeService = inject(ThemeService);
  public readonly authStore = inject(authStore);

  logout() {
    this.authStore.logOut();
  }
}
