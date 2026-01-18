import { memo } from "react";
import Card from "./Card";

// Drag/drop optimization: memoize Column to prevent re-renders
const Column = memo(function Column({
  columnId,
  column,
  styles,
  onDragOver,
  onDrop,
  onDragStart,
  onRemove,
  onOpen,
  onDropOnCard,
}) {
  return (
    <div
      className={`flex-shrink-0 w-80 bg-zinc-800 rounded-lg shadow-xl border-t-4 ${
        styles?.border ?? "border-zinc-700"
      }`}
      // 🔥 KRITISK: må tillate drop
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e);
      }}
      onDrop={(e) => onDrop?.(e, columnId)}
    >
      {/* Header */}
      <div
        className={`p-4 text-white font-bold text-xl rounded-t-md ${
          styles?.header ?? "bg-zinc-700"
        }`}
      >
        {column?.name ?? columnId}
        <span className="ml-2 px-2 py-1 bg-zinc-800 bg-opacity-30 rounded-full text-sm">
          {column?.items?.length ?? 0}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 min-h-64">
        {!column?.items?.length ? (
          <div className="text-center py-10 text-zinc-500 italic text-sm">
            Drop tasks here
          </div>
        ) : (
          column.items.map((item) => (
            <Card
              key={item.id}
              item={item}
              columnId={columnId}
              onDragStart={onDragStart}
              onRemove={onRemove}
              onOpen={onOpen}
              onDropOnCard={onDropOnCard}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default Column;
