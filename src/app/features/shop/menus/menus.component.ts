import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { Menu, MenuIngredient } from '../models/menu.model';
import { StockItem } from '../models/stock-item.model';
import { MenuService } from '../services/menu.service';
import { StockService } from '../services/stock.service';

@Component({
  selector: 'app-menus',
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
    MatTableModule
  ],
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.scss'
})
export class MenusComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly menuService = inject(MenuService);
  private readonly stockService = inject(StockService);

  shopId = 0;
  editingMenuId: number | null = null;

  readonly displayedColumns: string[] = ['name', 'price', 'ingredients', 'actions'];
  menus$: Observable<Menu[]> = of([]);
  stockItems$: Observable<StockItem[]> = of([]);

  readonly menuForm = this.fb.group({
    menuName: ['', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    ingredients: this.fb.array([this.createIngredientGroup()])
  });

  get ingredients(): FormArray {
    return this.menuForm.controls.ingredients;
  }

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
      this.menus$ = this.menuService.getMenusByShop(this.shopId);
      this.stockItems$ = this.stockService.getStockItems(this.shopId).pipe(map((items) => items ?? []));
    });
  }

  createIngredientGroup(stockItemId: number | null = null, name = '', quantity: number | null = null) {
    return this.fb.group({
      stockItemId: [stockItemId, [Validators.required]],
      name: [name, [Validators.required]],
      quantity: [quantity, [Validators.min(0.0001)]]
    });
  }

  addIngredient(): void {
    this.ingredients.push(this.createIngredientGroup());
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length <= 1) {
      return;
    }
    this.ingredients.removeAt(index);
  }

  onIngredientStockChange(index: number, stockItemId: number | null, stockItems: StockItem[]): void {
    const selected = stockItems.find((item) => item.id === Number(stockItemId));
    const group = this.ingredients.at(index);
    if (group) {
      group.patchValue({
        stockItemId: selected?.id ?? null,
        name: selected?.name ?? ''
      });
    }
  }

  saveMenu(): void {
    if (this.menuForm.invalid || this.shopId <= 0) {
      this.menuForm.markAllAsTouched();
      return;
    }

    const raw = this.menuForm.getRawValue();
    const name = (raw.menuName ?? '').trim();
    const price = Number(raw.price ?? 0);

    const ingredients: MenuIngredient[] = (raw.ingredients ?? [])
      .map((ingredient) => {
        const stockItemId = Number(ingredient?.stockItemId ?? 0);
        const ingredientName = (ingredient?.name ?? '').trim();
        const rawQuantity = ingredient?.quantity;
        const hasQuantity = rawQuantity != null;
        const quantity = hasQuantity ? Number(rawQuantity) : undefined;

        return {
          stockItemId,
          name: ingredientName,
          quantity
        };
      })
      .filter((ingredient) => ingredient.stockItemId > 0 && ingredient.name.length > 0);

    if (!name || price <= 0) {
      return;
    }

    const menuPayload: Omit<Menu, 'id'> = {
      shopId: this.shopId,
      name,
      price,
      ingredients
    };

    if (this.editingMenuId) {
      this.menuService.updateMenu(this.editingMenuId, menuPayload);
    } else {
      this.menuService.createMenu(menuPayload);
    }

    this.resetForm();
  }

  editMenu(menu: Menu): void {
    this.editingMenuId = menu.id ?? null;

    this.menuForm.patchValue({
      menuName: menu.name,
      price: menu.price
    });

    this.ingredients.clear();
    const safeIngredients = menu.ingredients ?? [];

    if (safeIngredients.length === 0) {
      this.ingredients.push(this.createIngredientGroup());
      return;
    }

    for (const ingredient of safeIngredients) {
      this.ingredients.push(
        this.createIngredientGroup(
          ingredient.stockItemId,
          ingredient.name,
          ingredient.quantity ?? null
        )
      );
    }
  }

  deleteMenu(menu: Menu): void {
    if (!menu.id) {
      return;
    }

    if (confirm(`ลบเมนู \"${menu.name}\" หรือไม่?`)) {
      this.menuService.deleteMenu(menu.id);
      if (this.editingMenuId === menu.id) {
        this.resetForm();
      }
    }
  }

  resetForm(): void {
    this.editingMenuId = null;
    this.menuForm.reset({
      menuName: '',
      price: 0
    });
    this.ingredients.clear();
    this.ingredients.push(this.createIngredientGroup());
  }

  formatIngredient(ingredient: MenuIngredient): string {
    if (ingredient.quantity == null) {
      return `${ingredient.name} (ไม่ตัดสต็อก)`;
    }

    return `${ingredient.name} x ${ingredient.quantity}`;
  }
}
