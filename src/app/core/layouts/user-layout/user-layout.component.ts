import { Component, signal } from '@angular/core';
import { SidebarComponent } from "../../components/sidebar/sidebar.component";
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { RouterOutlet } from '@angular/router';
@Component({
  selector: 'app-user-layout',
  imports: [SidebarComponent, NavbarComponent, RouterOutlet],
  templateUrl: './user-layout.component.html',
  styleUrl: './user-layout.component.css',
})
export class UserLayoutComponent {
  mobileSidebarOpen = signal(false);

  toggleMobileSidebar() {
    this.mobileSidebarOpen.update((open) => !open);
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen.set(false);
  }
}
