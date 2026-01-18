import { memo } from "react";
import { COMPANIES, WORK_TYPES } from "../config/options";

const PRIORITY_RING = {
  low: "ring-1 ring-blue-400/40",
  medium: "ring-1 ring-amber-400/40",
  high: "ring-2 ring-orange-400/50",
  critical: "ring-2 ring-rose-400/60",
};

const PRIORITY_DOT = {
  low: "bg-blue-400",
  medium: "bg-amber-400",
  high: "bg-orange-400",
  critical: "bg-rose-400",
};

function labelFrom(list, id) {
  const hit = list.find((x) => x.id === id);
  return hit ? hit.label : null;
}

function calcProgress(checklist = []) {
  if (!checklist?.length) return null;
  const done = checklist.filter((c) => c.done).length;
  return Math.round((done / checklist.length) * 100);
}

function formatEstimate(estimate) {
  if (!estimate || estimate.value == null || !estimate.unit) return null;
  const v = Number(estimate.value);
  if (!Number.isFinite(v) || v <= 0) return null;
  return `${v}${estimate.unit}`; // e.g. 3d, 2h
}

function formatPlannedStart(scheduledStart) {
  if (!scheduledStart) return null;

  const d = new Date(scheduledStart);
  if (Number.isNaN(d.getTime())) return null;

  const wd = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d);
  const tm = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

  return `${wd} ${tm}`;
}

function plannedTone(scheduledStart) {
  if (!scheduledStart) return "neutral";
  const d = new Date(scheduledStart);
  if (Number.isNaN(d.getTime())) return "neutral";

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs < 0) return "overdue";

  const hours = diffMs / (1000 * 60 * 60);
  if (hours <= 24) return "soon";

  return "neutral";
}

function Chip({ children, title, tone = "neutral" }) {
  const tones = {
    neutral: "bg-zinc-800 text-zinc-200 border-zinc-700",
    soon: "bg-amber-900/40 text-amber-200 border-amber-700/40",
    overdue: "bg-rose-900/40 text-rose-200 border-rose-700/40",
  };

  return (
    <span
      title={title}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${
        tones[tone] ?? tones.neutral
      }`}
    >
      {children}
    </span>
  );
}

// Drag/drop optimization: memoize Card to prevent re-renders
const Card = memo(function Card({ item, columnId, onDragStart, onRemove, onOpen }) {
  const ring = PRIORITY_RING[item.priority ?? "medium"];
  const dot = PRIORITY_DOT[item.priority ?? "medium"];

  const pct = item.progressPct ?? calcProgress(item.checklist);
  const est = formatEstimate(item.estimate);
  const planned = formatPlannedStart(item.scheduledStart);

  const co = labelFrom(COMPANIES, item.company) ?? null;
  const wt = labelFrom(WORK_TYPES, item.workType) ?? null;

  const hasObstacles = Boolean(item.obstacles && item.obstacles.trim().length > 0);

  return (
    <div
      className={`p-4 mb-3 bg-zinc-700 text-white rounded-lg shadow-md cursor-move transform transition-all duration-200 hover:scale-105 hover:shadow-lg ${ring}`}
      draggable="true"
      onDragStart={(e) => {
        // ✅ KRITISK for Tauri/WebView: sett dataTransfer payload
        try {
          e.dataTransfer.setData("text/plain", item.id);
          e.dataTransfer.effectAllowed = "move";
        } catch {
          // ignore
        }
        onDragStart(columnId, item);
      }}
      onClick={() => onOpen(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(item.id)}
      title="Open task"
    >
      {/* top row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <span className="truncate">{item.title}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(columnId, item.id);
          }}
          className="text-zinc-400 hover:text-red-400 transition-colors duration-200 w-6 h-6 flex items-center justify-center rounded-full hover:bg-zinc-600"
          aria-label="Remove task"
        >
          <span className="text-lg cursor-pointer">x</span>
        </button>
      </div>

      {/* chips row */}
      {(co || wt || est || planned || hasObstacles) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {co && <Chip title={`Company: ${co}`}>{co}</Chip>}
          {wt && <Chip title={`Work type: ${wt}`}>{wt}</Chip>}
          {est && <Chip title={`Estimate: ${est}`}>{est}</Chip>}

          {hasObstacles && (
            <Chip title={`Hindringer: ${item.obstacles}`} tone="overdue">
              !
            </Chip>
          )}

          {planned && (
            <Chip
              title={`Planned start: ${planned}`}
              tone={plannedTone(item.scheduledStart)}
            >
              {planned}
            </Chip>
          )}
        </div>
      )}

      {/* progress */}
      {typeof pct === "number" && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-zinc-300 mb-1">
            <span>Steps</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default Card;
