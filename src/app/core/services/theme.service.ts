import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'kinlarb-theme' | 'dark-theme' | 'light-theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'kinlarb_theme';
  private themeSubject = new BehaviorSubject<Theme>('kinlarb-theme');
  theme$ = this.themeSubject.asObservable();
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // โหลด Theme จาก LocalStorage ถ้ามี, ถ้าไม่มีใช้ค่าเริ่มต้นเป็น kinlarb-theme
    if (this.isBrowser) {
      const storedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
      const initialTheme = storedTheme ? storedTheme : 'kinlarb-theme';
      this.themeSubject.next(initialTheme);
      this.applyThemeToBody(initialTheme);
    }
  }

  setTheme(theme: Theme) {
    this.themeSubject.next(theme);
    if (this.isBrowser) {
      localStorage.setItem(this.THEME_KEY, theme);
      this.applyThemeToBody(theme);
    }
  }

  getTheme(): Theme {
    return this.themeSubject.getValue();
  }

  private applyThemeToBody(theme: Theme) {
    if (this.isBrowser) {
      const body = document.body;
      body.classList.remove('kinlarb-theme', 'dark-theme', 'light-theme');
      body.classList.add(theme);
    }
  }
}
