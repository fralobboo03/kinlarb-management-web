import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Menu } from '../models/menu.model';
import { Sale } from '../models/sale.model';
import { StockService } from './stock.service';

interface SaleResult {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private readonly STORAGE_KEY = 'kinlarb_sales';
  private readonly salesSubject = new BehaviorSubject<Sale[]>([]);
  readonly sales$ = this.salesSubject.asObservable();
  private readonly isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly stockService: StockService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.salesSubject.next(this.loadSales());
    }
  }

  getSalesByShop(shopId: number): Observable<Sale[]> {
    return this.sales$.pipe(
      map((sales) =>
        sales
          .filter((sale) => sale.shopId === shopId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      )
    );
  }

  recordSale(shopId: number, sale: Omit<Sale, 'id' | 'shopId'>, menu: Menu): SaleResult {
    if (sale.quantitySold <= 0 || sale.pricePerUnit <= 0) {
      return { success: false, error: 'จำนวนขายและราคาต่อหน่วยต้องมากกว่า 0' };
    }

    const deductions = menu.ingredients
      .filter((ingredient) => ingredient.quantity != null)
      .map((ingredient) => ({
        name: ingredient.name,
        quantity: (ingredient.quantity ?? 0) * sale.quantitySold
      }));

    const stockValidation = this.stockService.canDeductStock(shopId, deductions);
    if (!stockValidation.valid) {
      return {
        success: false,
        error: `สต็อกไม่พอสำหรับ: ${stockValidation.insufficientItems.join(', ')}`
      };
    }

    this.stockService.recordSaleStockOut(shopId, deductions);

    const nextSale: Sale = {
      ...sale,
      id: Date.now(),
      shopId
    };

    const current = this.salesSubject.getValue();
    this.saveSales([...current, nextSale]);

    return { success: true };
  }

  private loadSales(): Sale[] {
    if (!this.isBrowser) {
      return [];
    }

    const payload = localStorage.getItem(this.STORAGE_KEY);
    if (!payload) {
      return [];
    }

    try {
      const parsed = JSON.parse(payload) as Sale[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveSales(sales: Sale[]): void {
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sales));
    }
    this.salesSubject.next(sales);
  }
}
