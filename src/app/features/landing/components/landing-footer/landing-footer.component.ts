import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../../core/services/theme.service';

export interface LandingFooterGroup {
  readonly title: string;
  readonly links: readonly string[];
}

export interface LandingFooterLegalLink {
  readonly label: string;
  readonly href: string;
}

@Component({
  selector: 'app-landing-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-footer.component.html',
  styleUrl: './landing-footer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingFooterComponent {
  readonly groups = input<readonly LandingFooterGroup[]>([]);
  readonly legalLinks = input<readonly LandingFooterLegalLink[]>([]);
  readonly copyrightText = input<string>('');
  protected readonly themeService = inject(ThemeService);
}
