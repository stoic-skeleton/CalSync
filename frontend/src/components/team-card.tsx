"use client";

import Image from "next/image";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/types";

interface TeamCardProps {
  team: Team;
  selected?: boolean;
  onToggle?: (team: Team) => void;
}

export default function TeamCard({ team, selected = false, onToggle }: TeamCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-150 cursor-default",
        selected
          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]"
      )}
    >
      {/* Team logo / swatch */}
      <div
        className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
        style={{
          background: team.primary_color ?? "var(--surface-hover)",
        }}
      >
        {team.logo_url ? (
          <Image
            src={team.logo_url}
            alt={team.name}
            width={36}
            height={36}
            className="object-contain"
          />
        ) : (
          <span className="text-xs font-bold text-white">
            {(team.short_name ?? team.name).slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
        {team.name}
      </span>

      {/* Toggle button */}
      {onToggle && (
        <button
          onClick={() => onToggle(team)}
          aria-label={selected ? "Remove team" : "Add team"}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
            selected
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--surface-hover)] text-[var(--muted)] hover:bg-[var(--accent)] hover:text-white"
          )}
        >
          {selected ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} strokeWidth={2.5} />}
        </button>
      )}
    </div>
  );
}
