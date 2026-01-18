import { memo } from "react";
import Column from "./Column";

// Drag/drop optimization: memoize Board to prevent re-renders
const Board = memo(function Board({
  columns,
  columnStyles,
  onDragOver,
  onDrop,
  onDragStart,
  onRemove,
  onOpen,

}) {
  return (
    <div className="flex gap-6 pb-6 w-max">
      {Object.keys(columns).map((columnId) => (
        <Column
          key={columnId}
          columnId={columnId}
          column={columns[columnId]}
          styles={columnStyles[columnId]}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onRemove={onRemove}
          onOpen={onOpen}

        />
      ))}
    </div>
  );
});

export default Board;
