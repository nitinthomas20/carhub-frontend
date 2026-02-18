import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { guestOnlyGuard, requireAuthGuard } from './shared/guards/auth.guard';

const FIRST_VISIT_KEY = 'firehawkHasVisited';

const hasVisitedBefore = (): boolean => {
  try {
    return localStorage.getItem(FIRST_VISIT_KEY) === 'true';
  } catch {
    return false;
  }
};

const redirectFirstTimeUsersToWelcome: CanActivateFn = () => {
  if (hasVisitedBefore()) return true;
  const router = inject(Router);
  return router.createUrlTree(['/welcome']);
};

const redirectReturningUsersToCars: CanActivateFn = () => {
  if (!hasVisitedBefore()) return true;
  const router = inject(Router);
  return router.createUrlTree(['/cars']);
};

export const routes: Routes = [
  { path: '', redirectTo: 'cars', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestOnlyGuard],
    loadComponent: () =>
      import('./features/pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'welcome',
    canActivate: [redirectReturningUsersToCars],
    loadComponent: () =>
      import('./features/pages/welcome/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    path: 'cars',
    canActivate: [requireAuthGuard, redirectFirstTimeUsersToWelcome],
    loadComponent: () =>
      import('./features/pages/cars-list/cars-list.component').then((m) => m.CarsListComponent),
  },
  { path: '**', redirectTo: 'cars' },
];
