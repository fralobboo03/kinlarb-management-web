import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { StockService } from '../services/stock.service';
import { SalesService } from '../services/sales.service';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Sale } from '../models/sale.model';
import { StockItem } from '../models/stock-item.model';

type TimeRange = 'daily' | 'weekly' | 'monthly';

interface PeriodSummary {
  label: string;
  revenue: number;
  quantitySold: number;
  sortValue: number;
}

interface MenuSummary {
  menuName: string;
  revenue: number;
  quantitySold: number;
  orderCount: number;
}

interface DashboardViewModel {
  totalRevenue: number;
  totalOrders: number;
  topMenu: string;
  averagePerOrder: number;
  totalItems: number;
  lowStockItems: number;
  totalStock: number;
  totalCost: number;
  periodBreakdown: PeriodSummary[];
  menuBreakdown: MenuSummary[];
  inventoryItems: StockItem[];
  lineChartData: ChartData<'line'>;
  barChartData: ChartData<'bar'>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonToggleModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  private salesService = inject(SalesService);
  private document = inject(DOCUMENT);

  private readonly shopId$ = new BehaviorSubject<number | null>(null);
  private readonly selectedRange$ = new BehaviorSubject<TimeRange>('monthly');

  selectedRange: TimeRange = 'monthly';

  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  readonly barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  dashboardVm$: Observable<DashboardViewModel> = combineLatest([
    this.shopId$,
    this.selectedRange$
  ]).pipe(
    switchMap(([shopId, selectedRange]) => {
      if (!shopId) {
        return of(this.createEmptyViewModel());
      }

      return combineLatest([
        this.stockService.getRemainingStock(shopId).pipe(startWith([])),
        this.stockService.getMonthlySummary(shopId).pipe(startWith({ cost: 0, revenue: 0, profit: 0 })),
        this.salesService.getSalesByShop(shopId).pipe(startWith([]))
      ]).pipe(
        map(([inventoryItems, monthlySummary, sales]) =>
          this.buildDashboardViewModel(
            inventoryItems ?? [],
            sales ?? [],
            selectedRange,
            monthlySummary.cost
          )
        )
      );
    }),
    startWith(this.createEmptyViewModel())
  );

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId$.next(Number(params.get('shopId')));
    });
  }

  onRangeChange(range: TimeRange): void {
    this.selectedRange = range;
    this.selectedRange$.next(range);
  }

  private buildDashboardViewModel(
    inventoryItems: StockItem[],
    sales: Sale[],
    selectedRange: TimeRange,
    totalCost: number
  ): DashboardViewModel {
    const safeInventoryItems = inventoryItems ?? [];
    const safeSales = sales ?? [];
    const periodBreakdown = this.groupSalesByPeriod(safeSales, selectedRange);
    const menuBreakdown = this.groupSalesByMenu(safeSales);
    const totalRevenue = safeSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalOrders = safeSales.length;

    return {
      totalRevenue,
      totalOrders,
      topMenu: menuBreakdown[0]?.menuName ?? '-',
      averagePerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalItems: safeInventoryItems.length,
      lowStockItems: safeInventoryItems.filter((item) => item.quantity > 0 && item.quantity < 5).length,
      totalStock: safeInventoryItems.reduce((sum, item) => sum + Math.max(item.quantity, 0), 0),
      totalCost,
      periodBreakdown,
      menuBreakdown,
      inventoryItems: safeInventoryItems,
      lineChartData: this.createLineChartData(periodBreakdown),
      barChartData: this.createBarChartData(menuBreakdown)
    };
  }

  private groupSalesByPeriod(sales: Sale[], selectedRange: TimeRange): PeriodSummary[] {
    const groups = new Map<string, PeriodSummary>();

    for (const sale of sales) {
      const saleDate = new Date(sale.date);
      const period = this.getPeriodMeta(saleDate, selectedRange);
      const current = groups.get(period.key) ?? {
        label: period.label,
        revenue: 0,
        quantitySold: 0,
        sortValue: period.sortValue
      };

      current.revenue += sale.totalPrice;
      current.quantitySold += sale.quantitySold;
      groups.set(period.key, current);
    }

    return Array.from(groups.values()).sort((a, b) => a.sortValue - b.sortValue);
  }

  private groupSalesByMenu(sales: Sale[]): MenuSummary[] {
    const groups = new Map<string, MenuSummary>();

    for (const sale of sales) {
      const key = sale.menuName.trim();
      const current = groups.get(key) ?? {
        menuName: sale.menuName,
        revenue: 0,
        quantitySold: 0,
        orderCount: 0
      };

      current.revenue += sale.totalPrice;
      current.quantitySold += sale.quantitySold;
      current.orderCount += 1;
      groups.set(key, current);
    }

    return Array.from(groups.values()).sort((a, b) => {
      if (b.quantitySold !== a.quantitySold) {
        return b.quantitySold - a.quantitySold;
      }

      return b.revenue - a.revenue;
    });
  }

  private getPeriodMeta(date: Date, selectedRange: TimeRange): { key: string; label: string; sortValue: number } {
    const safeDate = new Date(date);
    safeDate.setHours(0, 0, 0, 0);

    if (selectedRange === 'daily') {
      return {
        key: safeDate.toISOString(),
        label: new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(safeDate),
        sortValue: safeDate.getTime()
      };
    }

    if (selectedRange === 'weekly') {
      const startOfWeek = this.getStartOfIsoWeek(safeDate);
      const weekNumber = this.getIsoWeekNumber(safeDate);

      return {
        key: `${startOfWeek.getFullYear()}-W${weekNumber}`,
        label: `W${weekNumber} ${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(startOfWeek)}`,
        sortValue: startOfWeek.getTime()
      };
    }

    const startOfMonth = new Date(safeDate.getFullYear(), safeDate.getMonth(), 1);
    return {
      key: `${startOfMonth.getFullYear()}-${startOfMonth.getMonth()}`,
      label: new Intl.DateTimeFormat('th-TH', { month: 'short', year: 'numeric' }).format(startOfMonth),
      sortValue: startOfMonth.getTime()
    };
  }

  private getStartOfIsoWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay() === 0 ? 7 : start.getDay();
    start.setDate(start.getDate() - day + 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getIsoWeekNumber(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const diff = target.getTime() - firstThursday.getTime();
    return 1 + Math.round(diff / 604800000);
  }

  private createLineChartData(periodBreakdown: PeriodSummary[]): ChartData<'line'> {
    const primaryColor = this.getCssColor('--primary-color', '#8b1e14');
    const accentFill = this.withOpacity(primaryColor, 0.16);

    return {
      labels: periodBreakdown.map((period) => period.label),
      datasets: [
        {
          label: 'Revenue',
          data: periodBreakdown.map((period) => period.revenue),
          borderColor: primaryColor,
          backgroundColor: accentFill,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };
  }

  private createBarChartData(menuBreakdown: MenuSummary[]): ChartData<'bar'> {
    const topMenus = menuBreakdown.slice(0, 5);
    const accentColor = this.getCssColor('--accent-color', '#f39c12');

    return {
      labels: topMenus.map((menu) => menu.menuName),
      datasets: [
        {
          label: 'Quantity Sold',
          data: topMenus.map((menu) => menu.quantitySold),
          backgroundColor: this.withOpacity(accentColor, 0.8),
          borderColor: accentColor,
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 42
        }
      ]
    };
  }

  private createEmptyViewModel(): DashboardViewModel {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      topMenu: '-',
      averagePerOrder: 0,
      totalItems: 0,
      lowStockItems: 0,
      totalStock: 0,
      totalCost: 0,
      periodBreakdown: [],
      menuBreakdown: [],
      inventoryItems: [],
      lineChartData: this.createLineChartData([]),
      barChartData: this.createBarChartData([])
    };
  }

  private getCssColor(variableName: string, fallback: string): string {
    const body = this.document?.body;
    if (!body || typeof getComputedStyle !== 'function') {
      return fallback;
    }

    const value = getComputedStyle(body).getPropertyValue(variableName).trim();
    return value || fallback;
  }

  private withOpacity(color: string, opacity: number): string {
    const normalized = color.trim();
    if (normalized.startsWith('#')) {
      const hex = normalized.slice(1);
      const fullHex = hex.length === 3 ? hex.split('').map((char) => char + char).join('') : hex;
      const red = parseInt(fullHex.slice(0, 2), 16);
      const green = parseInt(fullHex.slice(2, 4), 16);
      const blue = parseInt(fullHex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
    }

    return normalized;
  }
}
