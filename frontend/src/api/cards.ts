// src/api/cards.ts
import { api } from "./client";
import type { CardInput, Card } from "../types/card";

// Crear una tarjeta
export const createCard = async (cardData: CardInput): Promise<Card> => {
  const response = await api.post("/api/cards", cardData);
  return response.data;
};

// Obtener una tarjeta por id
export const getCardById = async (cardId: string): Promise<Card> => {
  const response = await api.get(`/api/cards/${cardId}`);
  return response.data;
};

// Implementación del endpoint PATCH para mover tarjetas
export const moveCard = async (
  cardId: number, 
  listId: number, 
  newOrder: number
): Promise<Card> => {
  const response = await api.patch(`/api/cards/${cardId}/move`, {
    list_id: listId,
    new_order: newOrder,
  });
  return response.data;
};