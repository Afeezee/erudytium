"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { closeRoom } from "@/lib/actions/rooms";
import type { StudyRoom } from "@/types";

export function RoomsTable({ rooms }: { rooms: StudyRoom[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Room</TableHead>
          <TableHead>Topic</TableHead>
          <TableHead>Members</TableHead>
          <TableHead>Messages</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead>Created date</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rooms.map((room) => (
          <TableRow key={room.id}>
            <TableCell>{room.name}</TableCell>
            <TableCell>{room.topic}</TableCell>
            <TableCell>{room.member_count ?? 0}</TableCell>
            <TableCell>{room.message_count ?? 0}</TableCell>
            <TableCell>{room.creator?.name ?? "Unknown"}</TableCell>
            <TableCell>{new Date(room.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <Button variant="destructive" size="sm" disabled={isPending} onClick={() => startTransition(async () => { const result = await closeRoom(room.id); if (result.error) toast.error(result.error); else window.location.reload(); })}>Close room</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}