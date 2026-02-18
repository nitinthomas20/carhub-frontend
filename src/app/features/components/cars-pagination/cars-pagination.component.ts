import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-cars-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatPaginatorModule],
  templateUrl: './cars-pagination.component.html',
  styleUrl: './cars-pagination.component.scss',
})
export class CarsPaginationComponent {
  readonly totalItems = input.required<number>();
  readonly pageSize = input<number>(20);
  readonly pageIndex = input<number>(0);
  readonly page = output<PageEvent>();

  onPage(event: PageEvent): void {
    this.page.emit(event);
  }
}
