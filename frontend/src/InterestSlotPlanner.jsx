import { useMemo, useState } from "react";
import { defaultSlotRanges, newRowKey, rangesToIsoStarts } from "./interestSlotUtils.js";

/**
 * @param {{ onSubmit: (slots: string[]) => Promise<void>, disabled?: boolean }} props
 */
export function InterestSlotPlanner({ onSubmit, disabled }) {
  const [ranges, setRanges] = useState(defaultSlotRanges);
  const [submitting, setSubmitting] = useState(false);

  const proposedSlots = useMemo(() => rangesToIsoStarts(ranges), [ranges]);

  function updateRow(index, patch) {
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRanges((prev) => {
      if (prev.length >= 8) return prev;
      const d = new Date();
      d.setDate(d.getDate() + 1 + prev.length);
      const pad = (n) => String(n).padStart(2, "0");
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return [...prev, { _key: newRowKey(), date: dateStr, start: "14:00", end: "15:00" }];
    });
  }

  function removeRow(index) {
    setRanges((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handlePropose() {
    if (!proposedSlots.length || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(proposedSlots);
      setRanges(defaultSlotRanges());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="slot-planner">
      <p className="slot-planner-title">Propose time slots</p>
      <p className="slot-planner-hint">Choose a date (opens your system calendar), then a time window. Each row is one offered slot using the start of that window (up to 8).</p>
      <div className="slot-planner-rows">
        {ranges.map((row, index) => (
          <div className="slot-planner-row" key={row._key}>
            <label className="slot-planner-field">
              <span className="slot-planner-label">Date</span>
              <input
                type="date"
                className="slot-planner-input"
                value={row.date}
                onChange={(e) => updateRow(index, { date: e.target.value })}
                disabled={disabled || submitting}
              />
            </label>
            <label className="slot-planner-field">
              <span className="slot-planner-label">From</span>
              <input
                type="time"
                className="slot-planner-input"
                value={row.start}
                onChange={(e) => updateRow(index, { start: e.target.value })}
                disabled={disabled || submitting}
              />
            </label>
            <span className="slot-planner-sep" aria-hidden>
              –
            </span>
            <label className="slot-planner-field">
              <span className="slot-planner-label">To</span>
              <input
                type="time"
                className="slot-planner-input"
                value={row.end}
                onChange={(e) => updateRow(index, { end: e.target.value })}
                disabled={disabled || submitting}
              />
            </label>
            <button
              type="button"
              className="slot-planner-remove ghost-button"
              onClick={() => removeRow(index)}
              disabled={disabled || submitting || ranges.length <= 1}
              aria-label="Remove this range"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="slot-planner-toolbar">
        <button type="button" className="ghost-button" onClick={addRow} disabled={disabled || submitting || ranges.length >= 8}>
          Add another range
        </button>
        <span className="slot-planner-count">{proposedSlots.length} valid slot{proposedSlots.length === 1 ? "" : "s"}</span>
      </div>
      <button type="button" onClick={handlePropose} disabled={disabled || submitting || !proposedSlots.length}>
        {submitting ? "Sending…" : "Propose slots"}
      </button>
    </div>
  );
}
