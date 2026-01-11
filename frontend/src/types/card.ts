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
  completed?: boolean;
  overdue?: boolean;
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

// Label asociado a una tarjeta
export interface Label {
  id: number;
  card_id: number;
  name: string;
  color?: string;
}

export interface LabelCreate {
  name: string;
  color?: string;
}

// Subtask (checklist item)
export interface Subtask {
  id: number;
  card_id: number;
  title: string;
  completed: boolean;
}

export interface SubtaskCreate {
  title: string;
}

export interface SubtaskUpdate {
  title?: string;
  completed?: boolean;
}
