import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StockTransaction } from '../models/stock-transaction.model';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private readonly STORAGE_KEY = 'kinlarb_stocks';
  private transactionsSubject = new BehaviorSubject<StockTransaction[]>([]);
  transactions$ = this.transactionsSubject.asObservable();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
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

  addStockIn(shopId: number, name: string, quantity: number, cost?: number): void {
    this.addTransaction({
      shopId, type: 'IN', name, quantity, cost, date: new Date()
    });
  }

  addStockOut(shopId: number, name: string, quantity: number, price?: number): void {
    this.addTransaction({
      shopId, type: 'OUT', name, quantity, price, date: new Date()
    });
  }

  private addTransaction(tx: StockTransaction): void {
    const transactions = this.transactionsSubject.getValue();
    tx.id = new Date().getTime(); // simple ID
    transactions.push(tx);
    this.saveTransactions(transactions);
  }

  getHistory(shopId: number): Observable<StockTransaction[]> {
    return this.transactions$.pipe(
      map(txs => txs
        .filter(tx => tx.shopId === shopId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      )
    );
  }

  getRemainingStock(shopId: number): Observable<{ name: string, quantity: number }[]> {
    return this.transactions$.pipe(
      map(txs => {
        const shopTxs = txs.filter(tx => tx.shopId === shopId);
        const stockMap = new Map<string, number>();

        shopTxs.forEach(tx => {
          const current = stockMap.get(tx.name) || 0;
          if (tx.type === 'IN') {
            stockMap.set(tx.name, current + tx.quantity);
          } else {
            stockMap.set(tx.name, current - tx.quantity);
          }
        });

        return Array.from(stockMap.entries()).map(([name, quantity]) => ({ name, quantity }));
      })
    );
  }

  getMonthlySummary(shopId: number): Observable<{ cost: number, revenue: number, profit: number }> {
    return this.transactions$.pipe(
      map(txs => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let cost = 0;
        let revenue = 0;

        txs.forEach(tx => {
          if (tx.shopId === shopId) {
            const txDate = new Date(tx.date);
            if (txDate >= startOfMonth && txDate <= now) {
              if (tx.type === 'IN' && tx.cost) {
                cost += tx.cost;
              } else if (tx.type === 'OUT' && tx.price) {
                revenue += tx.price;
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
    const filteredTransactions = transactions.filter(tx => tx.shopId !== shopId);
    this.saveTransactions(filteredTransactions);
  }
}
