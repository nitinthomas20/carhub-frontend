import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Automobile, CreateAutomobilePayload, SingleAutomobileResponse } from '../models/automobile.model';
import { environment } from '../../../environments/environment';

interface DeleteAutomobileResponse {
  success: boolean;
}

@Injectable({ providedIn: 'root' })
export class CarsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/automobiles`;

  create(payload: CreateAutomobilePayload): Observable<Automobile> {
    return this.http.post<SingleAutomobileResponse>(this.baseUrl, payload).pipe(
      map((res) => res.data),
    );
  }

  update(id: string, payload: CreateAutomobilePayload): Observable<Automobile> {
    return this.http.put<SingleAutomobileResponse>(`${this.baseUrl}/${id}`, payload).pipe(
      map((res) => res.data),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<DeleteAutomobileResponse>(`${this.baseUrl}/${id}`).pipe(
      map(() => undefined),
    );
  }
}
