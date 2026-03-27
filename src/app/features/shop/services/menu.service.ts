import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Menu } from '../models/menu.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly STORAGE_KEY = 'kinlarb_menus';
  private readonly menusSubject = new BehaviorSubject<Menu[]>([]);
  readonly menus$ = this.menusSubject.asObservable();
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.menusSubject.next(this.loadMenus());
    }
  }

  getMenusByShop(shopId: number): Observable<Menu[]> {
    return this.menus$.pipe(
      map((menus) => menus.filter((menu) => menu.shopId === shopId).sort((a, b) => a.name.localeCompare(b.name)))
    );
  }

  getMenuById(menuId: number): Menu | undefined {
    return this.menusSubject.getValue().find((menu) => menu.id === menuId);
  }

  createMenu(menu: Omit<Menu, 'id'>): Menu {
    const current = this.menusSubject.getValue();
    const newMenu: Menu = {
      ...menu,
      id: Date.now()
    };

    this.saveMenus([...current, newMenu]);
    return newMenu;
  }

  updateMenu(menuId: number, menu: Omit<Menu, 'id'>): boolean {
    const current = this.menusSubject.getValue();
    let updated = false;

    const nextMenus = current.map((item) => {
      if (item.id !== menuId) {
        return item;
      }

      updated = true;
      return {
        ...menu,
        id: menuId
      };
    });

    if (!updated) {
      return false;
    }

    this.saveMenus(nextMenus);
    return true;
  }

  deleteMenu(menuId: number): void {
    const current = this.menusSubject.getValue();
    this.saveMenus(current.filter((menu) => menu.id !== menuId));
  }

  private loadMenus(): Menu[] {
    if (!this.isBrowser) {
      return [];
    }

    const payload = localStorage.getItem(this.STORAGE_KEY);
    if (!payload) {
      return [];
    }

    try {
      const parsed = JSON.parse(payload) as Menu[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveMenus(menus: Menu[]): void {
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(menus));
    }
    this.menusSubject.next(menus);
  }
}
