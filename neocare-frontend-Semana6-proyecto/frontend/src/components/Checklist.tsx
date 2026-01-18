import React, { useEffect, useState } from "react";
import type { Subtask, SubtaskCreate } from "../types/card";
import { getSubtasksForCard, createSubtaskForCard, updateSubtask, deleteSubtask } from "../api/cards";

type Props = { cardId: number };

export const Checklist: React.FC<Props> = ({ cardId }) => {
  const [items, setItems] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const load = async () => {
    try {
      const data = await getSubtasksForCard(cardId);
      setItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { load(); }, [cardId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      const created = await createSubtaskForCard(cardId, { title: newTitle });
      setItems((s) => [...s, created]);
      setNewTitle("");
    } catch (err) {
      console.error(err);
    }
  };

  const toggle = async (id: number, completed: boolean) => {
    try {
      const updated = await updateSubtask(id, { completed });
      setItems((s) => s.map((it) => (it.id === id ? updated : it)));
    } catch (err) {
      console.error(err);
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteSubtask(id);
      setItems((s) => s.filter((it) => it.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const completedCount = items.filter((i) => i.completed).length;

  return (
    <div>
      <div style={{ fontSize: "12px", color: "#cfcfe6", marginBottom: "6px" }}>Checklist • {completedCount}/{items.length}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((it) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={it.completed} onChange={(e) => toggle(it.id, e.target.checked)} />
            <span style={{ color: it.completed ? "#8e8ea6" : "white", textDecoration: it.completed ? "line-through" : undefined }}>{it.title}</span>
            <button onClick={() => remove(it.id)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#ff6b6b" }}>✖</button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add item" style={{ padding: "4px", borderRadius: "4px", border: "none" }} />
        <button onClick={handleAdd} style={{ background: "#4e54c8", color: "white", border: "none", padding: "4px 8px", borderRadius: "4px" }}>+</button>
      </div>
    </div>
  );
};