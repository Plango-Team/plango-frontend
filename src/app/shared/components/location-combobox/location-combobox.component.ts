import {
  Component,
  input,
  output,
  inject,
  signal,
  ElementRef,
  ViewChild,
  HostListener,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IconComponent } from '../icon/icon.component';
import { PlacesService, Place } from '../../services/places.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-location-combobox',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="relative" #wrapper>
      <div class="relative">
        <app-icon
          [iconName]="'Location01Icon'"
          [iconSize]="16"
          [iconColor]="'var(--color-ink-muted)'"
          class="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2"
        ></app-icon>
        <input
          [ngModel]="value()"
          (ngModelChange)="onInput($event)"
          (focus)="onFocus()"
          (keydown.enter)="searchNow($event)"
          [placeholder]="placeholder() || language.text('ابحث عن مكان...', 'Search for a place...')"
          [attr.aria-expanded]="open()"
          [attr.aria-busy]="isSearching()"
          class="h-10 w-full rounded-lg border border-ink-border bg-ink px-10 text-sm text-ink-fg placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />

        @if (isSearching()) {
          <div class="absolute end-3 top-1/2 -translate-y-1/2">
            <div class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent"></div>
          </div>
        } @else {
          <button
            type="button"
            (click)="searchNow()"
            class="absolute end-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-ink-muted transition-colors hover:bg-ink-3 hover:text-ink-fg"
            [title]="searchLabel() || language.text('بحث', 'Search')"
            [attr.aria-label]="searchLabel() || language.text('بحث', 'Search')"
          >
            <app-icon [iconName]="'Search01Icon'" [iconSize]="14" [iconColor]="'currentColor'"></app-icon>
          </button>
        }
      </div>

      @if (open() && (results().length > 0 || showCreate() || (hasSearched() && !isSearching()))) {
        <div class="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-ink-border bg-ink-2 p-1 shadow-elevated animate-fade-in-up">
          @if (results().length === 0 && !isSearching()) {
            <div class="flex items-center gap-2 px-3 py-2.5 text-xs text-ink-muted">
              <app-icon [iconName]="'Search01Icon'" [iconSize]="14" [iconColor]="'currentColor'"></app-icon>
              {{ language.text('لا توجد نتائج', 'No results') }}
            </div>
          }
          @for (p of results(); track p.id) {
            <button
              type="button"
              (click)="pick(p)"
              class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm text-ink-fg transition-colors hover:bg-ink-3"
            >
              <span class="flex min-w-0 items-center gap-2">
                <app-icon [iconName]="'Location01Icon'" [iconSize]="14" [iconColor]="'var(--color-brand)'" class="shrink-0"></app-icon>
                <span class="truncate font-medium">{{ p.name }}</span>
                @if (p.area) {
                  <span class="truncate text-[11px] text-ink-muted">· {{ p.area }}</span>
                }
              </span>
              @if (p.distanceKm) {
                <span class="shrink-0 text-[11px] text-ink-muted tabular-nums">
                  {{ p.distanceKm }} {{ language.text('كم', 'km') }}
                </span>
              }
            </button>
          }
          @if (showCreate()) {
            <button
              type="button"
              (click)="create()"
              class="mt-1 flex w-full items-center gap-2 rounded-md border border-dashed border-ink-border px-3 py-2 text-start text-sm text-ink-fg transition-colors hover:bg-ink-3"
            >
              <app-icon [iconName]="'Add01Icon'" [iconSize]="14" [iconColor]="'var(--color-brand)'"></app-icon>
              {{
                language.text(
                  'إضافة "' + value() + '" كمكان جديد',
                  'Add "' + value() + '" as a new place'
                )
              }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class LocationComboboxComponent implements OnInit, OnDestroy {
  private placesService = inject(PlacesService);
  readonly language = inject(LanguageService);
  private subs: Subscription[] = [];

  value = input<string>('');
  placeholder = input<string>('');
  allowCreate = input<boolean>(true);
  searchLabel = input<string>('');
  valueChange = output<string>();
  placeSelected = output<Place>();

  open = signal(false);
  results = signal<Place[]>([]);
  isSearching = signal(false);
  hasSearched = signal(false);

  @ViewChild('wrapper') wrapper!: ElementRef;

  ngOnInit() {
    this.subs.push(
      this.placesService.results$.subscribe((results) => this.results.set(results)),
      this.placesService.isSearching$.subscribe((isSearching) => this.isSearching.set(isSearching)),
    );
  }

  ngOnDestroy() {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  showCreate(): boolean {
    const query = this.value().trim();
    return (
      this.allowCreate() &&
      query.length >= 2 &&
      !this.placesService.findByName(query) &&
      !this.isSearching()
    );
  }

  @HostListener('document:mousedown', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.wrapper && !this.wrapper.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  onFocus() {
    this.open.set(true);
    this.hasSearched.set(false);
    this.results.set(this.placesService.getSavedMatches(this.value()));
  }

  onInput(value: string) {
    this.valueChange.emit(value);
    this.open.set(true);
    this.hasSearched.set(false);
    this.results.set(this.placesService.getSavedMatches(value));
  }

  searchNow(event?: Event) {
    event?.preventDefault();

    const query = this.value().trim();
    this.open.set(true);

    if (query.length < 2) {
      this.hasSearched.set(false);
      this.results.set(this.placesService.getSavedPlaces().slice(0, 8));
      return;
    }

    this.hasSearched.set(true);
    this.placesService.search(query);
  }

  pick(place: Place) {
    this.placesService.savePlace(place);
    this.valueChange.emit(place.name);
    this.placeSelected.emit(place);
    this.open.set(false);
  }

  create() {
    const place = this.placesService.findOrCreate(this.value());
    this.valueChange.emit(place.name);
    this.placeSelected.emit(place);
    this.open.set(false);
  }
}
