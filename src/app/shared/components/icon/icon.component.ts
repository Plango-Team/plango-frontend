import { Component, input } from '@angular/core';
import { HugeiconsIconComponent } from "@hugeicons/angular";
import * as HugeIcons from "@hugeicons/core-free-icons";

type HugeiconsIconNames = keyof typeof HugeIcons // خليت التايب يكون اسماء الايقونز علشان ال auto complete

@Component({
  selector: 'app-icon',
  imports: [HugeiconsIconComponent],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  readonly Icons : any = HugeIcons
  iconName = input.required<HugeiconsIconNames>() 
  iconSize = input<number>(24)
  iconColor = input<string>('black')
  iconStrokWidth = input<number>(2)
}
