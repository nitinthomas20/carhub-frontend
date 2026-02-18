import {
  Component,
  ChangeDetectionStrategy,
  input,
  effect,
  viewChild,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { Automobile } from '../../models/automobile.model';

@Component({
  selector: 'app-cars-table',
  imports: [DecimalPipe, MatTableModule, MatSortModule],
  templateUrl: './cars-table.component.html',
  styleUrl: './cars-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsTableComponent {
  readonly cars = input<Automobile[]>([]);
  readonly sortChange = output<Sort>();

  readonly sort = viewChild(MatSort);

  readonly displayedColumns: readonly string[] = [
    'name',
    'mpg',
    'cylinders',
    'displacement',
    'horsepower',
    'weight',
    'acceleration',
    'model_year',
    'origin',
  ] as const;

  dataSource = new MatTableDataSource<Automobile>([]);

  constructor() {
    effect(() => {
      this.dataSource.data = this.cars();
    });
  }

  onSortChange(sort: Sort): void {
    this.sortChange.emit(sort);
  }
}
