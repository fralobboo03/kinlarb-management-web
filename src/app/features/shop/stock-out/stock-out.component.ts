import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { Observable } from 'rxjs';
import { StockItem } from '../models/stock-item.model';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-stock-out',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatListModule],
  templateUrl: './stock-out.component.html',
  styleUrl: './stock-out.component.scss'
})
export class StockOutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);

  shopId!: number;
  itemName = '';
  quantity = 1;
  price: number | undefined;
  savedStatus = false;
  errorMessage = '';
  lastSavedName = '';

  currentStocks$!: Observable<StockItem[]>;

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
      this.currentStocks$ = this.stockService.getRemainingStock(this.shopId);
    });
  }

  saveStockOut(): void {
    this.errorMessage = '';

    if (this.itemName && this.quantity > 0) {
      const success = this.stockService.addStockOut(this.shopId, this.itemName, this.quantity, this.price);
      if (!success) {
        this.errorMessage = 'สต็อกไม่เพียงพอ หรือชื่อสินค้าไม่ถูกต้อง';
        return;
      }

      this.lastSavedName = this.itemName;

      this.itemName = '';
      this.quantity = 1;
      this.price = undefined;

      this.savedStatus = true;
      setTimeout(() => (this.savedStatus = false), 3000);
    }
  }

  resetForm(): void {
    this.itemName = '';
    this.quantity = 1;
    this.price = undefined;
    this.savedStatus = false;
    this.errorMessage = '';
  }

  clearAllStock(): void {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลสต็อกทั้งหมดของร้านนี้?')) {
      this.stockService.clearAllStock(this.shopId);
      this.savedStatus = false;
      alert('ลบข้อมูลสต็อกทั้งหมดเรียบร้อยแล้ว');
    }
  }
}
