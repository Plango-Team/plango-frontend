import { Component } from '@angular/core';
import { AccountSettingsComponent } from '../../../../shared/components/account-settings/account-settings.component';

@Component({
  selector: 'app-organization-settings-page',
  imports: [AccountSettingsComponent],
  templateUrl: './settings-page.component.html',
})
export class OrganizationSettingsPageComponent {}
