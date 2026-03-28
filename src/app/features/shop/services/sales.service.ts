import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Order, OrderItem } from '../models/order.model';
import { Recipe } from '../models/recipe.model';

interface SaleResult {
  success: boolean;
  error?: string;
}

interface StoredOrder extends Order {
  shopId: number;
}

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private readonly STORAGE_KEY = 'kinlarb_orders';
  private readonly ordersSubject = new BehaviorSubject<StoredOrder[]>([]);
  readonly orders$ = this.ordersSubject.asObservable();
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.ordersSubject.next(this.loadOrders());
    }
  }

  getOrdersByShop(shopId: number): Observable<Order[]> {
    return this.orders$.pipe(
      map((orders) =>
        orders
          .filter((order) => order.shopId === shopId)
          .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
          .map(({ shopId: _, ...order }) => order)
      )
    );
  }

  // Backward-compatible alias for existing consumers.
  getSalesByShop(shopId: number): Observable<Order[]> {
    return this.getOrdersByShop(shopId);
  }

  recordOrder(shopId: number, order: Omit<Order, 'id'>, recipes: Recipe[]): SaleResult {
    const validItems = (order.items ?? []).filter(
      (item) => item.recipeId > 0 && item.quantity > 0 && item.pricePerUnit > 0
    );

    if (validItems.length === 0) {
      return { success: false, error: 'กรุณาเพิ่มรายการขายอย่างน้อย 1 รายการ' };
    }

    const normalizedRecipeMap = new Map<number, Recipe>();
    for (const recipe of recipes) {
      if (recipe.id) {
        normalizedRecipeMap.set(recipe.id, recipe);
      }
    }

    for (const item of validItems) {
      const recipe = normalizedRecipeMap.get(item.recipeId);
      if (!recipe) {
        return { success: false, error: `ไม่พบสูตรที่เลือก: ${item.recipeName}` };
      }
    }

    const sanitizedItems: OrderItem[] = validItems.map((item) => ({
      recipeId: item.recipeId,
      recipeName: item.recipeName,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      totalPrice: item.totalPrice
    }));

    const totalAmount = sanitizedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const nextOrder: StoredOrder = {
      ...order,
      id: Date.now(),
      shopId,
      items: sanitizedItems,
      totalAmount
    };

    const current = this.ordersSubject.getValue();
    this.saveOrders([...current, nextOrder]);

    return { success: true };
  }

  private loadOrders(): StoredOrder[] {
    if (!this.isBrowser) {
      return [];
    }

    const payload = localStorage.getItem(this.STORAGE_KEY);
    if (!payload) {
      return [];
    }

    try {
      const parsed = JSON.parse(payload) as StoredOrder[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveOrders(orders: StoredOrder[]): void {
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(orders));
    }
    this.ordersSubject.next(orders);
  }
}
