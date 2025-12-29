import React from "react";
import { CardItem } from "../components/CardItem";

export default function BoardView() {
  // Es vital que cada tarjeta tenga un 'id' numérico para que TypeScript no bloquee la app
  const demoCards = [
    { id: 1, title: "Configurar API", due_date: "2025-12-25", list_id: 1 },
    { id: 2, title: "Entrega del Frontend", due_date: "2025-12-29", list_id: 1 },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ color: "white" }}>Tareas</h2>
      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ background: "#1a1c2c", padding: "15px", borderRadius: "8px", width: "300px" }}>
          <h3 style={{ color: "white" }}>Por hacer</h3>
          {demoCards.map((c) => (
            <CardItem key={c.id} card={c} />
          ))}
        </div>
      </div>
    </div>
  );
}