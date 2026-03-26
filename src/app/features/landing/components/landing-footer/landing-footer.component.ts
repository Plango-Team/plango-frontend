import { Component } from '@angular/core';
import { IconComponent } from "../../../../shared/components/icon/icon.component";
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-landing-footer',
  imports: [IconComponent, RouterLink],
  templateUrl: './landing-footer.component.html',
  styleUrl: './landing-footer.component.css',
})
export class LandingFooterComponent {

}
