import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ElementRef, ViewChild, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { CarsPaginationComponent } from '../../components/cars-pagination/cars-pagination.component';
import { CarsLiveService } from '../../services/cars-live.service';
import { CarsApiService } from '../../services/cars-api.service';
import { Automobile } from '../../models/automobile.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';

type AutomobileKey = keyof Automobile;

const DEFAULT_PAGE_SIZE = 20;

@Component({
  selector: 'app-cars-list',
  imports: [
    CarsPaginationComponent,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './cars-list.component.html',
  styleUrl: './cars-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsListComponent implements OnInit, OnDestroy {
  private readonly carsLive = inject(CarsLiveService);
  private readonly carsApi = inject(CarsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private liveSubscription: Subscription | null = null;

  /** Whether the initial data load has been received (used to restore URL params once). */
  private initialLoadDone = false;

  readonly allCars = signal<Automobile[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  // Search & filter state
  readonly searchQuery = signal('');
  readonly selectedOrigins = signal<string[]>([]);
  readonly selectedCylinders = signal<number[]>([]);
  readonly mpgRange = signal<[number, number]>([0, 60]);
  readonly hpRange = signal<[number, number]>([0, 250]);
  readonly yearRange = signal<[number, number]>([0, 9999]);

  // Pagination state
  readonly pageIndex = signal(0);
  readonly pageSize = signal(DEFAULT_PAGE_SIZE);

  // Sort state
  readonly sortActive = signal<string>('');
  readonly sortDirection = signal<'asc' | 'desc' | ''>('');

  // Expanded card
  readonly expandedCarId = signal<string | null>(null);
  readonly deletingCarId = signal<string | null>(null);
  readonly resultsPanelHeight = signal<number | null>(null);

  @ViewChild('filtersPanel')
  set filtersPanelRef(elementRef: ElementRef<HTMLElement> | undefined) {
    this._filtersPanelRef = elementRef;
    if (elementRef) {
      this.startFilterHeightSync();
    } else {
      this.filterHeightObserver?.disconnect();
      this.resultsPanelHeight.set(null);
    }
  }

  private _filtersPanelRef?: ElementRef<HTMLElement>;

  private filterHeightObserver: ResizeObserver | null = null;

  /** Track whether initial URL params have been restored (prevents overwriting URL on load). */
  private urlRestored = false;

  // Distinct filter options derived from data
  readonly originOptions = computed(() => {
    const origins = [
      ...new Set(this.allCars().map((c) => this.normalizeOrigin(c.origin)).filter(Boolean)),
    ];
    return origins.sort();
  });

  readonly cylinderOptions = computed(() => {
    const cyls = [...new Set(this.allCars().map((c) => c.cylinders))].filter((v) => v != null);
    return cyls.sort((a, b) => a - b);
  });

  // Data range bounds (for slider limits)
  readonly mpgBounds = computed<[number, number]>(() => {
    const values = this.allCars().map((c) => c.mpg).filter((v) => v != null);
    if (!values.length) return [0, 60];
    return [Math.floor(Math.min(...values)), Math.ceil(Math.max(...values))];
  });

  readonly hpBounds = computed<[number, number]>(() => {
    const values = this.allCars().map((c) => c.horsepower).filter((v) => v != null);
    if (!values.length) return [0, 250];
    return [Math.floor(Math.min(...values)), Math.ceil(Math.max(...values))];
  });

  readonly yearBounds = computed<[number, number]>(() => {
    const values = this.allCars().map((c) => c.model_year).filter((v) => v != null);
    if (!values.length) return [1970, 2025];
    return [Math.min(...values), Math.max(...values)];
  });

  // Dashboard stats
  readonly manufacturerCount = computed(() => {
    const makes = new Set(
      this.allCars()
        .map((c) => c.name?.split(' ')[0]?.toLowerCase())
        .filter(Boolean)
    );
    return makes.size;
  });

  readonly oldestYear = computed(() => {
    const years = this.allCars().map((c) => c.model_year).filter((v) => v != null);
    return years.length ? Math.min(...years) : 0;
  });

  readonly newestYear = computed(() => {
    const years = this.allCars().map((c) => c.model_year).filter((v) => v != null);
    return years.length ? Math.max(...years) : 0;
  });

  readonly dataCompleteness = computed(() => {
    const cars = this.allCars();
    if (!cars.length) return 0;
    const fields: (keyof Automobile)[] = ['name', 'mpg', 'cylinders', 'displacement', 'horsepower', 'weight', 'acceleration', 'model_year', 'origin'];
    let filled = 0;
    let total = 0;
    for (const car of cars) {
      for (const f of fields) {
        total++;
        if (car[f] != null && car[f] !== '') filled++;
      }
    }
    return Math.round((filled / total) * 100);
  });

  // Sort options for dropdown
  readonly sortOptions = [
    { value: 'model_year:desc', label: 'Year (Newest first)' },
    { value: 'model_year:asc', label: 'Year (Oldest first)' },
    { value: 'name:asc', label: 'Name (A\u2013Z)' },
    { value: 'name:desc', label: 'Name (Z\u2013A)' },
    { value: 'horsepower:desc', label: 'HP (Highest first)' },
    { value: 'mpg:desc', label: 'MPG (Highest first)' },
  ];

  readonly currentSort = computed(() => {
    const active = this.sortActive();
    const dir = this.sortDirection();
    return active && dir ? `${active}:${dir}` : '';
  });

  readonly activeFilterPills = computed(() => {
    const pills: string[] = [];
    const q = this.searchQuery().trim();
    if (q) pills.push(`Keyword: ${q}`);
    const origins = this.selectedOrigins();
    if (origins.length) pills.push(`Origin: ${origins.join(' + ')}`);
    const cyls = this.selectedCylinders();
    if (cyls.length) pills.push(`Cylinders: ${cyls.join(', ')}`);
    const [yMin, yMax] = this.yearRange();
    const [yBMin, yBMax] = this.yearBounds();
    if (yMin > yBMin || yMax < yBMax) pills.push(`Year: ${yMin}\u2013${yMax}`);
    return pills;
  });

  // Filtered data (search + filters)
  readonly filteredCars = computed(() => {
    let cars = this.allCars();
    const query = this.searchQuery().trim().toLowerCase();
    const origins = this.selectedOrigins();
    const cylinders = this.selectedCylinders();
    const [mpgMin, mpgMax] = this.mpgRange();
    const [hpMin, hpMax] = this.hpRange();
    const [mpgBoundMin, mpgBoundMax] = this.mpgBounds();
    const [hpBoundMin, hpBoundMax] = this.hpBounds();

    if (query) {
      cars = cars.filter((c) => c.name?.toLowerCase().includes(query));
    }
    if (origins.length) {
      cars = cars.filter((c) => origins.includes(this.normalizeOrigin(c.origin)));
    }
    if (cylinders.length) {
      cars = cars.filter((c) => cylinders.includes(c.cylinders));
    }
    // Only apply range filter if user has changed from the full bounds
    if (mpgMin > mpgBoundMin || mpgMax < mpgBoundMax) {
      cars = cars.filter((c) => c.mpg != null && c.mpg >= mpgMin && c.mpg <= mpgMax);
    }
    if (hpMin > hpBoundMin || hpMax < hpBoundMax) {
      cars = cars.filter((c) => c.horsepower != null && c.horsepower >= hpMin && c.horsepower <= hpMax);
    }

    const [yearMin, yearMax] = this.yearRange();
    const [yearBoundMin, yearBoundMax] = this.yearBounds();
    if (yearMin > yearBoundMin || yearMax < yearBoundMax) {
      cars = cars.filter((c) => c.model_year != null && c.model_year >= yearMin && c.model_year <= yearMax);
    }

    return cars;
  });

  // Sorted data
  readonly sortedCars = computed(() => {
    const cars = [...this.filteredCars()];
    const active = this.sortActive() as AutomobileKey;
    const direction = this.sortDirection();

    if (!active || !direction) return cars;

    return cars.sort((a, b) => {
      const aVal = a[active];
      const bVal = b[active];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return direction === 'asc' ? comparison : -comparison;
    });
  });

  readonly paginatedCars = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedCars().slice(start, start + this.pageSize());
  });

  readonly totalItems = computed(() => this.sortedCars().length);

  // Active filter count for the badge
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.searchQuery().trim()) count++;
    if (this.selectedOrigins().length) count++;
    if (this.selectedCylinders().length) count++;
    const [mpgMin, mpgMax] = this.mpgRange();
    const [mpgBoundMin, mpgBoundMax] = this.mpgBounds();
    if (mpgMin > mpgBoundMin || mpgMax < mpgBoundMax) count++;
    const [hpMin, hpMax] = this.hpRange();
    const [hpBoundMin, hpBoundMax] = this.hpBounds();
    if (hpMin > hpBoundMin || hpMax < hpBoundMax) count++;
    const [yearMin, yearMax] = this.yearRange();
    const [yearBoundMin, yearBoundMax] = this.yearBounds();
    if (yearMin > yearBoundMin || yearMax < yearBoundMax) count++;
    return count;
  });

  constructor() {
    // Sync signals → URL whenever any filter/sort/page changes (after initial restore)
    effect(() => {
      // Read all signals so Angular tracks them as dependencies
      const params: Record<string, string> = {};
      const search = this.searchQuery().trim();
      const origins = this.selectedOrigins();
      const cylinders = this.selectedCylinders();
      const [mpgMin, mpgMax] = this.mpgRange();
      const [hpMin, hpMax] = this.hpRange();
      const [yearMin, yearMax] = this.yearRange();
      const sortBy = this.sortActive();
      const sortDir = this.sortDirection();
      const page = this.pageIndex();
      const size = this.pageSize();

      if (!this.urlRestored) return;

      if (search) params['search'] = search;
      if (origins.length) params['origin'] = origins.join(',');
      if (cylinders.length) params['cylinders'] = cylinders.join(',');

      const [mpgBMin, mpgBMax] = this.mpgBounds();
      if (mpgMin > mpgBMin || mpgMax < mpgBMax) {
        params['mpgMin'] = String(mpgMin);
        params['mpgMax'] = String(mpgMax);
      }

      const [hpBMin, hpBMax] = this.hpBounds();
      if (hpMin > hpBMin || hpMax < hpBMax) {
        params['hpMin'] = String(hpMin);
        params['hpMax'] = String(hpMax);
      }

      const [yearBMin, yearBMax] = this.yearBounds();
      if (yearMin > yearBMin || yearMax < yearBMax) {
        params['yearMin'] = String(yearMin);
        params['yearMax'] = String(yearMax);
      }

      if (sortBy && sortDir) {
        params['sortBy'] = sortBy;
        params['sortDir'] = sortDir;
      }

      if (page > 0) params['page'] = String(page);
      if (size !== DEFAULT_PAGE_SIZE) params['size'] = String(size);

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: params,
        replaceUrl: true,
      });
    });
  }

  ngOnInit(): void {
    this.liveSubscription = this.carsLive.watchAll().subscribe({
      next: (cars) => {
        this.allCars.set(cars);

        if (!this.initialLoadDone) {
          // First load: set slider bounds and restore URL state
          this.mpgRange.set(this.mpgBounds());
          this.hpRange.set(this.hpBounds());
          this.yearRange.set(this.yearBounds());
          this.restoreFromUrl();
          this.initialLoadDone = true;
        }

        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load automobiles. Please try again later.');
        this.loading.set(false);
        console.error(err);
      },
    });
  }

  ngOnDestroy(): void {
    this.liveSubscription?.unsubscribe();
    this.filterHeightObserver?.disconnect();
  }

  private startFilterHeightSync(): void {
    const element = this._filtersPanelRef?.nativeElement;
    if (!element || typeof ResizeObserver === 'undefined') {
      this.resultsPanelHeight.set(null);
      return;
    }

    this.filterHeightObserver?.disconnect();
    this.filterHeightObserver = new ResizeObserver(() => {
      this.syncResultsPanelHeight();
    });
    this.filterHeightObserver.observe(element);
    this.syncResultsPanelHeight();
  }

  private syncResultsPanelHeight(): void {
    const element = this._filtersPanelRef?.nativeElement;
    if (!element || window.innerWidth <= 1080) {
      this.resultsPanelHeight.set(null);
      return;
    }

    this.resultsPanelHeight.set(Math.ceil(element.getBoundingClientRect().height));
  }

  private restoreFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;

    const search = params.get('search');
    if (search) this.searchQuery.set(search);

    const origin = params.get('origin');
    if (origin) {
      const normalizedOrigins = [
        ...new Set(origin.split(',').map((item) => this.normalizeOrigin(item)).filter(Boolean)),
      ];
      this.selectedOrigins.set(normalizedOrigins);
    }

    const cylinders = params.get('cylinders');
    if (cylinders) {
      this.selectedCylinders.set(cylinders.split(',').map(Number).filter(Number.isFinite));
    }

    const mpgMin = params.get('mpgMin');
    const mpgMax = params.get('mpgMax');
    if (mpgMin != null && mpgMax != null) {
      this.mpgRange.set([Number(mpgMin), Number(mpgMax)]);
    }

    const hpMin = params.get('hpMin');
    const hpMax = params.get('hpMax');
    if (hpMin != null && hpMax != null) {
      this.hpRange.set([Number(hpMin), Number(hpMax)]);
    }

    const yearMinParam = params.get('yearMin');
    const yearMaxParam = params.get('yearMax');
    if (yearMinParam != null && yearMaxParam != null) {
      this.yearRange.set([Number(yearMinParam), Number(yearMaxParam)]);
    }

    const sortBy = params.get('sortBy');
    const sortDir = params.get('sortDir') as 'asc' | 'desc' | null;
    if (sortBy && sortDir) {
      this.sortActive.set(sortBy);
      this.sortDirection.set(sortDir);
    }

    const page = params.get('page');
    if (page) this.pageIndex.set(Number(page));

    const size = params.get('size');
    if (size) this.pageSize.set(Number(size));

    // Mark restore complete so the effect starts syncing to URL
    this.urlRestored = true;
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.pageIndex.set(0);
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.pageIndex.set(0);
  }

  toggleOrigin(origin: string): void {
    const normalizedOrigin = this.normalizeOrigin(origin);
    if (!normalizedOrigin) return;

    const current = this.selectedOrigins();
    if (current.includes(normalizedOrigin)) {
      this.selectedOrigins.set(current.filter((o) => o !== normalizedOrigin));
    } else {
      this.selectedOrigins.set([...current, normalizedOrigin]);
    }
    this.pageIndex.set(0);
  }

  private normalizeOrigin(origin: string | null | undefined): string {
    return (origin ?? '').trim().toUpperCase();
  }

  toggleCylinder(cyl: number): void {
    const current = this.selectedCylinders();
    if (current.includes(cyl)) {
      this.selectedCylinders.set(current.filter((c) => c !== cyl));
    } else {
      this.selectedCylinders.set([...current, cyl]);
    }
    this.pageIndex.set(0);
  }

  onSortOptionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (!value) {
      this.sortActive.set('');
      this.sortDirection.set('');
    } else {
      const [field, dir] = value.split(':');
      this.sortActive.set(field);
      this.sortDirection.set(dir as 'asc' | 'desc');
    }
    this.pageIndex.set(0);
  }

  onYearMinChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.yearRange.set([val, this.yearRange()[1]]);
      this.pageIndex.set(0);
    }
  }

  onYearMaxChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.yearRange.set([this.yearRange()[0], val]);
      this.pageIndex.set(0);
    }
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedOrigins.set([]);
    this.selectedCylinders.set([]);
    this.mpgRange.set(this.mpgBounds());
    this.hpRange.set(this.hpBounds());
    this.yearRange.set(this.yearBounds());
    this.sortActive.set('');
    this.sortDirection.set('');
    this.pageIndex.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.expandedCarId.set(null);
  }

  toggleCarExpanded(carId: string): void {
    this.expandedCarId.update((current) => current === carId ? null : carId);
  }

  isCarExpanded(carId: string): boolean {
    return this.expandedCarId() === carId;
  }

  shouldHideCard(index: number): boolean {
    const expandedId = this.expandedCarId();
    if (!expandedId || index < 0) return false;

    const cars = this.paginatedCars();
    const expandedIndex = cars.findIndex((car) => car.id === expandedId);
    if (expandedIndex < 0) return false;

    const isRightColumnCard = expandedIndex % 2 === 1;
    if (!isRightColumnCard) return false;

    return index === expandedIndex - 1;
  }

  openEditCarDialog(car: Automobile, event?: Event): void {
    event?.stopPropagation();

    import('../../components/edit-car-dialog/edit-car-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.EditCarDialogComponent, {
        width: '600px',
        maxWidth: '95vw',
        disableClose: true,
        data: { car },
      });

      dialogRef.afterClosed().subscribe();
    });
  }

  deleteCar(car: Automobile, event?: Event): void {
    event?.stopPropagation();

    if (this.deletingCarId() === car.id) return;

    const confirmed = window.confirm(`Delete "${car.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    this.deletingCarId.set(car.id);

    this.carsApi.delete(car.id).subscribe({
      next: () => {
        if (this.expandedCarId() === car.id) {
          this.expandedCarId.set(null);
        }
        this.deletingCarId.set(null);
      },
      error: (err) => {
        this.deletingCarId.set(null);
        window.alert('Failed to delete automobile. Please try again.');
        console.error('Delete automobile error:', err);
      },
    });
  }

  isDeletingCar(carId: string): boolean {
    return this.deletingCarId() === carId;
  }

  exportCsv(): void {
    const cars = this.sortedCars();
    if (!cars.length) return;

    const headers: (keyof Automobile)[] = [
      'name', 'mpg', 'cylinders', 'displacement',
      'horsepower', 'weight', 'acceleration', 'model_year', 'origin',
    ];

    const escapeCsvField = (value: unknown): string => {
      const str = value == null ? '' : String(value);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const rows = cars.map((car) =>
      headers.map((h) => escapeCsvField(car[h])).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'automobiles.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  openAddCarDialog(): void {
    import('../../components/add-car-dialog/add-car-dialog.component').then((m) => {
      const dialogRef = this.dialog.open(m.AddCarDialogComponent, {
        width: '600px',
        maxWidth: '95vw',
        disableClose: true,
      });

      dialogRef.afterClosed().subscribe();
      // No manual push needed — Firestore listener auto-detects new documents
    });
  }

}
