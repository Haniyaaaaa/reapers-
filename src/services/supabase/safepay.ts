import { supabase } from './client';

export type CreateCheckoutResult = { orderId: string; checkoutUrl: string };

export async function createCheckout(planId: string): Promise<CreateCheckoutResult> {
  const { data, error } = await supabase.functions.invoke('safepay-create-checkout', { body: { planId } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export type VerifyPaymentResult = { status: 'active' | 'failed' | 'pending'; message?: string };

export async function verifyPayment(orderId: string): Promise<VerifyPaymentResult> {
  const { data, error } = await supabase.functions.invoke('safepay-verify-payment', { body: { orderId } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
