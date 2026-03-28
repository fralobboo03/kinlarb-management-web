export interface OrderItem {
  recipeId: number;
  recipeName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface Order {
  id?: number;
  orderDate: string;
  totalAmount: number;
  items: OrderItem[];
}
