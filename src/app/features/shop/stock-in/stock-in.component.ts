import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';

@Component({
  selector: 'app-stock-in',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h3 class="mb-4">📥 รับของเข้าร้าน (Stock In)</h3>
      <div class="row">
        <div class="col-md-6">
          <div class="form-group mb-3">
            <label class="form-label fw-bold">ชื่อสินค้า</label>
            <input type="text" class="form-control" [(ngModel)]="itemName" placeholder="เช่น เนื้อหมู, ข้าวคั่ว, น้ำเปล่า">
          </div>
          <div class="form-group mb-3">
            <label class="form-label fw-bold">จำนวน</label>
            <input type="number" class="form-control" [(ngModel)]="quantity" min="1">
          </div>
          <div class="form-group mb-4">
            <label class="form-label fw-bold">ต้นทุนรวม (ถ้ามี)</label>
            <input type="number" class="form-control" [(ngModel)]="cost" min="0">
          </div>
          <button class="btn btn-success px-4" (click)="saveStockIn()" [disabled]="!itemName || quantity <= 0">
            ✅ บันทึกรับเข้า
          </button>
          
          <div class="alert alert-success mt-4 shadow-sm" *ngIf="savedStatus">
            บันทึกรายการ <strong>{{ lastSavedName }}</strong> สำเร็จ!
          </div>
        </div>
      </div>
    </div>
  `
})
export class StockInComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  
  shopId!: number;
  itemName = '';
  quantity = 1;
  cost: number | undefined;
  
  savedStatus = false;
  lastSavedName = '';

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      this.shopId = Number(params.get('shopId'));
    });
  }

  saveStockIn() {
    if (this.itemName && this.quantity > 0) {
      this.stockService.addStockIn(this.shopId, this.itemName, this.quantity, this.cost);
      this.lastSavedName = this.itemName;
      
      this.itemName = '';
      this.quantity = 1;
      this.cost = undefined;
      
      this.savedStatus = true;
      setTimeout(() => this.savedStatus = false, 3000);
    }
  }
}
