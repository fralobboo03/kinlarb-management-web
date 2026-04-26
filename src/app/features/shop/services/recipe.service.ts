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
      const parsed = JSON.parse(payload) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      const normalizedRecipes = parsed
        .map((item) => this.normalizeRecipe(item))
        .filter((recipe): recipe is Recipe => recipe !== null);

      // Persist migrated structure so subsequent reads are consistent with the new UI model.
      if (this.isBrowser) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalizedRecipes));
      }

      return normalizedRecipes;
    } catch {
      return [];
    }
  }

  private normalizeRecipe(value: unknown): Recipe | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const record = value as Partial<Recipe> & { ingredients?: unknown[] };
    const normalizedIngredients = Array.isArray(record.ingredients)
      ? record.ingredients
          .map((ingredient) => this.normalizeIngredient(ingredient))
          .filter((ingredient): ingredient is RecipeIngredient => ingredient !== null)
      : [];

    const createdAt = typeof record.createdAt === 'string' && record.createdAt.trim().length > 0
      ? record.createdAt
      : new Date().toISOString();

    const normalizedRecipe: Recipe = {
      id: typeof record.id === 'number' ? record.id : Date.now(),
      shopId: typeof record.shopId === 'number' ? record.shopId : 0,
      name: typeof record.name === 'string' ? record.name : '',
      marginPercent: Number(record.marginPercent ?? 0),
      totalCost: Number(record.totalCost ?? 0),
      suggestedPrice: Number(record.suggestedPrice ?? 0),
      ingredients: normalizedIngredients,
      createdAt
    };

    return normalizedRecipe;
  }

  private normalizeIngredient(value: unknown): RecipeIngredient | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const ingredient = value as RecipeIngredient;
    const name = String(ingredient.name ?? ingredient.ingredient ?? '').trim();

    if (!name) {
      return null;
    }

    const quantityUsed = Number(ingredient.quantityUsed ?? ingredient.recipeQty ?? 0);
    const costPerUnit = Number(
      ingredient.costPerUnit
        ?? (ingredient.eyPercent && ingredient.purchasedPrice
          ? (ingredient.purchasedPrice / ingredient.eyPercent) * 100
          : ingredient.purchasedPrice ?? 0)
    );

    const totalCost = Number.isFinite(Number(ingredient.totalCost))
      ? Number(ingredient.totalCost)
      : quantityUsed * costPerUnit;

    return {
      stockItemId: ingredient.stockItemId != null ? Number(ingredient.stockItemId) : null,
      name,
      quantityUsed,
      unit: String(ingredient.unit ?? ingredient.recipeUnit ?? ingredient.purchaseUnit ?? '').trim(),
      costPerUnit,
      totalCost
    };
  }

  private saveRecipes(recipes: Recipe[]): void {
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recipes));
    }
    this.recipesSubject.next(recipes);
  }
}
