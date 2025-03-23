export class DepositWalletDTO {
    wallet_id: number;
    amount: number;
    transaction_type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
    transaction_date: Date;
    description: string;
    status: 'PENDING' | 'FAILED' | 'COMPLETED';
    ordercode: string;
}