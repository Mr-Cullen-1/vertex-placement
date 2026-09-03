"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

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
          title={candidates.length === 0 ? "No candidates yet" : "No matches"}
          description={
            candidates.length === 0
              ? "Add a candidate to start creating assignments."
              : "Try a different search term."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/candidates/${c.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{c.phoneNumber}</TableCell>
                  <TableCell>{c.age}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email ?? "—"}</TableCell>
                  <TableCell>
                    {c.assignmentCount === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      <Badge variant="outline">
                        {c.completedCount}/{c.assignmentCount} completed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
