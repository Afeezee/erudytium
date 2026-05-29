"use client";

import Link from "next/link";
import { Lock, MessageSquare, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoomCardSkeleton } from "@/components/ui/Skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { StudyRoom } from "@/types";

interface RoomCardProps {
  room?: StudyRoom;
  loading?: boolean;
  onJoin?: (roomId: string) => Promise<void> | void;
}

export function RoomCard({ room, loading = false, onJoin }: RoomCardProps) {
  if (loading || !room) {
    return <RoomCardSkeleton />;
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/rooms/${room.id}`} className="font-display text-xl font-semibold hover:text-primary">
                {room.name}
              </Link>
              {room.is_private ? <Lock className="h-4 w-4 text-warning" /> : null}
            </div>
            <Badge variant="accent">{room.topic ?? "General"}</Badge>
          </div>
          <Avatar>
            <AvatarImage src={room.creator?.avatar_url ?? undefined} alt={room.creator?.name ?? "Room creator"} />
            <AvatarFallback>{room.creator?.name?.slice(0, 1) ?? "R"}</AvatarFallback>
          </Avatar>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{room.description || "No description provided for this room yet."}</p>
        <div className="flex flex-wrap gap-4 text-sm text-neutral-600 dark:text-neutral-300">
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4" />
            {room.member_count ?? 0} members
          </span>
          <span className="inline-flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {room.message_count ?? 0} messages
          </span>
        </div>
        <div className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href={`/dashboard/rooms/${room.id}`}>Open room</Link>
          </Button>
          <Button variant="outline" onClick={() => onJoin?.(room.id)}>
            Join
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}