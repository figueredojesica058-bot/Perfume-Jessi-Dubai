export interface Product {
  id: string;
  name: string;
  originalPrice: number;
  updatedPrice: number;
  image?: string; // Base64 data URI
}

export enum BulkActionType {
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
  PERCENTAGE = 'PERCENTAGE'
}

export interface ProcessingStatus {
  step: 'idle' | 'reading' | 'analyzing' | 'complete' | 'error';
  message: string;
  progress?: number; // e.g., 1 out of 5 pages
  total?: number;
}