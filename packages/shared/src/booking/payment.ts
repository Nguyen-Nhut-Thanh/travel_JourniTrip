export type PaymentResultStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'expired' | 'review';
export type PaymentStatusResponse = {
    bookingId: number;
    reference: string;
    status: PaymentResultStatus;
    amount: string;
    expiresAt: string | null;
    responseCode: string | null;
    bookingStatus: string;
    purpose?: 'booking' | 'reschedule';
    proposalId?: string;
    canRetry?: boolean;
    resolution?: 'applied' | 'refund_pending' | 'refunded' | 'review';
};
export type PaymentUrlResponse = { paymentUrl: string; reference: string; expiresAt: string };
