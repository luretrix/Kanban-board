import { useEffect, useMemo, useState } from "react";
import {
  COMPANIES,
  COMPANY_DEFAULT_ID,
  PRIORITIES,
  PRIORITY_DEFAULT_ID,
  WORK_TYPES,
  WORKTYPE_DEFAULT_ID,
} from "../config/options";

function calcProgress(checklist = []) {
  if (!checklist.length) return 0;
  const done = checklist.filter((c) => c.done).length;
  return Math.round((done / checklist.length) * 100);
}

// Bug 15 fix: Input sanitization function
function sanitizeInput(value, maxLength) {
  // Ensure input is a string
  if (typeof value !== "string") {
    return "";
  }

  // Limit length
  let sanitized = value.slice(0, maxLength);

  // Remove potentially dangerous characters (< >) for future web-use
  sanitized = sanitized.replace(/[<>]/g, "");

  return sanitized;
}

export default function TaskDrawer({ isOpen, task, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [obstacles, setObstacles] = useState("");
  const [deadline, setDeadline] = useState("");


  const [priority, setPriority] = useState(PRIORITY_DEFAULT_ID);
  const [workType, setWorkType] = useState(WORKTYPE_DEFAULT_ID);
  const [company, setCompany] = useState(COMPANY_DEFAULT_ID);

  // estimate: {value, unit} where unit is m/h/d/w
  const [estimateValue, setEstimateValue] = useState("");
  const [estimateUnit, setEstimateUnit] = useState("h");

  // datetime-local expects "YYYY-MM-DDTHH:mm"
  const [scheduledStart, setScheduledStart] = useState("");

  // checklist
  const [checkText, setCheckText] = useState("");
  const [checklist, setChecklist] = useState([]);

  useEffect(() => {
    if (!task) return;

    setTitle(task.title ?? "");
    setNotes(task.notes ?? "");
    setObstacles(task.obstacles ?? "");
    setDeadline(task.deadline ?? "");
    setPriority(task.priority ?? PRIORITY_DEFAULT_ID);
    setWorkType(task.workType ?? WORKTYPE_DEFAULT_ID);
    setCompany(task.company ?? COMPANY_DEFAULT_ID);

    const est = task.estimate ?? null;
    setEstimateValue(
      est?.value === undefined || est?.value === null ? "" : String(est.value)
    );
    setEstimateUnit(est?.unit ?? "h");

    setScheduledStart(task.scheduledStart ?? "");

    setChecklist(Array.isArray(task.checklist) ? task.checklist : []);
    setCheckText("");
  }, [task]);

  // Bug 6 fix: Close drawer if task becomes null while drawer is open
  useEffect(() => {
    if (isOpen && !task) {
      onClose();
    }
  }, [isOpen, task, onClose]);

  const progressPct = useMemo(() => calcProgress(checklist), [checklist]);
  const canSave = useMemo(() => title.trim().length > 0, [title]);

  const addChecklistItem = () => {
    const t = checkText.trim();
    if (!t) return;
    // Bug 7 fix: Use crypto.randomUUID() to prevent ID collisions
    setChecklist((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: t, done: false },
    ]);
    setCheckText("");
  };

  const toggleChecklist = (id) => {
    setChecklist((prev) =>
      prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c))
    );
  };

  const removeChecklist = (id) => {
    setChecklist((prev) => prev.filter((c) => c.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-700 overflow-hidden">
        {/* header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-zinc-400 text-xs">Task details</span>
            <span className="text-white font-semibold text-lg">
              {task?.id === "NEW" ? "New task" : task?.title ?? "—"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition"
          >
            Close
          </button>
        </div>

        {/* scrollable body */}
        <div className="p-5 flex flex-col gap-5 overflow-y-auto">
          {/* title */}
          <div>
            <label className="block text-zinc-300 text-sm mb-2">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="Bytt turbo Subaru"
            />
          </div>

          {/* meta row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Priority */}
            <div className="md:col-span-2">
              <label className="block text-zinc-300 text-sm mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {PRIORITIES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Work type */}
            <div className="md:col-span-3">
              <label className="block text-zinc-300 text-sm mb-2">Work type</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {WORK_TYPES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Company */}
            <div className="md:col-span-3">
              <label className="block text-zinc-300 text-sm mb-2">Company</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                {COMPANIES.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>


            {/* Estimate */}
<div className="md:col-span-3">
<label className="block text-zinc-300 text-sm mb-2">Estimate</label>

<div className="flex gap-2 items-center">
  <input
    type="number"
    min="0"
    value={estimateValue}
    onChange={(e) => setEstimateValue(e.target.value)}
    className="
      w-full
      min-w-[4rem]
      p-3
      rounded-md
      bg-zinc-800
      text-white
      border border-zinc-700
      focus:outline-none
      focus:ring-2
      focus:ring-amber-500/40
    "
    placeholder="3"
  />

  <select
    value={estimateUnit}
    onChange={(e) => setEstimateUnit(e.target.value)}
    className="
      w-24
      p-3
      rounded-md
      bg-zinc-800
      text-white
      border border-zinc-700
      focus:outline-none
      focus:ring-2
      focus:ring-amber-500/40
      flex-shrink-0
    "
  >
    <option value="m">min</option>
    <option value="h">hour</option>
    <option value="d">day</option>
    <option value="w">week</option>
  </select>
</div>
</div>


            {/* Planned start */}
            <div className="md:col-span-2">
              <label className="block text-zinc-300 text-sm mb-2">
                Planned start
              </label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <div className="md:col-span-2">
  <label className="block text-zinc-300 text-sm mb-2">Frist</label>
  <input
    type="date"
    value={deadline}
    onChange={(e) => setDeadline(e.target.value)}
    className="w-full p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
  />
</div>



          {/* progress */}
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-300 text-sm">Progress</span>
              <span className="text-zinc-300 text-sm font-medium">
                {progressPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* checklist */}
          <div>
            <label className="block text-zinc-300 text-sm mb-2">
              Steps (checklist)
            </label>

            <div className="flex gap-2 mb-3">
              <input
                value={checkText}
                onChange={(e) => setCheckText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                className="flex-grow p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Legg til steg…"
              />
              <button
                onClick={addChecklistItem}
                className="px-4 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition"
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {checklist.length === 0 ? (
                <div className="text-zinc-500 italic text-sm">No steps yet.</div>
              ) : (
                checklist.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700"
                  >
                    <label className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => toggleChecklist(c.id)}
                        className="w-4 h-4"
                      />
                      <span
                        className={`text-white truncate ${
                          c.done ? "line-through text-zinc-400" : ""
                        }`}
                      >
                        {c.text}
                      </span>
                    </label>

                    <button
                      onClick={() => removeChecklist(c.id)}
                      className="text-zinc-400 hover:text-red-400 transition px-2"
                      aria-label="Remove step"
                    >
                      x
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* obstacles */}
          <div>
            <label className="block text-zinc-300 text-sm mb-2">
              Hindringer (Blocked)
            </label>
            <textarea
              value={obstacles}
              onChange={(e) => setObstacles(e.target.value)}
              className="w-full min-h-24 p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="Hvorfor står dette på hold? Hva mangler?"
            />
          </div>

          {/* notes */}
          <div>
            <label className="block text-zinc-300 text-sm mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-40 p-3 rounded-md bg-zinc-800 text-white border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              placeholder="Notater, linker, deler som mangler…"
            />
          </div>

          {/* actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition"
            >
              Cancel
            </button>

            <button
              disabled={!canSave}
              onClick={() =>
                onSave({
                  ...task,
                  title: sanitizeInput(title.trim(), 500),
                  notes: sanitizeInput(notes, 10000),
                  obstacles: sanitizeInput(obstacles, 10000),
                  priority,
                  workType,
                  company,
                  estimate:
                    estimateValue === ""
                      ? null
                      : { value: Number(estimateValue), unit: estimateUnit },
                  scheduledStart: scheduledStart || null,
                  deadline: deadline || null,
                  checklist,
                  updatedAt: new Date().toISOString(),

                })
              }
              className="px-4 py-2 rounded-md bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-yellow-500 hover:to-amber-500 transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
