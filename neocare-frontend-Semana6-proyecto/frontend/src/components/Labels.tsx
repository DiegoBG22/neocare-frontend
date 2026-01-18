import React, { useEffect, useState } from "react";
import type { Label, LabelCreate } from "../types/card";
import { getLabelsForCard, createLabelForCard, deleteLabel } from "../api/cards";

type Props = { cardId: number };

export const Labels: React.FC<Props> = ({ cardId }) => {
  const [labels, setLabels] = useState<Label[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6c757d");

  const load = async () => {
    try {
      const data = await getLabelsForCard(cardId);
      setLabels(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [cardId]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      const newLabel = await createLabelForCard(cardId, { name, color });
      setLabels((s) => [...s, newLabel]);
      setName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteLabel(id);
      setLabels((s) => s.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {labels.map((l) => (
          <div key={l.id} style={{ background: l.color || "#6c757d", color: "white", padding: "3px 8px", borderRadius: "12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span>{l.name}</span>
            <button onClick={() => handleDelete(l.id)} style={{ background: "transparent", border: "none", color: "white", cursor: "pointer" }}>✖</button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New label" style={{ padding: "4px", borderRadius: "4px", border: "none" }} />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: "36px", height: "28px", padding: 0, border: "none", background: "transparent" }} />
        <button onClick={handleAdd} style={{ background: "#4e54c8", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px" }}>Add</button>
      </div>
    </div>
  );
};