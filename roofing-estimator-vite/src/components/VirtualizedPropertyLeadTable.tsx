import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { isLikelyPropertyManagerOrCommercialOwner, type PropertyImportPayload } from "../lib/propertyScraper";

const ROW_PX = 68;

const COLS =
  "grid grid-cols-[52px_52px_minmax(160px,1.25fr)_minmax(130px,1fr)_minmax(110px,0.95fr)_minmax(96px,0.85fr)_minmax(96px,0.85fr)_minmax(100px,0.75fr)_minmax(100px,0.85fr)] gap-x-2 px-2 py-1.5 items-start text-sm text-[var(--x-text)] border-t border-white/[0.12]";

type Props = {
  rows: PropertyImportPayload[];
  selectedRowIndex: number | null;
  onSelectRow: (index: number, row: PropertyImportPayload) => void;
};

/**
 * Virtualized grid list — keeps DOM size small for 50k–100k+ property rows.
 */
export function VirtualizedPropertyLeadTable({ rows, selectedRowIndex, onSelectRow }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_PX,
    overscan: 18,
  });

  return (
    <div
      ref={parentRef}
      className="border border-white/[0.15] rounded-lg overflow-auto max-h-[min(480px,55vh)] bg-[var(--x-surface)]"
      role="grid"
      aria-rowcount={rows.length}
    >
      <div className={`${COLS} sticky top-0 z-10 bg-[var(--x-surface-hover)] font-semibold text-xs py-2 border-b border-white/[0.15]`}>
        <div>Score</div>
        <div>Portfolio</div>
        <div>Address</div>
        <div>Owner / contact</div>
        <div>Phone(s)</div>
        <div>Contact person</div>
        <div>Contact phone</div>
        <div>Email(s)</div>
        <div>Entity</div>
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index]!;
          const selected = selectedRowIndex === vi.index;
          return (
            <button
              type="button"
              key={vi.key}
              data-index={vi.index}
              className={`${COLS} absolute left-0 w-full text-left cursor-pointer hover:bg-[var(--x-surface-hover)] ${selected ? "bg-[var(--x-surface-hover)]" : "bg-[var(--x-surface)]"}`}
              style={{
                transform: `translateY(${vi.start}px)`,
                height: `${vi.size}px`,
              }}
              onClick={() => onSelectRow(vi.index, row)}
            >
              <div className="whitespace-nowrap font-medium pt-0.5">{row.leadScore != null ? row.leadScore : "—"}</div>
              <div className="whitespace-nowrap pt-0.5">
                {row.ownerPortfolioCount != null ? row.ownerPortfolioCount : "—"}
              </div>
              <div className="line-clamp-2 break-words pt-0.5">{row.address}</div>
              <div className="line-clamp-2 break-words whitespace-pre-wrap pt-0.5">{row.ownerName || "—"}</div>
              <div className="line-clamp-2 break-words whitespace-pre-wrap pt-0.5">{row.ownerPhone || "—"}</div>
              <div className="line-clamp-2 break-words whitespace-pre-wrap pt-0.5">{row.contactPersonName || "—"}</div>
              <div className="line-clamp-2 break-words whitespace-pre-wrap pt-0.5">{row.contactPersonPhone || "—"}</div>
              <div className="truncate pt-0.5" title={row.ownerEmail || undefined}>
                {row.ownerEmail || "—"}
              </div>
              <div className="line-clamp-2 break-words pt-0.5">
                {row.ownerEntityType || "—"}
                {isLikelyPropertyManagerOrCommercialOwner(row.ownerName, row.ownerEntityType) ? (
                  <span className="block text-xs mt-0.5">LLC / PM-style</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
