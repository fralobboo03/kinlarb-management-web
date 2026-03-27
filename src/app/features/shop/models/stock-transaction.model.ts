export interface StockTransaction {
  id?: number;
  shopId: number;
  type: 'IN' | 'OUT';
  name: string;
  unit?: string;
  pricePerUnit?: number;
  quantity: number;
  totalCost?: number;
  date: Date;
  // Legacy fields kept for backward compatibility with old localStorage data.
  cost?: number;
  price?: number;
}
