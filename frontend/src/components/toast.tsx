"use client";

import React, { useEffect } from "react";

type Props = { message: string; kind?: "success" | "error" | "info" };

export default function Toast({ message, kind = "info" }: Props) {
  const bg = kind === "success" ? "var(--success)" : kind === "error" ? "var(--danger)" : "var(--accent)";

  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.getElementById("__app_toast");
      if (el) el.style.opacity = "0";
    }, 2600);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <div id="__app_toast" style={{ position: "fixed", right: 16, bottom: 16, padding: 12, borderRadius: 8, background: bg, color: "white", zIndex: 80 }}>
      {message}
    </div>
  );
}
