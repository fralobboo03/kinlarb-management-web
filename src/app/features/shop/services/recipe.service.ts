import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Recipe, RecipeIngredient } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly STORAGE_KEY = 'kinlarb_recipes';
  private readonly recipesSubject = new BehaviorSubject<Recipe[]>([]);
  readonly recipes$ = this.recipesSubject.asObservable();
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.recipesSubject.next(this.loadRecipes());
    }
  }

  getRecipesByShop(shopId: number): Observable<Recipe[]> {
    return this.recipes$.pipe(
      map((recipes) =>
        recipes
          .filter((recipe) => recipe.shopId === shopId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      )
    );
  }

  createRecipe(shopId: number, input: {
    name: string;
    marginPercent: number;
    totalCost: number;
    suggestedPrice: number;
    ingredients: RecipeIngredient[];
  }): Recipe {
    const current = this.recipesSubject.getValue();
    const recipe: Recipe = {
      id: Date.now(),
      shopId,
      name: input.name,
      marginPercent: input.marginPercent,
      totalCost: input.totalCost,
      suggestedPrice: input.suggestedPrice,
      ingredients: input.ingredients,
      createdAt: new Date().toISOString()
    };

    this.saveRecipes([...current, recipe]);
    return recipe;
  }

  updateRecipe(recipeId: number, input: {
    name: string;
    marginPercent: number;
    totalCost: number;
    suggestedPrice: number;
    ingredients: RecipeIngredient[];
  }): boolean {
    const current = this.recipesSubject.getValue();
    let updated = false;

    const nextRecipes = current.map((recipe) => {
      if (recipe.id !== recipeId) {
        return recipe;
      }

      updated = true;
      return {
        ...recipe,
        name: input.name,
        marginPercent: input.marginPercent,
        totalCost: input.totalCost,
        suggestedPrice: input.suggestedPrice,
        ingredients: input.ingredients
      };
    });

    if (!updated) {
      return false;
    }

    this.saveRecipes(nextRecipes);
    return true;
  }

  getRecipeById(recipeId: number): Recipe | undefined {
    return this.recipesSubject.getValue().find((recipe) => recipe.id === recipeId);
  }

  deleteRecipe(recipeId: number): boolean {
    const current = this.recipesSubject.getValue();
    const nextRecipes = current.filter((recipe) => recipe.id !== recipeId);

    if (nextRecipes.length === current.length) {
      return false;
    }

    this.saveRecipes(nextRecipes);
    return true;
  }

  private loadRecipes(): Recipe[] {
    if (!this.isBrowser) {
      return [];
    }

    const payload = localStorage.getItem(this.STORAGE_KEY);
    if (!payload) {
      return [];
    }

    try {
      const parsed = JSON.parse(payload) as Recipe[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveRecipes(recipes: Recipe[]): void {
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recipes));
    }
    this.recipesSubject.next(recipes);
  }
}
