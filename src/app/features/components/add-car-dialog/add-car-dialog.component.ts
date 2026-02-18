import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CarsApiService } from '../../services/cars-api.service';
import { CreateAutomobilePayload } from '../../models/automobile.model';

const ORIGIN_OPTIONS = ['USA', 'Europe', 'Japan'] as const;

@Component({
  selector: 'app-add-car-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './add-car-dialog.component.html',
  styleUrl: './add-car-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCarDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly carsApi = inject(CarsApiService);
  private readonly dialogRef = inject(MatDialogRef<AddCarDialogComponent>);

  readonly originOptions = ORIGIN_OPTIONS;
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    mpg: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    cylinders: [4, [Validators.required, Validators.min(1), Validators.max(16)]],
    displacement: [0, [Validators.required, Validators.min(0), Validators.max(1000)]],
    horsepower: [0, [Validators.required, Validators.min(0), Validators.max(1000)]],
    weight: [0, [Validators.required, Validators.min(0), Validators.max(10000)]],
    acceleration: [0, [Validators.required, Validators.min(0), Validators.max(50)]],
    model_year: [80, [Validators.required, Validators.min(70), Validators.max(99)]],
    origin: ['USA' as string, [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const payload: CreateAutomobilePayload = this.form.getRawValue();

    this.carsApi.create(payload).subscribe({
      next: (newCar) => {
        this.submitting.set(false);
        this.dialogRef.close(newCar);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set('Failed to add automobile. Please try again.');
        console.error('Create automobile error:', err);
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
