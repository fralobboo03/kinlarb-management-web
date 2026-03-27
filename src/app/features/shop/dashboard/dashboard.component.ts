import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { SalesService } from '../services/sales.service';
import { Observable, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface DashboardMetrics {
  totalItems: number;
  totalStock: number;
  lowStockItems: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  private salesService = inject(SalesService);

  shopId!: number;
  remainingStock$: Observable<{ name: string; quantity: number }[]> = of([]);
  metrics$: Observable<DashboardMetrics> = of({
    totalItems: 0,
    totalStock: 0,
    lowStockItems: 0,
    totalCost: 0,
    totalRevenue: 0,
    totalProfit: 0
  });

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
      this.remainingStock$ = this.stockService.getRemainingStock(this.shopId);
      this.metrics$ = combineLatest([
        this.remainingStock$,
        this.stockService.getMonthlySummary(this.shopId),
        this.salesService.getSalesByShop(this.shopId)
      ]).pipe(
        map(([items, monthly, sales]) => {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthlyRevenue = (sales ?? [])
            .filter((sale) => {
              const saleDate = new Date(sale.date);
              return saleDate >= startOfMonth && saleDate <= now;
            })
            .reduce((sum, sale) => sum + sale.totalPrice, 0);

          return {
            totalItems: items.length,
            totalStock: items.reduce((sum, item) => sum + Math.max(item.quantity, 0), 0),
            lowStockItems: items.filter((item) => item.quantity > 0 && item.quantity < 5).length,
            totalCost: monthly.cost,
            totalRevenue: monthlyRevenue,
            totalProfit: monthlyRevenue - monthly.cost
          };
        })
      );
    });
  }
}
