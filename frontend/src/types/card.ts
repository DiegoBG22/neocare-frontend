// src/types/card.ts

// Estado por columna (coincide con list_id del backend)
export enum CardStatus {
  Todo = 1,       // Por hacer
  InProgress = 2, // En curso
  Done = 3        // Hecho
}

// Tarjeta tal como la devuelve el backend (lectura)
export interface Card {
  id: number;
  board_id: number;
  list_id: number;
  title: string;
  description?: string;
  due_date?: string;
  user_id?: number;
  created_at: string;
  updated_at: string;
}

// Datos para crear una tarjeta
export interface CardInput {
  board_id: number;
  list_id: number;
  title: string;
  description?: string;
  due_date?: string;
}

// Datos para editar una tarjeta
export interface CardUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  list_id?: number;
}
