import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CarsApiService } from './cars-api.service';
import { Automobile, CreateAutomobilePayload } from '../models/automobile.model';
import { environment } from '../../../environments/environment';

const API_BASE_URL =
  (globalThis as { FIREHAWK_TEST_API_BASE_URL?: string }).FIREHAWK_TEST_API_BASE_URL ??
  environment.apiBaseUrl;
const AUTOMOBILES_ENDPOINT = `${API_BASE_URL}/v1/automobiles`;

describe('CarsApiService', () => {
  let service: CarsApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CarsApiService,
      ],
    });

    service = TestBed.inject(CarsApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send POST request to create a car and return the created automobile', () => {
    const payload: CreateAutomobilePayload = {
      name: 'Test Car',
      mpg: 25,
      cylinders: 4,
      displacement: 120,
      horsepower: 100,
      weight: 2500,
      acceleration: 14,
      model_year: 82,
      origin: 'USA',
    };

    const mockResponse = {
      success: true,
      data: { id: 'abc123', ...payload } as Automobile,
    };

    service.create(payload).subscribe((result) => {
      expect(result.id).toBe('abc123');
      expect(result.name).toBe('Test Car');
      expect(result.mpg).toBe(25);
      expect(result.origin).toBe('USA');
    });

    const req = httpMock.expectOne(AUTOMOBILES_ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('should handle API error on create', () => {
    const payload: CreateAutomobilePayload = {
      name: 'Bad Car',
      mpg: 0,
      cylinders: 0,
      displacement: 0,
      horsepower: 0,
      weight: 0,
      acceleration: 0,
      model_year: 0,
      origin: '',
    };

    service.create(payload).subscribe({
      next: () => {
        throw new Error('Expected an error but got success');
      },
      error: (err) => {
        expect(err.status).toBe(500);
      },
    });

    const req = httpMock.expectOne(AUTOMOBILES_ENDPOINT);
    req.flush({ success: false, error: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
  });

  it('should send PUT request to update a car and return updated automobile', () => {
    const id = 'abc123';
    const payload: CreateAutomobilePayload = {
      name: 'Updated Car',
      mpg: 28,
      cylinders: 4,
      displacement: 140,
      horsepower: 115,
      weight: 2400,
      acceleration: 13,
      model_year: 84,
      origin: 'Europe',
    };

    const mockResponse = {
      success: true,
      data: { id, ...payload } as Automobile,
    };

    service.update(id, payload).subscribe((result) => {
      expect(result.id).toBe(id);
      expect(result.name).toBe('Updated Car');
      expect(result.origin).toBe('Europe');
    });

    const req = httpMock.expectOne(`${AUTOMOBILES_ENDPOINT}/${id}`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('should send DELETE request to remove a car', () => {
    const id = 'to-delete';

    service.delete(id).subscribe((result) => {
      expect(result).toBeUndefined();
    });

    const req = httpMock.expectOne(`${AUTOMOBILES_ENDPOINT}/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });
});

