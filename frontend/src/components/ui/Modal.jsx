import React, { useEffect } from "react";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="panel relative z-10 w-full max-w-2xl p-6">
        {title && <h2 className="text-lg font-bold text-[var(--app-text)]">{title}</h2>}
        <div className="mt-4">{children}</div>
        <div className="mt-4 text-right">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
