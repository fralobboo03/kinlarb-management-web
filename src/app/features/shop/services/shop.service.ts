import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Shop } from '../models/shop.model';

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private readonly STORAGE_KEY = 'kinlarb_shops';
  private shopsSubject = new BehaviorSubject<Shop[]>([]);
  shops$ = this.shopsSubject.asObservable();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      let shops = this.loadShops();
      if (shops.length === 0) {
        shops = [
          { id: 1, name: 'ร้านลาบ' },
          { id: 2, name: 'ร้านน้ำ' }
        ];
        this.saveShops(shops);
      } else {
        this.shopsSubject.next(shops);
      }
    } else {
      // Default for SSR
      this.shopsSubject.next([
        { id: 1, name: 'ร้านลาบ' },
        { id: 2, name: 'ร้านน้ำ' }
      ]);
    }
  }

  private loadShops(): Shop[] {
    if (this.isBrowser) {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
    return [];
  }

  private saveShops(shops: Shop[]): void {
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(shops));
    }
    this.shopsSubject.next(shops);
  }

  getShops(): Shop[] {
    return this.shopsSubject.getValue();
  }

  getShopById(id: number): Shop | undefined {
    return this.getShops().find(s => s.id === id);
  }
}
