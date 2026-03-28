export interface RecipeIngredient {
  stockItemId: number | null;
  name: string;
  quantityUsed: number;
  costPerUnit: number;
  totalCost: number;
  // Legacy compatibility fields from previous recipe-cost implementation.
  purchasedPrice?: number;
  purchaseUnit?: string;
  ingredient?: string;
  eyPercent?: number;
  recipeQty?: number;
  recipeUnit?: string;
  individualCost?: number;
}

export interface Recipe {
  id?: number;
  shopId: number;
  name: string;
  marginPercent: number;
  totalCost: number;
  suggestedPrice: number;
  ingredients: RecipeIngredient[];
  createdAt: string;
}
