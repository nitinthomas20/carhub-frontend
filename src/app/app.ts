
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './features/services/auth.service';

const FONT_SIZES = ['normal', 'large', 'x-large'] as const;
type FontSize = (typeof FONT_SIZES)[number];

const FONT_SCALE_MAP: Record<FontSize, number> = {
  normal: 1,
  large: 1.2,
  'x-large': 1.4,
};

const FONT_LABEL_MAP: Record<FontSize, string> = {
  normal: 'Normal',
  large: 'Large',
  'x-large': 'Extra Large',
};

type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private fontIndex = signal(0);
  private themeMode = signal<ThemeMode>('light');

  readonly fontLabel = computed(() => FONT_LABEL_MAP[FONT_SIZES[this.fontIndex()]]);
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly isDarkMode = computed(() => this.themeMode() === 'dark');
  readonly themeButtonLabel = computed(() => this.isDarkMode() ? 'Switch to light mode' : 'Switch to dark mode');
  readonly themeIcon = computed(() => this.isDarkMode() ? '☀️' : '🌙');

  constructor() {
    // Restore saved preference
    const saved = localStorage.getItem('fontSizeIndex');
    if (saved) {
      const idx = Number(saved);
      if (idx >= 0 && idx < FONT_SIZES.length) {
        this.fontIndex.set(idx);
        this.applyScale(idx);
      }
    }

    const savedTheme = localStorage.getItem('themeMode');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.themeMode.set(savedTheme);
    }
    this.applyTheme(this.themeMode());
  }

  cycleFontSize(): void {
    const next = (this.fontIndex() + 1) % FONT_SIZES.length;
    this.fontIndex.set(next);
    this.applyScale(next);
    localStorage.setItem('fontSizeIndex', String(next));
  }

  toggleThemeMode(): void {
    const nextTheme: ThemeMode = this.themeMode() === 'light' ? 'dark' : 'light';
    this.themeMode.set(nextTheme);
    this.applyTheme(nextTheme);
    localStorage.setItem('themeMode', nextTheme);
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private applyScale(idx: number): void {
    document.documentElement.style.setProperty(
      '--app-font-scale',
      String(FONT_SCALE_MAP[FONT_SIZES[idx]]),
    );
  }

  private applyTheme(theme: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', theme === 'dark');
    root.style.setProperty('color-scheme', theme);
  }
}
