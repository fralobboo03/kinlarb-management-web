import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { StockTransaction } from '../models/stock-transaction.model';
import { BehaviorSubject, Observable, of, EMPTY } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  
  shopId$ = new BehaviorSubject<number | null>(null);
  history$: Observable<StockTransaction[]>;
  displayedColumns: string[] = ['date', 'type', 'name', 'quantity', 'cost'];

  constructor() {
    this.history$ = this.shopId$.pipe(
      switchMap(shopId => shopId ? this.stockService.getHistory(shopId).pipe(startWith([])) : of([])),
      startWith([])
    );
  }

  ngOnInit() {
    this.route.parent?.paramMap.subscribe(params => {
      const id = Number(params.get('shopId'));
      this.shopId$.next(id);
    });
  }
}
