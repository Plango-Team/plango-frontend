import { Component } from '@angular/core';
import { AccountSettingsComponent } from '../../../../../shared/components/account-settings/account-settings.component';

@Component({
  selector: 'app-settings-page',
  imports: [AccountSettingsComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent {}
