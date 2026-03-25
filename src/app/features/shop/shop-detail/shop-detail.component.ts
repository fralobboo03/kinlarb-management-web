import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, ActivatedRoute } from '@angular/router';

// Angular Material Components
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

import { ShopService } from '../services/shop.service';
import { Shop } from '../models/shop.model';
import { ThemeService, Theme } from '../../../core/services/theme.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './shop-detail.component.html',
  styleUrls: ['./shop-detail.component.scss']
})
export class ShopDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shopService = inject(ShopService);
  public themeService = inject(ThemeService);
  
  currentShop: Shop | undefined;
  isSidebarOpen = true; // Sidebar always visible initially
  currentTheme$!: Observable<Theme>;

  ngOnInit() {
    this.currentTheme$ = this.themeService.theme$;
    
    this.route.paramMap.subscribe(params => {
      const shopId = Number(params.get('shopId'));
      if (shopId) {
        this.currentShop = this.shopService.getShopById(shopId);
      }
    });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  changeTheme(theme: Theme) {
    this.themeService.setTheme(theme);
  }
}
