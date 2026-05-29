"use client";

import DOMPurify from "dompurify";
import { Crown, Loader2, Paperclip, Pin, Shield, SmilePlus, UserMinus, UserRoundCheck, VolumeX } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MESSAGE_BUCKET } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { deleteMessage, getOlderMessages, kickMember, leaveRoom, muteMember, pinMessage, promoteToModerator, sendMessage } from "@/lib/actions/rooms";
import { formatRelativeTime } from "@/lib/utils";
import type { Message, Resource, RoomMember, StudyRoom, User } from "@/types";

interface RoomExperienceProps {
  room: StudyRoom;
  currentUser: User;
  members: RoomMember[];
  messages: Message[];
  shareableResources: Resource[];
}

const EMOJIS = ["😀", "🔥", "📚", "✅", "🧠", "💡", "🎯", "📝"];

export function RoomExperience({ room, currentUser, members, messages: initialMessages, shareableResources }: RoomExperienceProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [studySeconds, setStudySeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [shareQuery, setShareQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [mentionIndex, setMentionIndex] = useState(0);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const currentMember = members.find((member) => member.user_id === currentUser.id);
  const isManager = currentMember ? ["owner", "moderator"].includes(currentMember.role) : false;
  const isOwner = currentMember?.role === "owner";
  const pinnedMessages = messages.filter((message) => message.is_pinned);

  const mentionQuery = draft.split(/\s/).pop()?.startsWith("@") ? draft.split(/\s/).pop()?.slice(1).toLowerCase() ?? "" : "";
  const mentionCandidates = useMemo(
    () => members.filter((member) => (member.user?.name ?? "").toLowerCase().includes(mentionQuery) && member.user_id !== currentUser.id),
    [members, mentionQuery, currentUser.id]
  );
  const filteredResources = useMemo(
    () => shareableResources.filter((resource) => resource.title.toLowerCase().includes(shareQuery.toLowerCase())).slice(0, 8),
    [shareableResources, shareQuery]
  );

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setStudySeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupRealtime = async () => {
      const token = await getToken({ skipCache: true });
      const supabase = createClient(token ?? undefined);
      const channel = supabase
        .channel(`room:${room.id}`, {
          config: {
            presence: { key: currentUser.id },
            broadcast: { self: false }
          }
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `room_id=eq.${room.id}`
          },
          (payload) => {
            const message = payload.new as Message;
            setMessages((current) => {
              if (current.some((item) => item.id === message.id)) {
                return current;
              }

              return [...current, message];
            });
            const viewport = scrollViewportRef.current;
            if (viewport && viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 140) {
              viewport.scrollTop = viewport.scrollHeight;
            }
          }
        )
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          setTypingUser(payload.name as string);
          window.clearTimeout(typingTimeoutRef.current ?? undefined);
          typingTimeoutRef.current = window.setTimeout(() => setTypingUser(null), 2000);
        })
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          setOnlineUserIds(Object.keys(state));
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ userId: currentUser.id, name: currentUser.name ?? currentUser.email });
          }
        });

      channelRef.current = channel;
      unsubscribe = () => {
        channel.unsubscribe();
      };
    };

    void setupRealtime();

    return () => unsubscribe?.();
  }, [currentUser.email, currentUser.id, currentUser.name, getToken, room.id]);

  const examCountdown = useMemo(() => {
    if (!room.exam_date) return null;
    const diff = new Date(room.exam_date).getTime() - Date.now();
    if (diff <= 0) return "Exam time";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }, [room.exam_date, messages.length, studySeconds]);

  const sendCurrentMessage = () => {
    if (!draft.trim() && !attachmentUrl) return;

    startTransition(async () => {
      const sanitized = DOMPurify.sanitize(draft, { ALLOWED_TAGS: [] }).trim();
      const result = await sendMessage(room.id, sanitized || (attachmentUrl ? "Shared an attachment" : ""), attachmentUrl ?? undefined);

      if (result.error || !result.data) {
        toast.error(result.error ?? "Unable to send message.");
        return;
      }

      setMessages((current) => [...current, result.data!]);
      setDraft("");
      setAttachmentUrl(null);
      const viewport = scrollViewportRef.current;
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
  };

  const uploadAttachment = async (file: File) => {
    setAttachmentUploading(true);
    const token = await getToken({ skipCache: true });
    const supabase = createClient(token ?? undefined);
    const path = `${room.id}/${currentUser.id}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(MESSAGE_BUCKET).upload(path, file, { upsert: true });

    if (error) {
      toast.error(error.message);
      setAttachmentUploading(false);
      return;
    }

    const { data } = supabase.storage.from(MESSAGE_BUCKET).getPublicUrl(path);
    setAttachmentUrl(data.publicUrl);
    setAttachmentUploading(false);
  };

  const handleTyping = () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { name: currentUser.name ?? currentUser.email }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-display text-xl font-semibold">Pinned messages</h2>
            <div className="space-y-3">
              {pinnedMessages.map((message) => (
                <button key={message.id} type="button" className="w-full rounded-2xl border border-border p-3 text-left text-sm transition hover:border-accent" onClick={() => document.getElementById(`message-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
                  <div className="flex items-center gap-2 font-medium text-accent"><Pin className="h-4 w-4" /> {message.user?.name ?? "Member"}</div>
                  <p className="mt-2 line-clamp-3 text-neutral-600 dark:text-neutral-300">{message.content}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-display text-xl font-semibold">Study session</h2>
            <p className="text-4xl font-semibold tabular-nums">{new Date(studySeconds * 1000).toISOString().slice(11, 19)}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? "Pause" : "Start"}</Button>
              <Button variant="ghost" onClick={() => setStudySeconds(0)}>Reset</Button>
            </div>
            {examCountdown ? <div className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">Exam countdown: {examCountdown}</div> : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-3xl font-semibold">{room.name}</h1>
                  <Badge variant="accent">{room.topic ?? "General"}</Badge>
                </div>
                {examCountdown ? <p className="mt-2 text-sm text-neutral-500">Exam countdown: {examCountdown}</p> : null}
              </div>
              <div className="flex gap-3">
                {isOwner && room.invite_code ? <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/dashboard/rooms/${room.id}?code=${room.invite_code}`)}>Share invite code</Button> : null}
                <Button variant="ghost" onClick={async () => { await leaveRoom(room.id); window.location.href = "/dashboard/rooms"; }}>Leave room</Button>
              </div>
            </div>

            <ScrollArea className="h-[62vh] rounded-[2rem] border border-border bg-white/50 dark:bg-neutral-950/40">
              <div
                ref={scrollViewportRef}
                className="h-[62vh] space-y-4 overflow-y-auto p-4"
                onScroll={async (event) => {
                  const viewport = event.currentTarget;
                  setShowScrollToBottom(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 220);

                  if (viewport.scrollTop < 50 && messages.length > 0) {
                    const before = messages[0].created_at;
                    const result = await getOlderMessages(room.id, before);
                    if (result.data?.length) {
                      const previousHeight = viewport.scrollHeight;
                      setMessages((current) => [...result.data!, ...current.filter((item) => !result.data!.some((older) => older.id === item.id))]);
                      requestAnimationFrame(() => {
                        viewport.scrollTop = viewport.scrollHeight - previousHeight;
                      });
                    }
                  }
                }}
              >
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const grouped = previous?.user_id === message.user_id;

                  return (
                    <div key={message.id} id={`message-${message.id}`} className="group flex items-start gap-3" onContextMenu={(event) => event.preventDefault()}>
                      {!grouped ? (
                        <Avatar className="mt-1 h-10 w-10">
                          <AvatarImage src={message.user?.avatar_url ?? undefined} alt={message.user?.name ?? "Member"} />
                          <AvatarFallback>{message.user?.name?.slice(0, 1) ?? "M"}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-10" />
                      )}
                      <div className="flex-1 rounded-3xl border border-border bg-white/80 p-4 dark:bg-neutral-950/70">
                        {!grouped ? (
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{message.user?.name ?? "Member"}</span>
                              {message.is_pinned ? <Pin className="h-4 w-4 text-warning" /> : null}
                            </div>
                            <span className="text-xs text-neutral-500">{formatRelativeTime(new Date(message.created_at))}</span>
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{message.content}</p>
                        {message.file_url ? <a href={message.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">Open attachment</a> : null}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="opacity-0 transition group-hover:opacity-100">•••</button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isManager ? <DropdownMenuItem onClick={() => void pinMessage(message.id)}>{message.is_pinned ? "Unpin message" : "Pin message"}</DropdownMenuItem> : null}
                          {message.user_id === currentUser.id ? <DropdownMenuItem onClick={() => void deleteMessage(message.id)}>Delete message</DropdownMenuItem> : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {typingUser ? <p className="text-sm text-neutral-500">{typingUser} is typing...</p> : null}
            {showScrollToBottom ? <Button variant="outline" className="self-end" onClick={() => { const viewport = scrollViewportRef.current; if (viewport) viewport.scrollTop = viewport.scrollHeight; }}>Scroll to bottom</Button> : null}

            <div className="space-y-3 rounded-[2rem] border border-border bg-white/70 p-4 dark:bg-neutral-950/70">
              {mentionCandidates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {mentionCandidates.slice(0, 5).map((candidate, index) => (
                    <button
                      key={candidate.id}
                      type="button"
                      className={`rounded-full px-3 py-1 text-sm ${index === mentionIndex ? "bg-primary text-primary-foreground" : "bg-neutral-100 dark:bg-neutral-900"}`}
                      onClick={() => {
                        const parts = draft.split(/\s/);
                        parts[parts.length - 1] = `@${candidate.user?.name?.replace(/\s+/g, "")}`;
                        setDraft(`${parts.join(" ")} `);
                      }}
                    >
                      {candidate.user?.name}
                    </button>
                  ))}
                </div>
              ) : null}
              {attachmentUrl ? <div className="rounded-2xl bg-accent/10 px-3 py-2 text-sm text-accent">Attachment ready to send.</div> : null}
              <textarea
                value={draft}
                rows={1}
                maxLength={4000}
                className="max-h-40 min-h-[52px] w-full resize-none bg-transparent text-sm outline-none"
                placeholder="Type a message, use @ to mention a member, Shift+Enter for a new line"
                onChange={(event) => {
                  setDraft(event.target.value);
                  handleTyping();
                  event.currentTarget.style.height = "auto";
                  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendCurrentMessage();
                  }
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="room-attachment"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadAttachment(file);
                    }}
                  />
                  <Button variant="ghost" size="icon" onClick={() => document.getElementById("room-attachment")?.click()} disabled={attachmentUploading}>
                    {attachmentUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon"><SmilePlus className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Pick an emoji</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-4 gap-3 pt-4">
                        {EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" className="rounded-2xl bg-neutral-100 p-4 text-2xl dark:bg-neutral-900" onClick={() => setDraft((current) => `${current}${emoji}`)}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Share resource</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share a library resource</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input placeholder="Search resources" value={shareQuery} onChange={(event) => setShareQuery(event.target.value)} />
                        <div className="space-y-3">
                          {filteredResources.map((resource) => (
                            <button key={resource.id} type="button" className="w-full rounded-2xl border border-border px-4 py-3 text-left transition hover:border-accent" onClick={() => setDraft((current) => `${current}\nStudy resource: ${resource.title} ${window.location.origin}/dashboard/library/${resource.id}`.trim())}>
                              <p className="font-medium">{resource.title}</p>
                              <p className="text-sm text-neutral-500">{resource.category?.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Button onClick={sendCurrentMessage} disabled={isPending}>Send</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-display text-xl font-semibold">Online members</h2>
            <div className="space-y-3">
              {members.map((member) => {
                const isOnline = onlineUserIds.includes(member.user_id);

                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={member.user?.avatar_url ?? undefined} alt={member.user?.name ?? "Member"} />
                          <AvatarFallback>{member.user?.name?.slice(0, 1) ?? "M"}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${isOnline ? "bg-success" : "bg-neutral-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <span>{member.user?.name ?? "Member"}</span>
                          {member.role === "owner" ? <Crown className="h-4 w-4 text-warning" /> : null}
                          {member.role === "moderator" ? <Shield className="h-4 w-4 text-accent" /> : null}
                        </div>
                        <p className="text-xs text-neutral-500">{isOnline ? "Online" : "Offline"}</p>
                      </div>
                    </div>
                    {isManager && member.user_id !== currentUser.id ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">•••</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void muteMember(room.id, member.user_id)}><VolumeX className="mr-2 h-4 w-4" />{member.is_muted ? "Unmute" : "Mute"}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void kickMember(room.id, member.user_id)}><UserMinus className="mr-2 h-4 w-4" />Kick</DropdownMenuItem>
                          {isOwner && member.role === "member" ? <DropdownMenuItem onClick={() => void promoteToModerator(room.id, member.user_id)}><UserRoundCheck className="mr-2 h-4 w-4" />Promote to moderator</DropdownMenuItem> : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}