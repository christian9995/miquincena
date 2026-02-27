export type TransactionType = 'ingreso' | 'egreso';

export interface Transaction {
    desc: string;
    amount: number | string;
    date: string;
    type: TransactionType;
    category: string;
}

export interface Budget {
    income: number;
    expense: number;
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
