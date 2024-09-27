import { Component, DestroyRef, inject, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Flight } from '../../entities/flight';
import { FlightService } from '../shared/services/flight.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FlightValidationErrorsComponent } from '../flight-validation-errors/flight-validation-errors.component';

@Component({
  standalone: true,
  selector: 'app-flight-edit',
  templateUrl: './flight-edit.component.html',
  styleUrls: ['./flight-edit.component.css'],
  imports: [ReactiveFormsModule, FlightValidationErrorsComponent],
})
export class FlightEditComponent implements OnChanges {
  @Input() flight?: Flight | null;

  private readonly destroyRef = inject(DestroyRef);
  private readonly flightService = inject(FlightService);

  editForm: FormGroup = inject(FormBuilder).group({
    id: [0, [Validators.required, Validators.min(0), Validators.pattern(/^[0-9]+$/)]],
    from: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(15),
        Validators.pattern(/^[a-zA-ZäöüÄÖÜß ]+$/),
      ],
    ],
    to: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(15),
        Validators.pattern(/^[a-zA-ZäöüÄÖÜß ]+$/),
      ],
    ],
    date: ['', [Validators.required, Validators.minLength(33), Validators.maxLength(33)]],
  });

  message = '';

  private readonly valueChangesLogger = this.editForm.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
    console.log(value);
  });

  ngOnChanges(): void {
    if (this.flight) {
      this.editForm.patchValue(this.flight);
    }
  }

  save(): void {
    this.flightService
      .save(this.editForm.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (flight) => {
          this.message = 'Success!';
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error', err);
          this.message = 'Error!';
        },
      });
  }
}
