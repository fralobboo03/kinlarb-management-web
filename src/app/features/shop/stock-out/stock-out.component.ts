import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-stock-out',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h3 class="mb-4">📤 เบิกของออก (Stock Out)</h3>
      <div class="row">
        <div class="col-md-6">
          <div class="form-group mb-3">
            <label class="form-label fw-bold">ชื่อสินค้าที่จะเบิก</label>
            <input type="text" class="form-control" [(ngModel)]="itemName" placeholder="คีย์ชื่อสินค้าให้ตรง เพื่อตัดสต๊อก">
          </div>
          <div class="form-group mb-4">
            <label class="form-label fw-bold">จำนวนที่จะเบิก</label>
            <input type="number" class="form-control" [(ngModel)]="quantity" min="1">
          </div>
          <div class="mb-4">
          <label class="form-label fw-bold">ยอดขายรวม (ใส่เพื่อคำนวณรายได้/กำไร)</label>
          <input type="number" class="form-control" [(ngModel)]="price" min="0" placeholder="เช่น 250">
        </div>
        <button class="btn btn-warning px-4" (click)="saveStockOut()" [disabled]="!itemName || quantity <= 0">
             ✂️ บันทึกการเบิกขาย
          </button>
          
          <div class="alert alert-success mt-4 shadow-sm" *ngIf="savedStatus">
            เบิกรายการ <strong>{{ lastSavedName }}</strong> ลงระบบแล้ว!
          </div>
        </div>
        
        <!-- รายการสินค้าไกด์ไลน์ (ช่วยให้จำได้ว่ามีสินค้าชื่ออะไรบ้าง) -->
        <div class="col-md-5 offset-md-1 d-none d-md-block">
          <div class="card bg-light">
            <div class="card-body">
              <h6 class="card-title text-muted">สินค้าในคลังปัจจุบัน</h6>
              <ul class="list-unstyled mb-0">
                <li *ngFor="let item of currentStocks$ | async" class="mb-1" style="cursor: pointer;" (click)="itemName = item.name">
                  <span class="badge bg-secondary me-2">{{ item.quantity }}</span> {{ item.name }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class StockOutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  
  shopId!: number;
  itemName = '';
  quantity = 1;
  price: number | undefined;
  savedStatus = false;
  lastSavedName = '';
  
  currentStocks$!: Observable<{name: string, quantity: number}[]>;

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      this.shopId = Number(params.get('shopId'));
      this.currentStocks$ = this.stockService.getRemainingStock(this.shopId);
    });
  }

  saveStockOut() {
    if (this.itemName && this.quantity > 0) {
      this.stockService.addStockOut(this.shopId, this.itemName, this.quantity, this.price);
      this.lastSavedName = this.itemName;
      
      this.itemName = '';
      this.quantity = 1;
      this.price = undefined;
      
      this.savedStatus = true;
      setTimeout(() => this.savedStatus = false, 3000);
    }
  }
}
