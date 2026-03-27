import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stock-in',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './stock-in.component.html',
  styleUrl: './stock-in.component.scss'
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

  resetForm() {
    this.itemName = '';
    this.quantity = 1;
    this.cost = undefined;
    this.savedStatus = false;
  }
}
