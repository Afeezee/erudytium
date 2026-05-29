"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateResourceRequestStatus } from "@/lib/actions/resources";
import type { ResourceRequest } from "@/types";

export function RequestsTable({ requests }: { requests: ResourceRequest[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Requested by</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Admin note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell>{request.title}</TableCell>
            <TableCell>{request.user?.name ?? request.user?.email ?? "Unknown"}</TableCell>
            <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Select defaultValue={request.status} onValueChange={(value) => startTransition(async () => { const result = await updateResourceRequestStatus(request.id, value as ResourceRequest["status"], request.admin_note ?? undefined); if (result.error) toast.error(result.error); else window.location.reload(); })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input
                defaultValue={request.admin_note ?? ""}
                disabled={isPending}
                onBlur={(event) => startTransition(async () => { const result = await updateResourceRequestStatus(request.id, request.status, event.target.value); if (result.error) toast.error(result.error); })}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}