import { Component, input } from '@angular/core';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import * as HugeIcons from '@hugeicons/core-free-icons';

export type HugeiconsIconName = string;

@Component({
  selector: 'app-icon',
  imports: [HugeiconsIconComponent],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  host: {
    class: 'flex justify-center items-center',
  },
})
export class IconComponent {
  readonly Icons: any = HugeIcons;
  iconName = input.required<HugeiconsIconName>();
  iconSize = input<number>(24);
  iconColor = input<string>('black');
  iconStrokWidth = input<number>(2);
}
