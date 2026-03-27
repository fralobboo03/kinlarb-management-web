import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatRippleModule } from '@angular/material/core';
import { ShopService } from '../services/shop.service';
import { StockService } from '../services/stock.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Shop } from '../models/shop.model';

interface ShopWithSummary extends Shop {
  summary$: Observable<{ cost: number, revenue: number, profit: number }>;
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
    MatDividerModule,
    MatRippleModule
  ],
  templateUrl: './shop-list.component.html',
  styleUrl: './shop-list.component.scss'
})
export class ShopListComponent implements OnInit {
  private shopService = inject(ShopService);
  private stockService = inject(StockService);
  
  shopsWithSummary$!: Observable<ShopWithSummary[]>;

  ngOnInit() {
    this.shopsWithSummary$ = this.shopService.shops$.pipe(
      map(shops => shops.map(shop => ({
        ...shop,
        summary$: this.stockService.getMonthlySummary(shop.id)
      })))
    );
  }
}
