export interface RecipeIngredient {
  purchasedPrice: number;
  purchaseUnit: string;
  ingredient: string;
  eyPercent: number;
  recipeQty: number;
  recipeUnit: string;
  individualCost: number;
}

export interface Recipe {
  id?: number;
  shopId: number;
  name: string;
  totalCost: number;
  suggestedPrice: number;
  ingredients: RecipeIngredient[];
  createdAt: string;
}
