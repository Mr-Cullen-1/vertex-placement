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
import { formatDate, formatPercentage } from "@/lib/format";
import type { AssignmentDisplayStatus } from "@/domain/placement/assignment-status";

export interface CandidateRow {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  age: number;
  email: string | null;
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
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead aria-hidden="true" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/candidates/${c.id}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {c.firstName} {c.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{c.phoneNumber}</span>
                        <span className="text-xs">
                          Age {c.age}
                          {c.email ? ` · ${c.email}` : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.assignmentCount === 0 ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <Badge variant="outline">
                          {c.completedCount}/{c.assignmentCount} completed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.latestAssignmentStatus ? (
                        <AssignmentStatusBadge status={c.latestAssignmentStatus} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-foreground">
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
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                    <TableRowChevronCell />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((c) => (
              <li key={c.id}>
                <MobileRecordCard
                  href={`/admin/candidates/${c.id}`}
                  title={`${c.firstName} ${c.lastName}`}
                  subtitle={`${c.phoneNumber} · Age ${c.age}${c.email ? ` · ${c.email}` : ""}`}
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
