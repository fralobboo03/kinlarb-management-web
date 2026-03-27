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

    const defaultShops = [
      { id: 1, name: 'KIN LARBBBB' },
      { id: 2, name: 'KIN SMOOTH' }
    ];

    if (this.isBrowser) {
      // Always initialize with default shops and save to localStorage
      this.saveShops(defaultShops);
    } else {
      // Default for SSR
      this.shopsSubject.next(defaultShops);
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

  addShop(name: string): void {
    const shops = this.getShops();
    const newId = Math.max(...shops.map(s => s.id), 0) + 1;
    const newShop: Shop = { id: newId, name };
    this.saveShops([...shops, newShop]);
  }

  deleteShop(id: number): void {
    const shops = this.getShops().filter(s => s.id !== id);
    this.saveShops(shops);
  }
}
