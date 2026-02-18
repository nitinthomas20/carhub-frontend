import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CarsApiService } from '../../services/cars-api.service';
import { Automobile, CreateAutomobilePayload } from '../../models/automobile.model';

const ORIGIN_OPTIONS = ['USA', 'Europe', 'Japan'] as const;

interface EditCarDialogData {
  car: Automobile;
}

@Component({
  selector: 'app-edit-car-dialog',
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
  templateUrl: './edit-car-dialog.component.html',
  styleUrl: './edit-car-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditCarDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly carsApi = inject(CarsApiService);
  private readonly dialogRef = inject(MatDialogRef<EditCarDialogComponent>);
  private readonly data = inject<EditCarDialogData>(MAT_DIALOG_DATA);

  readonly originOptions = ORIGIN_OPTIONS;
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.car.name, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    mpg: [this.data.car.mpg, [Validators.required, Validators.min(0), Validators.max(100)]],
    cylinders: [this.data.car.cylinders, [Validators.required, Validators.min(1), Validators.max(16)]],
    displacement: [this.data.car.displacement, [Validators.required, Validators.min(0), Validators.max(1000)]],
    horsepower: [this.data.car.horsepower, [Validators.required, Validators.min(0), Validators.max(1000)]],
    weight: [this.data.car.weight, [Validators.required, Validators.min(0), Validators.max(10000)]],
    acceleration: [this.data.car.acceleration, [Validators.required, Validators.min(0), Validators.max(50)]],
    model_year: [this.data.car.model_year, [Validators.required, Validators.min(70), Validators.max(99)]],
    origin: [this.data.car.origin, [Validators.required]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const payload: CreateAutomobilePayload = this.form.getRawValue();

    this.carsApi.update(this.data.car.id, payload).subscribe({
      next: (updatedCar) => {
        this.submitting.set(false);
        this.dialogRef.close(updatedCar);
      },
      error: (err) => {
        this.submitting.set(false);
        this.submitError.set('Failed to update automobile. Please try again.');
        console.error('Update automobile error:', err);
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
