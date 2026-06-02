"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
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
  const [rows, setRows] = useState(users);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(users);
  }, [users]);

  const applyUserUpdate = (user: User, updates: { role: User["role"]; isActive: boolean }) => {
    startTransition(async () => {
      setPendingUserId(user.id);

      try {
        const result = await updateUserRole({ userId: user.id, role: updates.role, isActive: updates.isActive });

        if (result.error || !result.data) {
          toast.error(result.error ?? "Unable to update user.");
          return;
        }

        const updatedUser = result.data;
        setRows((current) => current.map((entry) => (entry.id === user.id ? updatedUser : entry)));
        toast.success("User updated.");
      } finally {
        setPendingUserId((current) => (current === user.id ? null : current));
      }
    });
  };

  const filtered = rows.filter((user) => {
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
          {filtered.map((user) => {
            const isUpdatingUser = isPending && pendingUserId === user.id;

            return (
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
                  <Select value={user.role} onValueChange={(value) => applyUserUpdate(user, { role: value as User["role"], isActive: user.is_active })}>
                    <SelectTrigger className="w-[180px]" disabled={isUpdatingUser}>
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
                  <Switch checked={user.is_active} onCheckedChange={(checked) => applyUserUpdate(user, { role: user.role, isActive: checked })} disabled={isUpdatingUser} />
                  <span>{isUpdatingUser ? "Saving..." : user.is_active ? "Active" : "Inactive"}</span>
                </div>
              </TableCell>
              <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          );})}
        </TableBody>
      </Table>
    </div>
  );
}