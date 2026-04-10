"use client";

import React from "react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({ open, title = "Confirm", description, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onClose }: Props) {
  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: 20, borderRadius: 8, minWidth: 320, zIndex: 70 }}>
        <div className="font-bold text-lg">{title}</div>
        {description && <div className="text-sm text-[var(--muted)] mt-2">{description}</div>}
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-1 rounded" style={{ background: "transparent" }}>{cancelLabel}</button>
          <button onClick={onConfirm} className="px-3 py-1 rounded" style={{ background: "var(--danger)", color: "white" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
