import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableCard({ id, listId, children, disabled, isEditing }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id,
    data: { listId },
    disabled: disabled || isEditing // Deshabilitar cuando está en modo edición
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled || isEditing ? 'default' : 'grab',
    position: 'relative',
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isEditing && attributes)} // Solo agregar atributos cuando no está editando
      {...(!isEditing && listeners)} // Solo agregar listeners cuando no está editando
      className="sortable-card"
    >
      {children}
    </div>
  );
}