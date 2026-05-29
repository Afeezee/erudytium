"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveResource, rejectResource } from "@/lib/actions/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Resource } from "@/types";

export function ModerationTable({ pending, approved, rejected }: { pending: Resource[]; approved: Resource[]; rejected: Resource[] }) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const renderRows = (resources: Resource[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Uploader</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resources.map((resource) => (
          <TableRow key={resource.id}>
            <TableCell>{resource.title}</TableCell>
            <TableCell>{resource.uploader?.name ?? "Unknown"}</TableCell>
            <TableCell>{resource.category?.name ?? "General"}</TableCell>
            <TableCell>{resource.file_type}</TableCell>
            <TableCell>{new Date(resource.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-3">
                <Badge variant={resource.status === "approved" ? "success" : resource.status === "rejected" ? "error" : "warning"}>{resource.status}</Badge>
                {resource.status === "pending" ? (
                  <>
                    <Button size="sm" onClick={() => startTransition(async () => { const result = await approveResource(resource.id); if (result.error) toast.error(result.error); else window.location.reload(); })} disabled={isPending}>Approve</Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">Reject</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject resource</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <Input placeholder="Reason for rejection" value={reason} onChange={(event) => setReason(event.target.value)} />
                          <Button onClick={() => startTransition(async () => { const result = await rejectResource(resource.id, reason); if (result.error) toast.error(result.error); else window.location.reload(); })}>Confirm rejection</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending</TabsTrigger>
        <TabsTrigger value="approved">Approved</TabsTrigger>
        <TabsTrigger value="rejected">Rejected</TabsTrigger>
      </TabsList>
      <TabsContent value="pending">{renderRows(pending)}</TabsContent>
      <TabsContent value="approved">{renderRows(approved)}</TabsContent>
      <TabsContent value="rejected">{renderRows(rejected)}</TabsContent>
    </Tabs>
  );
}