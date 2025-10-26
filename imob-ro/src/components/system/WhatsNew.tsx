/**
 * What's New modal component
 * Step 15: Final Polish
 *
 * Shows changelog updates to users
 */

"use client";

import { useEffect, useState } from "react";

interface ChangelogItem {
  date: string;
  title: string;
  body: string;
}

export default function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChangelogItem[]>([]);

  useEffect(() => {
    fetch("/changelog.json")
      .then((r) => r.json())
      .then((data: ChangelogItem[]) => {
        setItems(data);
        if (!localStorage.getItem("wn-seen")) {
          setOpen(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load changelog:", err);
      });
  }, []);

  if (!open) return null;

  const handleClose = () => {
    localStorage.setItem("wn-seen", "1");
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="rounded-2xl border border-border bg-surface shadow-elev3 p-4 w-[520px] max-w-[92vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Ce e nou</div>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm font-medium hover:bg-surface-2 transition-colors"
            onClick={handleClose}
          >
            Închide
          </button>
        </div>

        <ul className="mt-3 space-y-3 max-h-[60vh] overflow-auto pr-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="rounded-xl border border-border bg-surface-2 p-3 hover:shadow-elev1 transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted whitespace-nowrap ml-2">
                  {new Date(item.date).toLocaleDateString("ro-RO", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="mt-1 text-sm opacity-80">{item.body}</div>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-3 border-t border-border text-center text-xs text-muted">
          Vei vedea acest modal doar o singură dată
        </div>
      </div>
    </div>
  );
}
