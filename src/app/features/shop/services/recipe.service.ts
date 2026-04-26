import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Recipe } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:8080/api/recipes';

  private readonly recipesSubject = new BehaviorSubject<Recipe[]>([]);
  readonly recipes$ = this.recipesSubject.asObservable();

  getRecipesByShop(shopId: number): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${this.API_URL}/get-all-recipes`).pipe(
      map(recipes => recipes.filter(r => r.shopId === shopId || !r.shopId)),
      tap(recipes => this.recipesSubject.next(recipes)),
      catchError(this.handleError)
    );
  }

  createRecipe(shopId: number, input: Partial<Recipe>): Observable<Recipe> {
    const payload = { ...input, shopId };
    return this.http.post<Recipe>(`${this.API_URL}/create-recipes`, payload).pipe(
      tap(() => this.getRecipesByShop(shopId).subscribe()), // Auto refresh list
      catchError(this.handleError)
    );
  }

  updateRecipe(recipeId: number, input: Partial<Recipe>): Observable<Recipe> {
    return this.http.post<Recipe>(`${this.API_URL}/update-recipes/${recipeId}`, input).pipe(
      catchError(this.handleError)
    );
  }

  deleteRecipe(recipeId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/delete-recipes-byid/${recipeId}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error && typeof error.error === 'object') {
         if (error.error.message) errorMessage += `\nDetail: ${error.error.message}`;
         if (error.error.sqlState) errorMessage += `\nSQL State: ${error.error.sqlState}`;
         if (error.error.sqlCode) errorMessage += `\nSQL Code: ${error.error.sqlCode}`;
      }
    }
    console.error('RecipeService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
