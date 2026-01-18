// src/api/cards.ts
import { api } from "./client";
import type { CardInput, Card, Label, LabelCreate, Subtask, SubtaskCreate, SubtaskUpdate } from "../types/card";

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

// Labels
export const getLabelsForCard = async (cardId: number): Promise<Label[]> => {
  const res = await api.get(`/api/cards/${cardId}/labels`);
  return res.data;
};

export const createLabelForCard = async (cardId: number, payload: LabelCreate): Promise<Label> => {
  const res = await api.post(`/api/cards/${cardId}/labels`, payload);
  return res.data;
};

export const deleteLabel = async (labelId: number): Promise<void> => {
  await api.delete(`/api/cards/labels/${labelId}`);
};

// Subtasks
export const getSubtasksForCard = async (cardId: number): Promise<Subtask[]> => {
  const res = await api.get(`/api/cards/${cardId}/subtasks`);
  return res.data;
};

export const createSubtaskForCard = async (cardId: number, payload: SubtaskCreate): Promise<Subtask> => {
  const res = await api.post(`/api/cards/${cardId}/subtasks`, payload);
  return res.data;
};

export const updateSubtask = async (subtaskId: number, payload: SubtaskUpdate): Promise<Subtask> => {
  const res = await api.patch(`/api/cards/subtasks/${subtaskId}`, payload);
  return res.data;
};

export const deleteSubtask = async (subtaskId: number): Promise<void> => {
  await api.delete(`/api/cards/subtasks/${subtaskId}`);
};