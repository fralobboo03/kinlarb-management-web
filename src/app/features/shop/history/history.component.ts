import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { StockTransaction } from '../models/stock-transaction.model';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);

  shopId$ = new BehaviorSubject<number | null>(null);
  searchTerm$ = new BehaviorSubject<string>('');
  searchTerm = '';

  history$: Observable<StockTransaction[]>;
  filteredHistory$: Observable<StockTransaction[]>;
  displayedColumns: string[] = ['date', 'type', 'name', 'unit', 'quantity', 'cost'];

  constructor() {
    this.history$ = this.shopId$.pipe(
      switchMap((shopId) => (shopId ? this.stockService.getHistory(shopId).pipe(startWith([])) : of([]))),
      startWith([])
    );

    this.filteredHistory$ = combineLatest([this.history$, this.searchTerm$]).pipe(
      map(([data, term]) => {
        const query = term.trim().toLowerCase();
        if (!query) {
          return data;
        }

        return data.filter((item) => {
          const typeLabel = item.type === 'IN' ? 'รับเข้า' : 'เบิกออก';
          const unitLabel = (item.unit ?? '').toLowerCase();

          return (
            item.name.toLowerCase().includes(query) ||
            unitLabel.includes(query) ||
            typeLabel.includes(query) ||
            item.type.toLowerCase().includes(query)
          );
        });
      })
    );
  }

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      const id = Number(params.get('shopId'));
      this.shopId$.next(id);
    });
  }

  onSearchTermChange(term: string): void {
    this.searchTerm$.next(term ?? '');
  }
}
