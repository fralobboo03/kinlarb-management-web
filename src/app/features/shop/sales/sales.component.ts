import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { Order } from '../models/order.model';
import { Recipe } from '../models/recipe.model';
import { RecipeService } from '../services/recipe.service';
import { SalesService } from '../services/sales.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss'
})
export class SalesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly recipeService = inject(RecipeService);
  private readonly salesService = inject(SalesService);

  shopId = 0;
  recipes$: Observable<Recipe[]> = of([]);
  orders$: Observable<Order[]> = of([]);
  displayedColumns: string[] = ['orderDate', 'itemCount', 'quantity', 'totalAmount', 'items'];

  private currentRecipes: Recipe[] = [];

  saveError = '';
  saveSuccess = false;
  orderTotal = 0;

  readonly salesForm = this.fb.group({
    orderDate: [new Date(), [Validators.required]],
    items: this.fb.array([this.createOrderItemGroup()])
  });

  get items(): FormArray<FormGroup> {
    return this.salesForm.controls.items as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
      this.recipes$ = this.recipeService.getRecipesByShop(this.shopId);
      this.orders$ = this.salesService.getOrdersByShop(this.shopId);

      this.recipes$.subscribe((recipes) => {
        this.currentRecipes = recipes ?? [];
        this.syncSelectedRecipes();
      });
    });

    this.salesForm.valueChanges.subscribe(() => {
      this.recalculateOrderTotal();
    });
  }

  createOrderItemGroup(): FormGroup {
    const group = this.fb.group({
      recipeId: [null as number | null, [Validators.required]],
      recipeName: [{ value: '', disabled: true }],
      quantity: [1, [Validators.required, Validators.min(1)]],
      pricePerUnit: [{ value: 0, disabled: true }],
      totalPrice: [{ value: 0, disabled: true }]
    });

    group.controls.recipeId.valueChanges.subscribe((recipeId) => {
      this.applyRecipeToItem(group, Number(recipeId));
    });

    group.controls.quantity.valueChanges.subscribe(() => {
      this.recalculateItemTotal(group);
    });

    return group;
  }

  addItem(): void {
    this.items.push(this.createOrderItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) {
      return;
    }

    this.items.removeAt(index);
    this.recalculateOrderTotal();
  }

  private applyRecipeToItem(group: FormGroup, recipeId: number): void {
    const recipe = this.currentRecipes.find((item) => item.id === recipeId);
    const pricePerUnit = recipe?.suggestedPrice ?? 0;

    group.controls['recipeName'].setValue(recipe?.name ?? '', { emitEvent: false });
    group.controls['pricePerUnit'].setValue(pricePerUnit, { emitEvent: false });
    this.recalculateItemTotal(group);
  }

  private recalculateItemTotal(group: FormGroup): void {
    const quantity = Number(group.controls['quantity'].value ?? 0);
    const pricePerUnit = Number(group.controls['pricePerUnit'].value ?? 0);
    const totalPrice = quantity > 0 && pricePerUnit > 0 ? quantity * pricePerUnit : 0;
    group.controls['totalPrice'].setValue(totalPrice, { emitEvent: false });
    this.recalculateOrderTotal();
  }

  private recalculateOrderTotal(): void {
    this.orderTotal = this.items.controls.reduce((sum, group) => {
      const itemTotal = Number(group.controls['totalPrice'].value ?? 0);
      return sum + itemTotal;
    }, 0);
  }

  private syncSelectedRecipes(): void {
    this.items.controls.forEach((group) => {
      const recipeId = Number(group.controls['recipeId'].value ?? 0);
      if (recipeId > 0) {
        this.applyRecipeToItem(group, recipeId);
      }
    });
  }

  getItemsSummary(order: Order): string {
    return order.items
      .map((item) => `${item.recipeName} x ${item.quantity}`)
      .join(', ');
  }

  getTotalQuantity(order: Order): number {
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  saveSale(): void {
    this.saveError = '';
    this.saveSuccess = false;

    if (this.salesForm.invalid || this.shopId <= 0) {
      this.salesForm.markAllAsTouched();
      return;
    }

    const raw = this.salesForm.getRawValue();
    const orderDate = raw.orderDate instanceof Date ? raw.orderDate : new Date(raw.orderDate ?? new Date());

    const items = (raw.items ?? [])
      .map((item) => ({
        recipeId: Number(item?.['recipeId'] ?? 0),
        recipeName: String(item?.['recipeName'] ?? '').trim(),
        quantity: Number(item?.['quantity'] ?? 0),
        pricePerUnit: Number(item?.['pricePerUnit'] ?? 0),
        totalPrice: Number(item?.['totalPrice'] ?? 0)
      }))
      .filter((item) => item.recipeId > 0 && item.quantity > 0 && item.pricePerUnit > 0);

    if (items.length === 0) {
      this.saveError = 'กรุณาเลือกสูตรและจำนวนอย่างน้อย 1 รายการ';
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const result = this.salesService.recordOrder(
      this.shopId,
      {
        orderDate: orderDate.toISOString(),
        totalAmount,
        items
      },
      this.currentRecipes
    );

    if (!result.success) {
      this.saveError = result.error ?? 'ไม่สามารถบันทึกรายการขายได้';
      return;
    }

    this.saveSuccess = true;

    this.salesForm.reset({
      orderDate: new Date()
    });

    this.items.clear();
    this.items.push(this.createOrderItemGroup());
    this.orderTotal = 0;

    setTimeout(() => {
      this.saveSuccess = false;
    }, 3000);
  }
}
