import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { StockTransaction } from '../models/stock-transaction.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  
  shopId!: number;
  history$!: Observable<StockTransaction[]>;

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      this.shopId = Number(params.get('shopId'));
      this.history$ = this.stockService.getHistory(this.shopId);
    });
  }
}
