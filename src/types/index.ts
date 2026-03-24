export type TransactionType = 'ingreso' | 'egreso' | 'transferencia';
export type AccountType = 'Cheques' | 'Ahorros' | 'Efectivo';

export const ACCOUNTS: AccountType[] = ['Cheques', 'Ahorros', 'Efectivo'];

export interface Transaction {
    id: string; // Unique identifier for transaction identity-based merging
    desc: string;
    amount: number | string;
    date: string;
    type: TransactionType;
    category: string;
    account: AccountType; // Account used for this transaction (origin for transfers)
    toAccount?: AccountType; // Destination account for transfers
    updatedAt: string; // ISO timestamp for sync conflict resolution
}

export interface Budget {
    income: number;
    expense: number;
    updatedAt: string; // ISO timestamp for sync conflict resolution
}

export interface Budgets {
    [key: number]: Budget;
}

export const CATEGORIES = [
    "GASOLINA",
    "GASTOS PASIVOS RENTA",
    "AHORRO",
    "CONSUMO DIVERSION",
    "OTROS"
] as const;

export type Category = typeof CATEGORIES[number];

// Google Auth Types
export interface GoogleOAuth2TokenResponse {
    access_token: string;
    token_type: string;
    scope?: string;
    expires_in?: number;
}

export interface GoogleIdentityToken {
    credential: string;
    select_by?: string;
}

export type GoogleAuthResponse = GoogleOAuth2TokenResponse | GoogleIdentityToken;

export interface GoogleUserInfo {
    email: string;
    name: string;
    picture?: string;
}

// Sync Types
export interface AppState {
    transactions: Transaction[];
    budgets: Budgets;
    seedDate: string;
    timestamp: number;
}
