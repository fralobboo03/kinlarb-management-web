import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StockTransaction } from '../models/stock-transaction.model';
import { StockItem } from '../models/stock-item.model';

interface StockDeduction {
  name: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private readonly STORAGE_KEY = 'kinlarb_stocks';
  private transactionsSubject = new BehaviorSubject<StockTransaction[]>([]);
  transactions$ = this.transactionsSubject.asObservable();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.transactionsSubject.next(this.loadTransactions());
    }
  }

  private loadTransactions(): StockTransaction[] {
    if (this.isBrowser) {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    }
    return [];
  }

  private saveTransactions(transactions: StockTransaction[]): void {
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    }
    this.transactionsSubject.next(transactions);
  }

  addStockIn(shopId: number, name: string, unit: string, quantity: number, pricePerUnit: number): void {
    const totalCost = quantity * pricePerUnit;

    this.addTransaction({
      shopId,
      type: 'IN',
      name,
      unit,
      quantity,
      pricePerUnit,
      totalCost,
      cost: totalCost,
      date: new Date()
    });
  }

  addStockOut(shopId: number, name: string, quantity: number, price?: number): boolean {
    return this.deductStock(shopId, name, quantity, price);
  }

  private addTransaction(tx: StockTransaction): void {
    const transactions = this.transactionsSubject.getValue();
    const nextTransactions = [...transactions, { ...tx, id: new Date().getTime() }];
    this.saveTransactions(nextTransactions);
  }

  getStockItems(shopId: number): Observable<StockItem[]> {
    return this.transactions$.pipe(
      map((txs) => {
        const shopTxs = txs.filter((tx) => tx.shopId === shopId);
        const stockMap = new Map<string, StockItem>();

        for (const tx of shopTxs) {
          const key = tx.name.trim().toLowerCase();
          const existing = stockMap.get(key) ?? {
            id: this.toStockItemId(tx.name),
            name: tx.name,
            unit: tx.unit ?? '-',
            quantity: 0,
            pricePerUnit: tx.pricePerUnit ?? 0,
            totalCost: 0
          };

          if (tx.type === 'IN') {
            existing.quantity += tx.quantity;
            existing.unit = tx.unit ?? existing.unit;

            const txUnitCost = tx.totalCost ?? tx.cost ?? (tx.pricePerUnit ?? 0) * tx.quantity;
            existing.totalCost += txUnitCost;

            if ((tx.pricePerUnit ?? 0) > 0) {
              existing.pricePerUnit = tx.pricePerUnit ?? existing.pricePerUnit;
            }
          } else {
            existing.quantity -= tx.quantity;
          }

          stockMap.set(key, existing);
        }

        return Array.from(stockMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => ({
            ...item,
            totalCost: Math.max(item.quantity, 0) * item.pricePerUnit
          }));
      })
    );
  }

  canDeductStock(shopId: number, deductions: StockDeduction[]): { valid: boolean; insufficientItems: string[] } {
    const currentStock = this.getCurrentStockMap(shopId);
    const insufficientItems = deductions
      .filter((item) => item.quantity > 0)
      .filter((item) => (currentStock.get(item.name.trim().toLowerCase()) ?? 0) < item.quantity)
      .map((item) => item.name);

    return { valid: insufficientItems.length === 0, insufficientItems };
  }

  recordSaleStockOut(shopId: number, deductions: StockDeduction[]): void {
    for (const deduction of deductions) {
      if (deduction.quantity <= 0) {
        continue;
      }

      const unit = this.getLatestUnit(shopId, deduction.name);
      this.addTransaction({
        shopId,
        type: 'OUT',
        name: deduction.name,
        unit,
        quantity: deduction.quantity,
        price: undefined,
        date: new Date(),
        // Keep a readable source in name context for history consumers if needed.
        cost: undefined,
        totalCost: undefined,
        pricePerUnit: undefined
      });
    }
  }

  private deductStock(shopId: number, name: string, quantity: number, price?: number): boolean {
    if (!name.trim() || quantity <= 0) {
      return false;
    }

    const stockMap = this.getCurrentStockMap(shopId);
    const current = stockMap.get(name.trim().toLowerCase()) ?? 0;
    if (current < quantity) {
      return false;
    }

    this.addTransaction({
      shopId,
      type: 'OUT',
      name,
      quantity,
      price,
      date: new Date(),
      unit: this.getLatestUnit(shopId, name)
    });

    return true;
  }

  private getCurrentStockMap(shopId: number): Map<string, number> {
    const transactions = this.transactionsSubject.getValue();
    const stockMap = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.shopId !== shopId) {
        continue;
      }

      const key = tx.name.trim().toLowerCase();
      const current = stockMap.get(key) ?? 0;
      stockMap.set(key, tx.type === 'IN' ? current + tx.quantity : current - tx.quantity);
    }

    return stockMap;
  }

  private getLatestUnit(shopId: number, name: string): string | undefined {
    const key = name.trim().toLowerCase();
    const transactions = this.transactionsSubject.getValue();

    for (let i = transactions.length - 1; i >= 0; i--) {
      const tx = transactions[i];
      if (tx.shopId === shopId && tx.name.trim().toLowerCase() === key && tx.unit) {
        return tx.unit;
      }
    }

    return undefined;
  }

  private toStockItemId(name: string): number {
    let hash = 0;
    const normalized = name.trim().toLowerCase();

    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash);
  }

  getHistory(shopId: number): Observable<StockTransaction[]> {
    return this.transactions$.pipe(
      map((txs) =>
        txs
          .filter((tx) => tx.shopId === shopId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      )
    );
  }

  getRemainingStock(shopId: number): Observable<StockItem[]> {
    return this.getStockItems(shopId);
  }

  getMonthlySummary(shopId: number): Observable<{ cost: number; revenue: number; profit: number }> {
    return this.transactions$.pipe(
      map((txs) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let cost = 0;
        let revenue = 0;

        txs.forEach((tx) => {
          if (tx.shopId === shopId) {
            const txDate = new Date(tx.date);
            if (txDate >= startOfMonth && txDate <= now) {
              if (tx.type === 'IN') {
                cost += tx.totalCost ?? tx.cost ?? 0;
              } else if (tx.type === 'OUT') {
                revenue += tx.price ?? 0;
              }
            }
          }
        });

        return { cost, revenue, profit: revenue - cost };
      })
    );
  }

  clearAllStock(shopId: number): void {
    const transactions = this.transactionsSubject.getValue();
    const filteredTransactions = transactions.filter((tx) => tx.shopId !== shopId);
    this.saveTransactions(filteredTransactions);
  }
}
