"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateUserRole } from "@/lib/actions/users";
import type { User } from "@/types";

interface UsersTableProps {
  users: User[];
}

export function UsersTable({ users }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const filtered = users.filter((user) => {
    const haystack = `${user.name ?? ""} ${user.email}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <Input placeholder="Search by name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.name ?? user.email} />
                    <AvatarFallback>{user.name?.slice(0, 1) ?? user.email.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name ?? "Unnamed user"}</p>
                    <p className="text-sm text-neutral-500">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Badge>{user.role}</Badge>
                  <Select defaultValue={user.role} onValueChange={(value) => startTransition(async () => void updateUserRole({ userId: user.id, role: value as User["role"], isActive: user.is_active }))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Switch checked={user.is_active} onCheckedChange={(checked) => startTransition(async () => void updateUserRole({ userId: user.id, role: user.role, isActive: checked }))} disabled={isPending} />
                  <span>{user.is_active ? "Active" : "Inactive"}</span>
                </div>
              </TableCell>
              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}