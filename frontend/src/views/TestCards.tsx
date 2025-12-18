// src/test/TestCards.tsx  (ajusta la ruta si lo pones en otra carpeta)
import React, { useState } from "react";
import { createCard, getCardById } from "../api/cards";
import type { Card, CardInput } from "../types/card";

export function TestCards() {
  const [lastCreated, setLastCreated] = useState<Card | null>(null);
  const [fetched, setFetched] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: CardInput = {
        board_id: 1,
        list_id: 1,
        title: "Tarjeta de prueba",
        description: "Creada desde TestCards.tsx",
        due_date: "2025-12-31",
      };
      const card = await createCard(payload);
      setLastCreated(card);
    } catch (err) {
      setError("Error al crear tarjeta (probablemente backend no disponible)");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetById = async () => {
    if (!lastCreated) {
      setError("Primero crea una tarjeta para obtener su id");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const card = await getCardById(String(lastCreated.id));
      setFetched(card);
    } catch (err) {
      setError("Error al obtener tarjeta por id");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Test de API de tarjetas</h1>

      <button onClick={handleCreate} disabled={loading}>
        Crear tarjeta de prueba
      </button>

      <button
        onClick={handleGetById}
        disabled={loading || !lastCreated}
        style={{ marginLeft: 8 }}
      >
        Obtener por id (última creada)
      </button>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {lastCreated && (
        <div>
          <h2>Última creada</h2>
          <pre>{JSON.stringify(lastCreated, null, 2)}</pre>
        </div>
      )}

      {fetched && (
        <div>
          <h2>Resultado getCardById</h2>
          <pre>{JSON.stringify(fetched, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
