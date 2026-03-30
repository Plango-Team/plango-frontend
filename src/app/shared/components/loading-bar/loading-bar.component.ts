import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-bar',
  imports: [],
  templateUrl: './loading-bar.component.html',
  styleUrl: './loading-bar.component.css',
})
export class LoadingBarComponent {
  isLoading = input.required<boolean>();
}
