import React, { useState } from "react";
import type { Card } from "../types/card";
import { Labels } from "./Labels";
import { Checklist } from "./Checklist";

const API_BASE_URL = 'http://localhost:8000';

type Props = {
  card: Pick<Card, "id" | "title" | "due_date" | "list_id">;
};

export function CardItem({ card }: Props) {
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [hours, setHours] = useState("");

  const handleSaveTime = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hours) return alert("Pon las horas");

    try {
      const res = await fetch(`${API_BASE_URL}/api/timesheets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          description: `BOTON AQUI: ${card.title}`,
          hours: parseFloat(hours),
          date: new Date().toISOString().split('T')[0],
          card_id: card.id
        })
      });

      if (res.ok) {
        alert("✅ Guardado");
        setShowTimeForm(false);
      }
    } catch (err) {
      alert("Error de conexión");
    }
  };

  return (
    <div style={{ background: "#25283d", padding: "15px", borderRadius: "6px", marginBottom: "10px", border: "1px solid #3e415b" }}>
      <div style={{ color: "white", fontWeight: "bold", marginBottom: "8px" }}>{card.title}</div>
      <div style={{ marginBottom: "8px" }}>
        <Labels cardId={card.id} />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <Checklist cardId={card.id} />
      </div>

      {/* EL BOTÓN DEL RELOJ */}
      <div style={{ borderTop: "1px solid #3e415b", paddingTop: "10px", marginTop: "10px" }}>
        {!showTimeForm ? (
          <button 
            onClick={() => setShowTimeForm(true)}
            style={{ background: "#4e54c8", color: "white", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
          >
            ⏱️ Registrar horas
          </button>
        ) : (
          <div style={{ display: "flex", gap: "5px" }}>
            <input 
              type="number" 
              value={hours} 
              onChange={(e) => setHours(e.target.value)}
              style={{ width: "60px", padding: "4px", borderRadius: "4px", border: "none" }}
              placeholder="Hrs"
            />
            <button onClick={handleSaveTime} style={{ background: "#28a745", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px" }}>OK</button>
            <button onClick={() => setShowTimeForm(false)} style={{ background: "#dc3545", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px" }}>X</button>
          </div>
        )}
      </div>
    </div>
  );
}