import { Component, computed, DestroyRef, effect, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';

import { Flight } from '../../entities/flight';
import { CommonModule } from '@angular/common';
import { FlightService } from '../shared/services/flight.service';
import { CityPipe } from '../../shared/pipes/city.pipe';
import { BehaviorSubject, Observable, Observer, share, Subject, Subscription, takeUntil } from 'rxjs';
import { FlightCardComponent } from '../flight-card/flight-card.component';
import { FlightStatusToggleComponent } from '../flight-status-toggle/flight-status-toggle.component';
import { FlightValidationErrorsComponent } from '../flight-validation-errors/flight-validation-errors.component';
import { CityValidatorDirective } from '../shared/validation/city-validator.directive';
import { AsyncCityValidatorDirective } from '../shared/validation/async-city-validator.directive';
import { RoundTripValidatorDirective } from '../shared/validation/round-trip-validator.directive';
import { FlightEditComponent } from '../flight-edit/flight-edit.component';
import { CITY_PATTERN } from '../../shared/global';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CityPipe,
    FlightCardComponent,
    FlightStatusToggleComponent,
    FlightValidationErrorsComponent,
    CityValidatorDirective,
    AsyncCityValidatorDirective,
    RoundTripValidatorDirective,
    FlightEditComponent,
    RouterLink,
  ],
  selector: 'app-flight-search',
  templateUrl: './flight-search.component.html',
  styleUrl: './flight-search.component.css',
})
export class FlightSearchComponent implements OnDestroy {
  @ViewChild('flightSearchForm') flightSearchForm?: NgForm;

  from = 'Hamburg';
  to = 'Graz';
  minLength = 3;
  maxLength = 15;

  flights: Flight[] = []; // old school
  flights$?: Observable<Flight[]>; // observable
  flightsSubject = new BehaviorSubject<Flight[]>([]); // subject
  flightsSignal = signal<Flight[]>([]); // signal
  flightsLength = computed(() => this.flightsSignal().length); // computed signal

  flightsSubscription?: Subscription;
  private readonly onDestroySubject = new Subject<void>();
  readonly terminator$ = this.onDestroySubject.asObservable();

  selectedFlight?: Flight;
  flightToEdit: Flight | null = null;
  readonly CITY_PATTERN = CITY_PATTERN;

  message = '';

  basket: { [id: number]: boolean } = {
    3: true,
    5: true,
  };

  private readonly destroyRef = inject(DestroyRef);
  private readonly flightService = inject(FlightService);

  constructor() {
    effect(() => console.log(this.flightsSignal(), this.flightsLength())); // similar to RxJS tap()

    if (this.from && this.to) {
      this.onSearch();
    }
  }

  ngOnDestroy(): void {
    // 4a. my unsubscribe
    this.flightsSubscription?.unsubscribe();

    // 4b. subject emit thru terminator$
    this.onDestroySubject.next();
    this.onDestroySubject.complete();

    // complete behavior subject
    this.flightsSubject.complete();
  }

  onSearch(): void {
    if (this.flightSearchForm?.invalid) {
      this.flightSearchForm.form.markAllAsTouched();
      return;
    }

    // 1. my observable
    this.flights$ = this.flightService.find(this.from, this.to).pipe(share());

    // 2. my observer
    const flightsObserver: Observer<Flight[]> = {
      next: (flights) => {
        this.flights = flights;
        this.flightsSubject.next(flights);
        this.flightsSignal.set(flights);
        this.flightsSignal.update((flights) => [...flights]);
      },
      error: (errResp: HttpErrorResponse) => console.error('Error loading flights', errResp),
      complete: () => {
        // console.debug('Flights loading completed.');
      },
    };

    // 3a. my subscription
    this.flightsSubscription?.unsubscribe();
    this.flightsSubscription = this.flights$.subscribe(flightsObserver);

    // 3b. takeUntil terminator$ emits
    this.flights$.pipe(takeUntil(this.terminator$)).subscribe(flightsObserver);

    // 3c. takeUntilDestroyed
    this.flights$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(flightsObserver);
  }

  onSelect(selectedFlight: Flight): void {
    this.selectedFlight = selectedFlight;
  }

  /*onSave(): void {
    if (this.selectedFlight) {
      this.flightService
        .save(this.selectedFlight)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (flight) => {
            console.log('Flight saved: ', flight);
            this.selectedFlight = flight;
            this.message = 'Success!';
          },
          error: (errResponse: HttpErrorResponse) => {
            console.error('Error saving flight', errResponse);
            this.message = 'Error: ' + errResponse.message;
          },
        });
    }
  }*/

  updateFlight(updatedFlight: Flight): void {
    // console.warn('FlightSearchComponent - updateFlight()');
    // console.log(updatedFlight);

    this.flights = this.flights.map((flight) => (flight.id === updatedFlight.id ? updatedFlight : flight));

    this.onSearch(); // to update the results
  }

  delayFirstFlight(): void {
    if (this.flights.length > 0) {
      const ONE_MINUTE = 1000 * 60;
      const firstFlight = this.flights[0];
      const date = new Date(firstFlight.date);
      const newDate = new Date(date.getTime() + 15 * ONE_MINUTE);

      // mutable update
      firstFlight.date = newDate.toISOString();

      // immutable update
      // this.flights[0] = { ...firstFlight, date: newDate.toISOString() };
    }
  }
}
