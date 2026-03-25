export interface StockTransaction {
  id?: number;
  shopId: number;
  type: 'IN' | 'OUT';
  name: string;
  quantity: number;
  date: Date;
  cost?: number;
  price?: number;
}
