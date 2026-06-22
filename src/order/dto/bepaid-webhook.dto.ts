/** Тело уведомления от bePaid (webhook notification) */
export interface BePaidWebhookDto {
  transaction: {
    uid: string;
    status: 'successful' | 'failed' | 'incomplete' | 'expired';
    type: string;
    tracking_id: string; // наш orderId
    amount: number;      // в копейках
    currency: string;
    message?: string;
    test: boolean;
  };
}
