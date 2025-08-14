import { Decimal } from 'generated/prisma/runtime/library';

// interface CartProduct {
//   id: string;
//   name: string;
//   description: string;
//   price: Decimal;
//   stock: number;
// }

// interface CartItem {
//   id: string;
//   quantity: number;
//   product: CartProduct;
// }

// export interface UserCart {
//   id: string;
//   cartItems: CartItem[];
// }

export type OrderItems = {
  price: Decimal;
  quantity: number;
  productId: string;
};
