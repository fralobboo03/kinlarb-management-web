export interface Menu {
  id?: number;
  shopId: number;
  name: string;
  price: number;
  ingredients: MenuIngredient[];
}

export interface MenuIngredient {
  stockItemId: number;
  name: string;
  quantity?: number;
}
