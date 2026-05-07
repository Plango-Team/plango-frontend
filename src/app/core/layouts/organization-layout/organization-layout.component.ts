import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-organization-layout',
  imports: [SidebarComponent, NavbarComponent, RouterOutlet],
  templateUrl: './organization-layout.component.html',
})
export class OrganizationLayoutComponent {}
