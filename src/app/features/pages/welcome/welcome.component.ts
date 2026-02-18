import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

const FIRST_VISIT_KEY = 'firehawkHasVisited';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    void import('../cars-list/cars-list.component');
  }

  continueToGarage(): void {
    localStorage.setItem(FIRST_VISIT_KEY, 'true');
    this.router.navigate(['/cars']);
  }
}
