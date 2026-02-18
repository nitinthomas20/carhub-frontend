import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { collection, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { Automobile } from '../models/automobile.model';

interface CarsCachePayload {
  cars: Automobile[];
  updatedAt: number;
}

const CARS_CACHE_KEY = 'firehawkCarsCacheV1';

@Injectable({ providedIn: 'root' })
export class CarsLiveService {
  private readonly collectionRef = collection(db, 'automobiles');

  /**
   * Returns an Observable that emits the full list of automobiles
   * every time the Firestore collection changes (real-time).
   * Automatically cleans up the listener when unsubscribed.
   */
  watchAll(): Observable<Automobile[]> {
    return new Observable<Automobile[]>((subscriber) => {
      const cachedCars = this.readCache();
      if (cachedCars.length) {
        subscriber.next(cachedCars);
      }

      const unsubscribe = onSnapshot(
        this.collectionRef,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const cars: Automobile[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Automobile[];

          this.writeCache(cars);
          subscriber.next(cars);
        },
        (error) => {
          subscriber.error(error);
        },
      );

      // Cleanup: detach the Firestore listener when the Observable is unsubscribed
      return () => unsubscribe();
    });
  }

  private readCache(): Automobile[] {
    try {
      const raw = localStorage.getItem(CARS_CACHE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as CarsCachePayload;
      if (!parsed || !Array.isArray(parsed.cars)) return [];

      return parsed.cars;
    } catch {
      return [];
    }
  }

  private writeCache(cars: Automobile[]): void {
    try {
      const payload: CarsCachePayload = {
        cars,
        updatedAt: Date.now(),
      };
      localStorage.setItem(CARS_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore cache write failures (quota or privacy mode restrictions)
    }
  }
}
