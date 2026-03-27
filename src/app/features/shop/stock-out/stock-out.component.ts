import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { Observable } from 'rxjs';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';

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
  private dialog = inject(MatDialog);

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

  resetForm() {
    this.itemName = '';
    this.quantity = 1;
    this.price = undefined;
    this.savedStatus = false;
  }

  clearAllStock() {
    if (confirm('⚠️ คุณแน่ใจหรือว่าต้องการลบสินค้าทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      this.stockService.clearAllStock(this.shopId);
      this.savedStatus = false;
      alert('✓ ลบข้อมูลสินค้าทั้งหมดสำเร็จ!');
    }
  }
}
