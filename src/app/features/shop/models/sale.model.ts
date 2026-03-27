export interface Sale {
  id?: number;
  shopId: number;
  date: string;
  menuId: number;
  menuName: string;
  quantitySold: number;
  pricePerUnit: number;
  totalPrice: number;
}
