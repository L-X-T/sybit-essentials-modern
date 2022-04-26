import { Component, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { Flight } from '../entities/flight';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FlightService } from './flight.service';
import { CityPipe } from '../shared/pipes/city.pipe';
import { Observable, Observer, share, Subject, Subscription, takeUntil } from 'rxjs';
import { AsyncCityPipe } from '../shared/pipes/async-city.pipe';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, CityPipe, AsyncCityPipe],
  selector: 'app-flight-search',
  templateUrl: './flight-search.component.html',
  styleUrl: './flight-search.component.css',
})
export class FlightSearchComponent implements OnDestroy {
  from = 'Hamburg';
  to = 'Graz';
  flights: Flight[] = [];
  flights$?: Observable<Flight[]>;
  flightsSubscription?: Subscription;
  private readonly onDestroySubject = new Subject<void>();
  readonly terminator$ = this.onDestroySubject.asObservable();

  selectedFlight?: Flight;

  message = '';

  // private readonly flightService = inject(FlightService);
  constructor(private readonly flightService: FlightService) {
    this.onSearch();
  }

  onSearch(): void {
    // 1. my observable
    this.flights$ = this.flightService.find(this.from, this.to).pipe(share());

    // 2. my observer
    const flightsObserver: Observer<Flight[]> = {
      next: (flights) => (this.flights = flights),
      error: (errResp: HttpErrorResponse) => console.error('Error loading flights', errResp),
      complete: () => console.debug('Flights loading completed.'),
    };

    // 3a. my subscription
    this.flightsSubscription?.unsubscribe();
    this.flightsSubscription = this.flights$.subscribe(flightsObserver);

    // 3b. takeUntil terminator$ emits
    this.flights$.pipe(takeUntil(this.terminator$)).subscribe(flightsObserver);
  }

  ngOnDestroy(): void {
    // 4a. my unsubscribe
    this.flightsSubscription?.unsubscribe();

    // 4b. subject emit thru terminator$
    this.onDestroySubject.next();
    this.onDestroySubject.complete();
  }

  onSelect(selectedFlight: Flight): void {
    this.selectedFlight = selectedFlight;
  }

  onSave(): void {
    if (this.selectedFlight) {
      this.flightService.save(this.selectedFlight).subscribe({
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
  }
}
