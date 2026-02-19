import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { CarsListComponent } from './cars-list.component';
import { CarsLiveService } from '../../services/cars-live.service';
import { Automobile } from '../../models/automobile.model';

const MOCK_CARS: Automobile[] = [
  { id: '1', name: 'Ford Mustang', mpg: 18, cylinders: 8, displacement: 302, horsepower: 140, weight: 3449, acceleration: 10.5, model_year: 70, origin: 'USA' },
  { id: '2', name: 'Toyota Corolla', mpg: 32, cylinders: 4, displacement: 97, horsepower: 75, weight: 2171, acceleration: 16, model_year: 78, origin: 'Japan' },
  { id: '3', name: 'BMW 320i', mpg: 22, cylinders: 4, displacement: 121, horsepower: 110, weight: 2800, acceleration: 15.4, model_year: 80, origin: 'Europe' },
  { id: '4', name: 'Chevrolet Impala', mpg: 14, cylinders: 8, displacement: 454, horsepower: 220, weight: 4354, acceleration: 9, model_year: 70, origin: 'USA' },
  { id: '5', name: 'Datsun 510', mpg: 27, cylinders: 4, displacement: 97, horsepower: 88, weight: 2130, acceleration: 14.5, model_year: 71, origin: 'Japan' },
];

describe('CarsListComponent', () => {
  let component: CarsListComponent;

  beforeEach(async () => {
    const mockLiveService = {
      watchAll: () => of(MOCK_CARS),
    };

    await TestBed.configureTestingModule({
      imports: [CarsListComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: CarsLiveService, useValue: mockLiveService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CarsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load all cars from the live service', () => {
    expect(component.allCars().length).toBe(5);
    expect(component.loading()).toBe(false);
  });

  // ── Filtering ──

  it('should filter cars by search query (name)', () => {
    component.onSearchChange('ford');
    expect(component.filteredCars().length).toBe(1);
    expect(component.filteredCars()[0].name).toBe('Ford Mustang');
  });

  it('should filter cars by origin', () => {
    component.toggleOrigin('Japan');
    const filtered = component.filteredCars();
    expect(filtered.length).toBe(2);
    expect(filtered.every((c) => c.origin === 'Japan')).toBe(true);
  });

  it('should filter cars by cylinders', () => {
    component.toggleCylinder(8);
    const filtered = component.filteredCars();
    expect(filtered.length).toBe(2);
    expect(filtered.every((c) => c.cylinders === 8)).toBe(true);
  });

  it('should filter by MPG range', () => {
    component.mpgRange.set([20, 30]);
    const filtered = component.filteredCars();
    expect(filtered.length).toBe(2); // BMW 22, Datsun 27
    expect(filtered.every((c) => c.mpg >= 20 && c.mpg <= 30)).toBe(true);
  });

  it('should filter by horsepower range', () => {
    component.hpRange.set([100, 200]);
    const filtered = component.filteredCars();
    expect(filtered.length).toBe(2); // Mustang 140, BMW 110
    expect(filtered.every((c) => c.horsepower >= 100 && c.horsepower <= 200)).toBe(true);
  });

  it('should combine multiple filters', () => {
    component.toggleOrigin('USA');
    component.toggleCylinder(8);
    component.onSearchChange('ford');
    const filtered = component.filteredCars();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Ford Mustang');
  });

  it('should clear all filters', () => {
    component.onSearchChange('ford');
    component.toggleOrigin('USA');
    expect(component.filteredCars().length).toBe(1);

    component.clearAllFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.selectedOrigins().length).toBe(0);
    expect(component.filteredCars().length).toBe(5);
  });

  it('should count active filters correctly', () => {
    expect(component.activeFilterCount()).toBe(0);

    component.onSearchChange('ford');
    expect(component.activeFilterCount()).toBe(1);

    component.toggleOrigin('USA');
    expect(component.activeFilterCount()).toBe(2);

    component.clearAllFilters();
    expect(component.activeFilterCount()).toBe(0);
  });

  // ── Sorting ──

  it('should sort by name ascending', () => {
    component.sortActive.set('name');
    component.sortDirection.set('asc');
    const sorted = component.sortedCars();
    expect(sorted[0].name).toBe('BMW 320i');
    expect(sorted[sorted.length - 1].name).toBe('Toyota Corolla');
  });

  it('should sort by mpg descending', () => {
    component.sortActive.set('mpg');
    component.sortDirection.set('desc');
    const sorted = component.sortedCars();
    expect(sorted[0].mpg).toBe(32);
    expect(sorted[sorted.length - 1].mpg).toBe(14);
  });

  // ── Pagination ──

  it('should paginate results correctly', () => {
    // Set page size to 2
    component.onPageChange({ pageIndex: 0, pageSize: 2, length: 5 });
    expect(component.paginatedCars().length).toBe(2);

    // Go to page 2
    component.onPageChange({ pageIndex: 1, pageSize: 2, length: 5 });
    expect(component.paginatedCars().length).toBe(2);

    // Last page should have 1 item
    component.onPageChange({ pageIndex: 2, pageSize: 2, length: 5 });
    expect(component.paginatedCars().length).toBe(1);
  });

  // ── Computed options ──

  it('should derive distinct origin options', () => {
    const origins = component.originOptions();
    expect(origins).toEqual(['EUROPE', 'JAPAN', 'USA']);
  });

  it('should normalize origin options to uppercase without case-sensitive duplicates', () => {
    component.allCars.set([
      { id: 'a', name: 'A', mpg: 20, cylinders: 4, displacement: 100, horsepower: 90, weight: 2000, acceleration: 12, model_year: 80, origin: 'usa' },
      { id: 'b', name: 'B', mpg: 21, cylinders: 4, displacement: 100, horsepower: 91, weight: 2100, acceleration: 12, model_year: 80, origin: 'USA' },
      { id: 'c', name: 'C', mpg: 22, cylinders: 4, displacement: 100, horsepower: 92, weight: 2200, acceleration: 12, model_year: 80, origin: 'UsA ' },
      { id: 'd', name: 'D', mpg: 23, cylinders: 4, displacement: 100, horsepower: 93, weight: 2300, acceleration: 12, model_year: 80, origin: 'europe' },
    ]);

    expect(component.originOptions()).toEqual(['EUROPE', 'USA']);

    component.toggleOrigin('usa');
    expect(component.filteredCars().length).toBe(3);
  });

  it('should derive distinct cylinder options sorted', () => {
    const cyls = component.cylinderOptions();
    expect(cyls).toEqual([4, 8]);
  });

  it('should compute MPG bounds from data', () => {
    const [min, max] = component.mpgBounds();
    expect(min).toBe(14);
    expect(max).toBe(32);
  });

  it('should compute HP bounds from data', () => {
    const [min, max] = component.hpBounds();
    expect(min).toBe(75);
    expect(max).toBe(220);
  });
});
