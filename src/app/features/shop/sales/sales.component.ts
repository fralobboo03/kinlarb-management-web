import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

import { Menu } from '../models/menu.model';
import { Sale } from '../models/sale.model';
import { MenuService } from '../services/menu.service';
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
  private readonly menuService = inject(MenuService);
  private readonly salesService = inject(SalesService);

  shopId = 0;
  menus$: Observable<Menu[]> = of([]);
  sales$: Observable<Sale[]> = of([]);
  displayedColumns: string[] = ['date', 'menuName', 'quantitySold', 'pricePerUnit', 'totalPrice'];

  private currentMenus: Menu[] = [];

  saveError = '';
  saveSuccess = false;

  readonly salesForm = this.fb.group({
    date: [new Date(), [Validators.required]],
    menuId: [null as number | null, [Validators.required]],
    quantitySold: [1, [Validators.required, Validators.min(1)]],
    pricePerUnit: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0.01)]],
    totalPrice: [{ value: 0, disabled: true }]
  });

  ngOnInit(): void {
    this.route.parent?.paramMap.subscribe((params) => {
      this.shopId = Number(params.get('shopId'));
      this.menus$ = this.menuService.getMenusByShop(this.shopId);
      this.sales$ = this.salesService.getSalesByShop(this.shopId);
      this.menus$.subscribe((menus) => {
        this.currentMenus = menus ?? [];
      });
    });

    this.salesForm.controls.menuId.valueChanges.subscribe((menuId) => {
      const selected = this.currentMenus.find((menu) => menu.id === Number(menuId));
      const unitPrice = selected?.price ?? 0;
      this.salesForm.controls.pricePerUnit.setValue(unitPrice, { emitEvent: false });
      this.updateTotalPrice();
    });

    this.salesForm.controls.quantitySold.valueChanges.subscribe(() => {
      this.updateTotalPrice();
    });
  }

  private updateTotalPrice(): void {
    const quantitySold = Number(this.salesForm.controls.quantitySold.value ?? 0);
    const pricePerUnit = Number(this.salesForm.controls.pricePerUnit.value ?? 0);
    const totalPrice = quantitySold > 0 && pricePerUnit > 0 ? quantitySold * pricePerUnit : 0;
    this.salesForm.controls.totalPrice.setValue(totalPrice, { emitEvent: false });
  }

  saveSale(): void {
    this.saveError = '';
    this.saveSuccess = false;

    if (this.salesForm.invalid || this.shopId <= 0) {
      this.salesForm.markAllAsTouched();
      return;
    }

    const raw = this.salesForm.getRawValue();
    const menuId = Number(raw.menuId ?? 0);
    const selectedMenu = this.currentMenus.find((menu) => menu.id === menuId);

    if (!selectedMenu) {
      this.saveError = 'ไม่พบข้อมูลเมนูที่เลือก';
      return;
    }

    const saleDate = raw.date instanceof Date ? raw.date : new Date(raw.date ?? new Date());
    const quantitySold = Number(raw.quantitySold ?? 0);
    const pricePerUnit = Number(raw.pricePerUnit ?? 0);
    const totalPrice = quantitySold * pricePerUnit;

    const result = this.salesService.recordSale(
      this.shopId,
      {
        date: saleDate.toISOString(),
        menuId,
        menuName: selectedMenu.name,
        quantitySold,
        pricePerUnit,
        totalPrice
      },
      selectedMenu
    );

    if (!result.success) {
      this.saveError = result.error ?? 'ไม่สามารถบันทึกรายการขายได้';
      return;
    }

    this.saveSuccess = true;

    this.salesForm.reset({
      date: new Date(),
      menuId: null,
      quantitySold: 1,
      pricePerUnit: 0,
      totalPrice: 0
    });

    setTimeout(() => {
      this.saveSuccess = false;
    }, 3000);
  }
}
