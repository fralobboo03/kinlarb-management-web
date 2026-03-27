import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StockService } from '../services/stock.service';

// Angular Material Components
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-stock-in',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './stock-in.component.html',
  styleUrl: './stock-in.component.scss'
})
export class StockInComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private stockService = inject(StockService);
  private fb = inject(FormBuilder);

  shopId!: number;
  savedStatus = false;
  lastSavedName = '';

  readonly unitOptions: string[] = ['กก.', 'ขีด.', 'มัด', 'ถุง', "ขวด"];

  readonly stockInForm = this.fb.group({
    itemName: ['', [Validators.required]],
    unit: [this.unitOptions[0], [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0.0001)]],
    pricePerUnit: [0, [Validators.required, Validators.min(0.0001)]],
    totalCost: [{ value: 0, disabled: true }]
  });

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
    });

    this.stockInForm.valueChanges.subscribe((value) => {
      const quantity = Number(value.quantity ?? 0);
      const pricePerUnit = Number(value.pricePerUnit ?? 0);
      const totalCost = quantity > 0 && pricePerUnit > 0 ? quantity * pricePerUnit : 0;

      this.stockInForm.controls.totalCost.setValue(totalCost, { emitEvent: false });
    });
  }

  saveStockIn(): void {
    if (this.stockInForm.invalid) {
      this.stockInForm.markAllAsTouched();
      return;
    }

    const rawValue = this.stockInForm.getRawValue();
    const itemName = (rawValue.itemName ?? '').trim();
    const unit = rawValue.unit ?? this.unitOptions[0];
    const quantity = Number(rawValue.quantity);
    const pricePerUnit = Number(rawValue.pricePerUnit);

    if (!itemName || quantity <= 0 || pricePerUnit <= 0) {
      return;
    }

    this.stockService.addStockIn(this.shopId, itemName, unit, quantity, pricePerUnit);
    this.lastSavedName = itemName;
    this.savedStatus = true;

    this.stockInForm.reset({
      itemName: '',
      unit: this.unitOptions[0],
      quantity: 1,
      pricePerUnit: 0,
      totalCost: 0
    });

    setTimeout(() => (this.savedStatus = false), 3000);
  }

  resetForm(): void {
    this.stockInForm.reset({
      itemName: '',
      unit: this.unitOptions[0],
      quantity: 1,
      pricePerUnit: 0,
      totalCost: 0
    });
    this.savedStatus = false;
  }
}
