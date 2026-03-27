import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  
  shopId!: number;
  remainingStock$!: Observable<{name: string, quantity: number}[]>;

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      this.shopId = Number(params.get('shopId'));
      this.remainingStock$ = this.stockService.getRemainingStock(this.shopId);
    });
  }
}
