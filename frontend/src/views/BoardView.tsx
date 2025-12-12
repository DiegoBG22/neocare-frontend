// src/views/BoardView.tsx (demo mínima)
import { CardItem } from "../components/CardItem";

export default function BoardView() {
  const demoCards = [
    { title: "Configurar autenticación", due_date: "2025-12-15", list_id: 1 },
    { title: "CRUD de tarjetas", due_date: "2025-12-18", list_id: 2 },
    { title: "QA y mini demo", due_date: undefined, list_id: 3 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
      {[1,2,3].map((col) => (
        <div key={col}>
          <h3>
            {col === 1 ? "Por hacer" : col === 2 ? "En curso" : "Hecho"}
          </h3>
          <div>
            {demoCards.filter(c => c.list_id === col).map((c, idx) => (
              <CardItem key={idx} card={c} onClick={() => console.log("click", c.title)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
