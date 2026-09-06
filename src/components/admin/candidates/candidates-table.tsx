"use client";

import { useMemo, useState } from "react";
import { SearchIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { InteractiveListItem, ListPanel } from "@/components/admin/interactive-list-item";
import { candidateDisplayName, formatDate, formatPercentage } from "@/lib/format";
import type { AssignmentDisplayStatus } from "@/domain/placement/assignment-status";

export interface CandidateRow {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: number;
  email: string | null;
  profileCompletedAt: string | null;
  createdAt: string;
  assignmentCount: number;
  completedCount: number;
  latestAssignmentStatus: AssignmentDisplayStatus | null;
  latestResult: { rawScore: number; totalQuestions: number; percentage: number } | null;
}

/** Client-side search only — deliberately not a server-driven filter,
 * per the Phase 2B brief's "do not over-engineer filtering in this
 * phase" (candidate counts are small enough for this to stay instant). */
export function CandidatesTable({ candidates }: { candidates: CandidateRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      `${c.firstName} ${c.lastName} ${c.phoneNumber} ${c.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [candidates, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative max-w-sm shrink-0 rounded-lg border border-border bg-card">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or email"
          className="border-0 bg-transparent pl-8 shadow-none focus-visible:ring-2"
          aria-label="Search candidates"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={candidates.length === 0 ? UsersIcon : SearchXIcon}
          title={candidates.length === 0 ? "No candidates yet" : "No matches"}
          description={
            candidates.length === 0
              ? "Add a candidate to start creating assignments."
              : "Try a different search term."
          }
        />
      ) : (
        <ListPanel>
          {filtered.map((c) => (
            <InteractiveListItem
              key={c.id}
              href={`/admin/candidates/${c.id}`}
              actionLabel="View candidate"
              title={candidateDisplayName(c)}
              subtitle={
                c.profileCompletedAt
                  ? `${c.phoneNumber} · Age ${c.age}${c.email ? ` · ${c.email}` : ""}`
                  : "Profile pending"
              }
              meta={
                <>
                  {c.assignmentCount > 0 && (
                    <span>
                      {c.completedCount}/{c.assignmentCount} assignments completed
                    </span>
                  )}
                  {c.latestResult && (
                    <span className="font-medium text-foreground">
                      {c.latestResult.rawScore}/{c.latestResult.totalQuestions} (
                      {formatPercentage(c.latestResult.percentage)})
                    </span>
                  )}
                  <span>Added {formatDate(c.createdAt)}</span>
                </>
              }
              status={c.latestAssignmentStatus && <AssignmentStatusBadge status={c.latestAssignmentStatus} />}
            />
          ))}
        </ListPanel>
      )}
    </div>
  );
}
