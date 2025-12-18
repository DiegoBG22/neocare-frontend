// src/components/CardItem.tsx
import React from "react";
import type { Card } from "../types/card";
import "./CardItem.css";

type Props = {
  card: Pick<Card, "title" | "due_date" | "list_id">;
  onClick?: () => void;
};

export function CardItem({ card, onClick }: Props) {
  const statusMap: Record<number, string> = {
    1: "Por hacer",
    2: "En curso",
    3: "Hecho",
  };

  return (
    <div className="card-item" onClick={onClick} role="button">
      <div className="card-title">{card.title || "Sin título"}</div>
      <div className="card-meta">
        <span className="card-status">
          {statusMap[card.list_id] ?? "Estado"}
        </span>
        {card.due_date && (
          <span className="card-due">
            Vence: {new Date(card.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}


