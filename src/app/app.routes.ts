import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'shops', pathMatch: 'full' },
  {
    path: 'shops',
    loadComponent: () => import('./features/shop/shop-list/shop-list.component').then(m => m.ShopListComponent)
  },
  {
    path: 'shops/:shopId',
    loadComponent: () => import('./features/shop/shop-detail/shop-detail.component').then(m => m.ShopDetailComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/shop/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'stock-in',
        loadComponent: () => import('./features/shop/stock-in/stock-in.component').then(m => m.StockInComponent)
      },
      {
        path: 'stock-out',
        loadComponent: () => import('./features/shop/stock-out/stock-out.component').then(m => m.StockOutComponent)
      },
      {
        path: 'menus',
        loadComponent: () => import('./features/shop/menus/menus.component').then(m => m.MenusComponent)
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/shop/sales/sales.component').then(m => m.SalesComponent)
      },
      {
        path: 'recipe-cost',
        loadComponent: () => import('./features/shop/recipe-cost/recipe-cost.component').then(m => m.RecipeCostComponent)
      },
      {
        path: 'history',
        loadComponent: () => import('./features/shop/history/history.component').then(m => m.HistoryComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'shops' }
];
