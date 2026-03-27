import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { ShopService } from '../services/shop.service';
import { StockService } from '../services/stock.service';
import { Observable, combineLatest, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import { Shop } from '../models/shop.model';

interface MonthlySummary {
  cost: number;
  revenue: number;
  profit: number;
}

interface ShopWithSummary extends Shop {
  summary: MonthlySummary;
}

@Component({
  selector: 'app-shop-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatDividerModule,
    MatRippleModule
  ],
  templateUrl: './shop-list.component.html',
  styleUrl: './shop-list.component.scss'
})
export class ShopListComponent implements OnInit {
  private shopService = inject(ShopService);
  private stockService = inject(StockService);
  private router = inject(Router);
  private readonly emptySummary: MonthlySummary = { cost: 0, revenue: 0, profit: 0 };

  shopsWithSummary$: Observable<ShopWithSummary[]> = of([]);
  displayedColumns: string[] = ['name', 'status', 'revenue', 'actions'];

  ngOnInit(): void {
    this.shopsWithSummary$ = this.shopService.shops$.pipe(
      switchMap((shops: Shop[] | null) => {
        const safeShops: Shop[] = shops ?? [];

        if (safeShops.length === 0) {
          return of([] as ShopWithSummary[]);
        }

        return combineLatest(
          safeShops.map((shop) =>
            this.stockService.getMonthlySummary(shop.id).pipe(
              map((summary): ShopWithSummary => ({
                ...shop,
                summary: summary ?? this.emptySummary
              }))
            )
          )
        );
      }),
      startWith([] as ShopWithSummary[])
    );
  }

  enterShop(shopId: number) {
    this.router.navigate(['/shops', shopId]);
  }

  editShop(shop: Shop) {
    console.log('Edit shop:', shop);
  }

  deleteShop(shop: Shop) {
    if (confirm(`ลบร้าน "${shop.name}" หรือไม่?`)) {
      this.shopService.deleteShop(shop.id);
    }
  }

  addShop() {
    const shopName = prompt('ป้อนชื่อร้านใหม่:');
    if (shopName && shopName.trim()) {
      this.shopService.addShop(shopName.trim());
    }
  }
}
