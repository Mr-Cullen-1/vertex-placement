"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { AssignmentStatusBadge } from "@/components/admin/status-badge";
import { MobileRecordCard } from "@/components/admin/mobile-record-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowChevronCell,
} from "@/components/ui/table";
import { candidateDisplayName, formatDate, formatPercentage } from "@/lib/format";
import { cn } from "@/lib/utils";
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
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or email"
          className="pl-8"
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
        <>
          {/* table-fixed + explicit column widths, same technique as the
           * Assignments list (see /docs/DESIGN_SYSTEM.md "No horizontal
           * scrolling") — content truncates/wraps inside its own cell
           * instead of forcing the table wider than the viewport. Assignment
           * count and Status are merged into one "Assignments" column
           * (a completed-count badge plus the latest status directly under
           * it) so a long name/email doesn't compete with two separate
           * columns worth of width. */}
          <div className="hidden lg:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[24%]">Name</TableHead>
                  <TableHead className="w-[28%]">Contact</TableHead>
                  <TableHead className="w-[18%]">Assignments</TableHead>
                  <TableHead className="w-[18%]">Result</TableHead>
                  <TableHead className="w-[12%]">Added</TableHead>
                  <TableHead aria-hidden="true" className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-normal">
                      <Link
                        href={`/admin/candidates/${c.id}`}
                        className={cn(
                          "block truncate font-semibold hover:underline",
                          c.profileCompletedAt ? "text-foreground" : "text-muted-foreground italic"
                        )}
                      >
                        {candidateDisplayName(c)}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      {c.profileCompletedAt ? (
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{c.phoneNumber}</span>
                          <span className="truncate text-xs">
                            Age {c.age}
                            {c.email ? ` · ${c.email}` : ""}
                          </span>
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-col items-start gap-1">
                        {c.assignmentCount === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          <Badge variant="outline">
                            {c.completedCount}/{c.assignmentCount} completed
                          </Badge>
                        )}
                        {c.latestAssignmentStatus && (
                          <AssignmentStatusBadge status={c.latestAssignmentStatus} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium whitespace-normal text-foreground">
                      {c.latestResult ? (
                        <>
                          {c.latestResult.rawScore}/{c.latestResult.totalQuestions}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({formatPercentage(c.latestResult.percentage)})
                          </span>
                        </>
                      ) : (
                        <span className="font-normal text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableRowChevronCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 lg:hidden">
            {filtered.map((c) => (
              <li key={c.id}>
                <MobileRecordCard
                  href={`/admin/candidates/${c.id}`}
                  title={candidateDisplayName(c)}
                  subtitle={
                    c.profileCompletedAt
                      ? `${c.phoneNumber} · Age ${c.age}${c.email ? ` · ${c.email}` : ""}`
                      : undefined
                  }
                  meta={
                    <>
                      {c.latestAssignmentStatus && <AssignmentStatusBadge status={c.latestAssignmentStatus} />}
                      {c.latestResult && (
                        <span className="text-xs font-medium text-foreground">
                          {c.latestResult.rawScore}/{c.latestResult.totalQuestions} (
                          {formatPercentage(c.latestResult.percentage)})
                        </span>
                      )}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
