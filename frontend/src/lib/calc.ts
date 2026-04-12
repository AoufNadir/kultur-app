export function orderTotal(quantity: number, unitPrice: number, shippingFee: number): number {
  return quantity * unitPrice + shippingFee;
}
