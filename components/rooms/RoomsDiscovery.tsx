"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoomCard } from "@/components/ui/RoomCard";
import { CreateRoomModal } from "@/components/rooms/CreateRoomModal";
import { joinRoom, joinRoomByCode } from "@/lib/actions/rooms";
import type { StudyRoom } from "@/types";

interface RoomsDiscoveryProps {
  allRooms: StudyRoom[];
  myRooms: StudyRoom[];
}

export function RoomsDiscovery({ allRooms, myRooms }: RoomsDiscoveryProps) {
  const [query, setQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredAll = useMemo(
    () => allRooms.filter((room) => `${room.name} ${room.topic ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [allRooms, query]
  );
  const filteredMine = useMemo(
    () => myRooms.filter((room) => `${room.name} ${room.topic ?? ""}`.toLowerCase().includes(query.toLowerCase())),
    [myRooms, query]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Study rooms</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Discover public rooms, rejoin your groups, or open a fresh collaborative space.</p>
        </div>
        <CreateRoomModal />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Input placeholder="Search by room name or topic" value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex gap-3">
          <Input placeholder="Invite code" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await joinRoomByCode(inviteCode.trim());

                if (result.error) {
                  toast.error(result.error);
                  return;
                }

                window.location.href = `/dashboard/rooms/${result.data?.id}`;
              })
            }
          >
            Join
          </Button>
        </div>
      </div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Rooms</TabsTrigger>
          <TabsTrigger value="mine">My Rooms</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredAll.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onJoin={async (roomId) => {
                const result = await joinRoom(roomId);

                if (result.error) {
                  toast.error(result.error);
                  return;
                }

                window.location.href = `/dashboard/rooms/${roomId}`;
              }}
            />
          ))}
        </TabsContent>
        <TabsContent value="mine" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredMine.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}