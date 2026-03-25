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
  template: `
    <div>
      <h3 class="mb-4">🕒 ประวัติการทำรายการ (Transaction History)</h3>
      <div class="card shadow-sm border-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th class="py-3 px-4">วันที่ - เวลา</th>
                <th class="py-3">ประเภท</th>
                <th class="py-3">สินค้า</th>
                <th class="py-3">จำนวน</th>
                <th class="py-3">ต้นทุน</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of history$ | async">
                <td class="px-4">{{ tx.date | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                <td>
                  <span class="badge rounded-pill" [ngClass]="tx.type === 'IN' ? 'bg-success' : 'bg-warning text-dark'">
                    {{ tx.type === 'IN' ? 'รับเข้า' : 'เบิกออก' }}
                  </span>
                </td>
                <td class="fw-bold">{{ tx.name }}</td>
                <td>{{ tx.quantity }}</td>
                <td>{{ tx.cost ? (tx.cost | number:'1.2-2') : '-' }}</td>
              </tr>
              <tr *ngIf="(history$ | async)?.length === 0">
                <td colspan="5" class="text-center py-5 text-muted">
                  ยังไม่มีประวัติการทำรายการ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
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
