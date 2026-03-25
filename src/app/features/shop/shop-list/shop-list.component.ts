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
  template: `
    <div class="shop-list-container">
      <div class="header-section text-center py-5">
        <h1 class="display-5 fw-bold" style="color: var(--primary-color);">🏢 เลือกร้านค้าของคุณ</h1>
        <p class="text-muted fs-5">ระบบจัดการร้านอาหารอัจฉริยะ (Multi-Shop Management)</p>
      </div>
      
      <div class="container pb-5">
        <div class="row justify-content-center g-4">
          <div class="col-12 col-md-6 col-lg-5" *ngFor="let shop of shopsWithSummary$ | async">
            <!-- Shop Card -->
            <mat-card class="shop-card h-100 shadow-sm" [routerLink]="['/shops', shop.id]" matRipple>
              <div class="card-status-strip"></div>
              
              <mat-card-header class="pt-4 pb-2 px-4">
                <div mat-card-avatar class="shop-avatar d-flex justify-content-center align-items-center">
                  <mat-icon>storefront</mat-icon>
                </div>
                <mat-card-title class="fs-4 fw-bold mb-1" style="color: var(--card-text);">{{ shop.name }}</mat-card-title>
                <mat-card-subtitle>สถานะ: <span class="text-success fw-bold">เปิดทำการ</span></mat-card-subtitle>
              </mat-card-header>

              <mat-card-content class="px-4">
                <mat-divider class="my-3"></mat-divider>
                
                <h6 class="text-muted mb-3 mt-2">
                  <mat-icon inline style="vertical-align: middle;" class="me-1">date_range</mat-icon>
                  สรุปผลประกอบการ (ช่วงเดือนนี้)
                </h6>
                
                <!-- Summary Section -->
                <div *ngIf="shop.summary$ | async as summary; else loading" class="summary-grid">
                  <div class="summary-item cost">
                    <span class="label">🔴 ทุนรวมที่ลงไป</span>
                    <span class="value">{{ summary.cost | number:'1.2-2' }} ฿</span>
                  </div>
                  <div class="summary-item profit mt-3">
                    <span class="label">⭐ กำไร/ขาดทุน</span>
                    <span class="value" [ngClass]=" summary.profit >= 0 ? 'text-success' : 'text-danger' ">
                      {{ summary.profit > 0 ? '+' : '' }}{{ summary.profit | number:'1.2-2' }} ฿
                    </span>
                  </div>
                </div>
                <ng-template #loading>
                  <div class="text-center text-muted py-3">กำลังเริ่มคำนวณข้อมูล...</div>
                </ng-template>
              </mat-card-content>

              <mat-card-actions class="px-4 pb-4 pt-0 d-flex justify-content-end">
                <button mat-flat-button color="primary" class="enter-btn px-4 py-2">
                  เข้าสู่ระบบร้าน <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shop-list-container {
      background-color: var(--main-bg, #f4f6f8);
      min-height: 100vh;
      width: 100%;
    }
    
    .shop-card {
      border-radius: 16px !important;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease;
      position: relative;
      border: 1px solid var(--border-color, #eaeaea) !important;
      background-color: var(--card-bg, #ffffff) !important;
      
      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important;
        
        .enter-btn {
          background-color: var(--accent-color, #F39C12) !important;
        }
      }
      
      .card-status-strip {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: linear-gradient(90deg, var(--primary-color, #8B1E14), var(--accent-color, #F39C12));
      }

      .shop-avatar {
        background-color: rgba(243, 156, 18, 0.1);
        color: var(--accent-color, #F39C12);
        width: 50px;
        height: 50px;
        border-radius: 12px;
        margin-right: 16px;
        
        mat-icon {
          font-size: 28px;
          height: 28px;
          width: 28px;
        }
      }
      
      .summary-grid {
        background-color: rgba(0,0,0,0.03);
        border-radius: 12px;
        padding: 16px;
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .label {
            font-size: 0.95rem;
            color: var(--card-text, #555);
            opacity: 0.8;
          }
          .value {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--card-text, #333);
          }
        }
      }
      
      .enter-btn {
        background-color: var(--primary-color, #8B1E14) !important;
        border-radius: 8px !important;
        transition: background-color 0.3s ease;
        color: #fff !important;
      }
    }
    
    ::ng-deep body.dark-theme .shop-card .summary-grid {
      background-color: rgba(255,255,255,0.05);
    }
  `]
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
