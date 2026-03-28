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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Sale } from '../models/sale.model';
import { StockItem } from '../models/stock-item.model';
import { StockTransaction } from '../models/stock-transaction.model';

type TimeRange = 'daily' | 'weekly' | 'monthly';
type FilterMode = 'preset' | 'custom';

interface CustomDateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface ActiveDateFilter {
  label: string;
  startDate: Date;
  endDate: Date;
  isCustom: boolean;
}

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
  selectedPeriodLabel: string;
  selectedPeriodRevenue: number;
  selectedPeriodCost: number;
  selectedPeriodProfit: number;
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
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
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
  private readonly selectedRange$ = new BehaviorSubject<TimeRange | null>('monthly');
  private readonly filterMode$ = new BehaviorSubject<FilterMode>('preset');
  private readonly customDateRange$ = new BehaviorSubject<CustomDateRange>({
    startDate: null,
    endDate: null
  });
  private readonly defaultPresetRange: TimeRange = 'monthly';
  private lastPresetRange: TimeRange = this.defaultPresetRange;

  selectedRange: TimeRange | null = this.defaultPresetRange;
  filterMode: FilterMode = 'preset';
  startDate: Date | null = null;
  endDate: Date | null = null;
  dateRangeError = '';

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
    this.filterMode$,
    this.selectedRange$,
    this.customDateRange$
  ]).pipe(
    switchMap(([shopId, filterMode, selectedRange, customDateRange]) => {
      if (!shopId) {
        return of(this.createEmptyViewModel());
      }

      return combineLatest([
        this.stockService.getRemainingStock(shopId).pipe(startWith([])),
        this.stockService.getHistory(shopId).pipe(startWith([])),
        this.salesService.getSalesByShop(shopId).pipe(startWith([]))
      ]).pipe(
        map(([inventoryItems, transactions, sales]) =>
          this.buildDashboardViewModel(
            inventoryItems ?? [],
            transactions ?? [],
            sales ?? [],
            filterMode,
            selectedRange,
            customDateRange
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

  onFilterModeChange(mode: FilterMode): void {
    if (mode === this.filterMode) {
      return;
    }

    this.filterMode = mode;
    this.filterMode$.next(mode);
    this.dateRangeError = '';

    if (mode === 'custom') {
      this.selectedRange = null;
      this.selectedRange$.next(null);
      this.customDateRange$.next({ startDate: null, endDate: null });
      return;
    }

    this.startDate = null;
    this.endDate = null;
    this.customDateRange$.next({ startDate: null, endDate: null });
    this.selectedRange = this.lastPresetRange;
    this.selectedRange$.next(this.lastPresetRange);
  }

  onRangeChange(range: TimeRange): void {
    if (this.filterMode !== 'preset') {
      return;
    }

    this.lastPresetRange = range;
    this.selectedRange = range;
    this.dateRangeError = '';
    this.selectedRange$.next(range);
  }

  onCustomDateChange(): void {
    if (this.filterMode !== 'custom') {
      return;
    }

    if (!this.startDate || !this.endDate) {
      this.dateRangeError = '';
      this.customDateRange$.next({ startDate: null, endDate: null });
      return;
    }

    const normalizedStartDate = this.toStartOfDay(this.startDate);
    const normalizedEndDate = this.toEndOfDay(this.endDate);

    if (normalizedStartDate.getTime() > normalizedEndDate.getTime()) {
      this.dateRangeError = 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด';
      this.customDateRange$.next({ startDate: null, endDate: null });
      return;
    }

    this.dateRangeError = '';
    this.customDateRange$.next({
      startDate: normalizedStartDate,
      endDate: normalizedEndDate
    });
  }

  clearCustomDateRange(): void {
    if (this.filterMode !== 'custom') {
      return;
    }

    this.startDate = null;
    this.endDate = null;
    this.dateRangeError = '';
    this.customDateRange$.next({ startDate: null, endDate: null });
  }

  private buildDashboardViewModel(
    inventoryItems: StockItem[],
    transactions: StockTransaction[],
    sales: Sale[],
    filterMode: FilterMode,
    selectedRange: TimeRange | null,
    customDateRange: CustomDateRange
  ): DashboardViewModel {
    const safeInventoryItems = inventoryItems ?? [];
    const safeTransactions = transactions ?? [];
    const safeSales = sales ?? [];
    const activeFilter = this.getActiveDateFilter(filterMode, selectedRange, customDateRange);
    const filteredSales = this.filterSalesByDateRange(safeSales, activeFilter.startDate, activeFilter.endDate);
    const filteredTransactions = this.filterTransactionsByDateRange(safeTransactions, activeFilter.startDate, activeFilter.endDate);
    const periodBreakdown = this.groupSalesByPeriod(filteredSales, activeFilter.isCustom ? 'daily' : (selectedRange ?? this.defaultPresetRange));
    const menuBreakdown = this.groupSalesByMenu(filteredSales);
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    const totalOrders = filteredSales.reduce((sum, sale) => sum + sale.quantitySold, 0);
    const totalCost = filteredTransactions
      .filter((transaction) => transaction.type === 'IN')
      .reduce((sum, transaction) => sum + (transaction.totalCost ?? transaction.cost ?? 0), 0);
    const selectedPeriodProfit = totalRevenue - totalCost;

    return {
      totalRevenue,
      totalOrders,
      topMenu: menuBreakdown[0]?.menuName ?? '-',
      averagePerOrder: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      selectedPeriodLabel: activeFilter.label,
      selectedPeriodRevenue: totalRevenue,
      selectedPeriodCost: totalCost,
      selectedPeriodProfit,
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
      selectedPeriodLabel: this.getPresetLabel('monthly'),
      selectedPeriodRevenue: 0,
      selectedPeriodCost: 0,
      selectedPeriodProfit: 0,
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

  private getActiveDateFilter(filterMode: FilterMode, selectedRange: TimeRange | null, customDateRange: CustomDateRange): ActiveDateFilter {
    if (filterMode === 'custom' && customDateRange.startDate && customDateRange.endDate) {
      return {
        label: `${this.formatDate(customDateRange.startDate)} - ${this.formatDate(customDateRange.endDate)}`,
        startDate: this.toStartOfDay(customDateRange.startDate),
        endDate: this.toEndOfDay(customDateRange.endDate),
        isCustom: true
      };
    }

    const effectiveRange = selectedRange ?? this.lastPresetRange;
    const now = new Date();

    if (effectiveRange === 'daily') {
      return {
        label: 'วันนี้',
        startDate: this.toStartOfDay(now),
        endDate: this.toEndOfDay(now),
        isCustom: false
      };
    }

    if (effectiveRange === 'weekly') {
      const startOfWeek = this.getStartOfIsoWeek(now);
      return {
        label: 'สัปดาห์นี้',
        startDate: this.toStartOfDay(startOfWeek),
        endDate: this.toEndOfDay(now),
        isCustom: false
      };
    }

    return {
      label: this.getPresetLabel(effectiveRange),
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: this.toEndOfDay(now),
      isCustom: false
    };
  }

  private filterSalesByDateRange(sales: Sale[], startDate: Date, endDate: Date): Sale[] {
    return sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }

  private filterTransactionsByDateRange(transactions: StockTransaction[], startDate: Date, endDate: Date): StockTransaction[] {
    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }

  private getPresetLabel(selectedRange: TimeRange): string {
    if (selectedRange === 'daily') {
      return 'วันนี้';
    }

    if (selectedRange === 'weekly') {
      return 'สัปดาห์นี้';
    }

    return new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(new Date());
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  private toStartOfDay(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  private toEndOfDay(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);
    return normalizedDate;
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
