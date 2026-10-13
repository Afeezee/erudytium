"use client";

import DOMPurify from "dompurify";
import { upload } from "@vercel/blob/client";
import { Crown, Loader2, MoreHorizontal, Paperclip, Pin, Shield, SmilePlus, UserMinus, UserRoundCheck, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Channel, PresenceChannel } from "pusher-js";
import { getPusherClient } from "@/lib/pusher/client";
import { MESSAGE_UPLOAD_PREFIX } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  deleteMessage,
  ensureRoomUploadPermission,
  getOlderMessages,
  joinRoom,
  kickMember,
  leaveRoom,
  muteMember,
  pinMessage,
  promoteToModerator,
  sendMessage
} from "@/lib/actions/rooms";
import type { Message, Resource, RoomMember, StudyRoom, User } from "@/types";

interface RoomExperienceProps {
  room: StudyRoom;
  currentUser: User;
  members: RoomMember[];
  messages: Message[];
  shareableResources: Resource[];
}

const EMOJIS = ["😀", "🔥", "📚", "✅", "🧠", "💡", "🎯", "📝"];
const URL_SPLIT_PATTERN = /(https?:\/\/[^\s]+)/g;
const URL_SEGMENT_PATTERN = /^https?:\/\/[^\s]+$/;

const mergeMessages = (current: Message[], incoming: Message[]) => {
  const messageMap = new Map(current.map((message) => [message.id, message]));

  for (const message of incoming) {
    const existingMessage = messageMap.get(message.id);
    messageMap.set(
      message.id,
      existingMessage
        ? {
            ...existingMessage,
            ...message,
            user: message.user ?? existingMessage.user ?? null
          }
        : message
    );
  }

  return [...messageMap.values()].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
};

const renderMessageContent = (content: string) =>
  content.split(URL_SPLIT_PATTERN).map((segment, index) => {
    if (!segment) return null;
    if (URL_SEGMENT_PATTERN.test(segment)) {
      return (
        <a
          key={`${segment}-${index}`}
          href={segment}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {segment}
        </a>
      );
    }
    return <span key={`${segment}-${index}`}>{segment}</span>;
  });

const sanitizeAttachmentFileName = (fileName: string) => {
  const trimmed = fileName.trim().toLowerCase();
  const extension = trimmed.includes(".") ? trimmed.split(".").pop() ?? "bin" : "bin";
  const baseName = trimmed.replace(/\.[^/.]+$/, "");
  const safeBase = baseName.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "attachment";
  const safeExt = extension.replace(/[^a-z0-9]+/g, "") || "bin";
  return `${safeBase}.${safeExt}`;
};

export function RoomExperience({ room, currentUser, members, messages: initialMessages, shareableResources }: RoomExperienceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [studySeconds, setStudySeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isEmojiDialogOpen, setIsEmojiDialogOpen] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [countdownNow, setCountdownNow] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mentionIndex] = useState(0);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingThrottleRef = useRef<number>(0);
  const channelRef = useRef<Channel | PresenceChannel | null>(null);

  const currentMember = members.find((member) => member.user_id === currentUser.id);
  const isManager = currentMember ? ["owner", "moderator"].includes(currentMember.role) : false;
  const isOwner = currentMember?.role === "owner";
  const canParticipate = Boolean(currentMember);
  const isMuted = currentMember?.is_muted ?? false;
  const pinnedMessages = messages.filter((message) => message.is_pinned);

  const mentionQuery = draft.split(/\s/).pop()?.startsWith("@") ? draft.split(/\s/).pop()?.slice(1).toLowerCase() ?? "" : "";
  const mentionCandidates = useMemo(
    () => members.filter((member) => (member.user?.name ?? "").toLowerCase().includes(mentionQuery) && member.user_id !== currentUser.id),
    [members, mentionQuery, currentUser.id]
  );
  const filteredResources = useMemo(
    () =>
      shareableResources
        .filter((resource) => resource.title.toLowerCase().includes(shareQuery.toLowerCase()))
        .slice(0, 8),
    [shareableResources, shareQuery]
  );

  const resolveMessageUser = (message: Message) =>
    message.user ??
    members.find((member) => member.user_id === message.user_id)?.user ??
    (message.user_id === currentUser.id
      ? { id: currentUser.id, name: currentUser.name, avatar_url: currentUser.avatar_url }
      : null);

  const upsertMessages = (incoming: Message[]) => {
    setMessages((current) => mergeMessages(current, incoming.map((message) => ({ ...message, user: resolveMessageUser(message) }))));
  };

  const removeMessageFromState = (messageId: string) => {
    setMessages((current) => current.filter((message) => message.id !== messageId));
  };

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setStudySeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    upsertMessages(initialMessages);
  }, [currentUser.avatar_url, currentUser.id, currentUser.name, initialMessages, members]);

  useEffect(() => {
    setCountdownNow(Date.now());
    const interval = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, []);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    if (!canParticipate) return;

    const pusher = getPusherClient();
    const channelName = `presence-room-${room.id}`;
    const channel = pusher.subscribe(channelName) as PresenceChannel;
    channelRef.current = channel;

    const handleMessageNew = (payload: Message) => {
      upsertMessages([payload]);
      const viewport = scrollViewportRef.current;
      if (viewport && viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 140) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };

    const handleMessageUpdated = (payload: Message) => upsertMessages([payload]);
    const handleMessageDeleted = (payload: { id: string }) => removeMessageFromState(payload.id);
    const handleTypingEvent = (payload: { name: string; userId: string }) => {
      if (payload.userId === currentUser.id) return;
      setTypingUser(payload.name);
      window.clearTimeout(typingTimeoutRef.current ?? undefined);
      typingTimeoutRef.current = window.setTimeout(() => setTypingUser(null), 2000);
    };

    const syncPresence = () => {
      const presenceChannel = channelRef.current as PresenceChannel | null;
      if (!presenceChannel?.members) return;
      const ids: string[] = [];
      presenceChannel.members.each((member: { id: string }) => ids.push(member.id));
      setOnlineUserIds(ids);
    };

    channel.bind("message:new", handleMessageNew);
    channel.bind("message:updated", handleMessageUpdated);
    channel.bind("message:deleted", handleMessageDeleted);
    channel.bind("client-typing", handleTypingEvent);
    channel.bind("pusher:subscription_succeeded", syncPresence);
    channel.bind("pusher:member_added", syncPresence);
    channel.bind("pusher:member_removed", syncPresence);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      channelRef.current = null;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [canParticipate, currentUser.id, room.id]);

  const examCountdown = useMemo(() => {
    if (!room.exam_date || countdownNow === null) return null;
    const diff = new Date(room.exam_date).getTime() - countdownNow;
    if (diff <= 0) return "Exam time";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }, [countdownNow, room.exam_date]);

  const focusComposer = () => {
    requestAnimationFrame(() => {
      const composer = composerRef.current;
      if (!composer) return;
      composer.focus();
      const cursorPosition = composer.value.length;
      composer.setSelectionRange(cursorPosition, cursorPosition);
    });
  };

  const scrollToBottom = () => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  const handleTogglePin = async (message: Message) => {
    const result = await pinMessage(message.id);
    if (result.error || !result.data) {
      toast.error(result.error ?? "Unable to update pin status.");
      return;
    }
    upsertMessages([{ ...result.data, user: message.user ?? result.data.user ?? null }]);
  };

  const handleDeleteMessage = async (message: Message) => {
    const result = await deleteMessage(message.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    removeMessageFromState(message.id);
  };

  const sendCurrentMessage = () => {
    if (!canParticipate) {
      toast.error("Join the room before sending messages.");
      return;
    }
    if (isMuted) {
      toast.error("You are muted in this room.");
      return;
    }
    if (!draft.trim() && !attachmentUrl) return;

    startTransition(async () => {
      const sanitized = DOMPurify.sanitize(draft, { ALLOWED_TAGS: [] }).trim();
      const content = sanitized || (attachmentUrl ? "Shared an attachment" : "");
      const result = await sendMessage(room.id, content, attachmentUrl ?? undefined);
      if (result.error || !result.data) {
        toast.error(result.error ?? "Unable to send message.");
        return;
      }
      upsertMessages([result.data]);
      setDraft("");
      setAttachmentUrl(null);
      scrollToBottom();
      focusComposer();
    });
  };

  const uploadAttachment = async (file: File) => {
    if (!canParticipate || isMuted) {
      toast.error(canParticipate ? "You are muted in this room." : "Join the room before sharing attachments.");
      return;
    }

    setAttachmentUploading(true);
    const permission = await ensureRoomUploadPermission(room.id);
    if (permission.error) {
      toast.error(permission.error);
      setAttachmentUploading(false);
      return;
    }

    try {
      const pathname = `${MESSAGE_UPLOAD_PREFIX}${room.id}/${Date.now()}-${sanitizeAttachmentFileName(file.name)}`;
      const blob = await upload(pathname, file, {
        access: "public",
        handleUploadUrl: "/api/upload/room-attachment",
        contentType: file.type || "application/octet-stream"
      });
      setAttachmentUrl(blob.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attachment upload failed.");
    } finally {
      setAttachmentUploading(false);
      focusComposer();
    }
  };

  const handleTyping = () => {
    if (!canParticipate || isMuted) return;
    const channel = channelRef.current;
    if (!channel) return;
    const nowMs = Date.now();
    if (nowMs - typingThrottleRef.current < 1500) return;
    typingThrottleRef.current = nowMs;
    try {
      channel.trigger("client-typing", {
        name: currentUser.name ?? currentUser.email,
        userId: currentUser.id
      });
    } catch {
      // client events require presence/private channels — silently ignore if blocked.
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
      <div className="order-2 space-y-6 xl:order-1">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-display text-xl font-semibold">Pinned messages</h2>
            <div className="space-y-3">
              {pinnedMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  className="w-full rounded-2xl border border-border p-3 text-left text-sm transition hover:border-accent"
                  onClick={() =>
                    document.getElementById(`message-${message.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                >
                  <div className="flex items-center gap-2 font-medium text-accent">
                    <Pin className="h-4 w-4" /> {message.user?.name ?? "Member"}
                  </div>
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
              <Button variant="outline" onClick={() => setTimerRunning((value) => !value)}>
                {timerRunning ? "Pause" : "Start"}
              </Button>
              <Button variant="ghost" onClick={() => setStudySeconds(0)}>
                Reset
              </Button>
            </div>
            {examCountdown ? (
              <div className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">Exam countdown: {examCountdown}</div>
            ) : null}

            <div className="space-y-4 border-t border-border/70 pt-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">Online members</h3>
                <Badge variant="neutral">
                  {onlineUserIds.length}/{members.length} online
                </Badge>
              </div>
              <div className="space-y-3 xl:max-h-[32rem] xl:overflow-y-auto xl:pr-1">
                {members.map((member) => {
                  const isOnline = onlineUserIds.includes(member.user_id);
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar>
                            <AvatarImage src={member.user?.avatar_url ?? undefined} alt={member.user?.name ?? "Member"} />
                            <AvatarFallback>{member.user?.name?.slice(0, 1) ?? "M"}</AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${isOnline ? "bg-success" : "bg-neutral-400"}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 font-medium">
                            <span className="truncate">{member.user?.name ?? "Member"}</span>
                            {member.role === "owner" ? <Crown className="h-4 w-4 text-warning" /> : null}
                            {member.role === "moderator" ? <Shield className="h-4 w-4 text-accent" /> : null}
                          </div>
                          <p className="text-xs text-neutral-500">{isOnline ? "Online" : "Offline"}</p>
                        </div>
                      </div>
                      {isManager && member.user_id !== currentUser.id ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="shrink-0">•••</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void muteMember(room.id, member.user_id)}>
                              <VolumeX className="mr-2 h-4 w-4" />
                              {member.is_muted ? "Unmute" : "Mute"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void kickMember(room.id, member.user_id)}>
                              <UserMinus className="mr-2 h-4 w-4" />Kick
                            </DropdownMenuItem>
                            {isOwner && member.role === "member" ? (
                              <DropdownMenuItem onClick={() => void promoteToModerator(room.id, member.user_id)}>
                                <UserRoundCheck className="mr-2 h-4 w-4" />Promote to moderator
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="order-1 space-y-4 xl:order-2">
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
                {isOwner && room.invite_code ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/dashboard/rooms/${room.id}?code=${room.invite_code}`
                      )
                    }
                  >
                    Share invite code
                  </Button>
                ) : null}
                {canParticipate ? (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await leaveRoom(room.id);
                      window.location.href = "/dashboard/rooms";
                    }}
                  >
                    Leave room
                  </Button>
                ) : !room.is_private ? (
                  <Button
                    onClick={() =>
                      startTransition(async () => {
                        const result = await joinRoom(room.id);
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        router.refresh();
                      })
                    }
                    disabled={isPending}
                  >
                    {isPending ? "Joining..." : "Join room"}
                  </Button>
                ) : null}
              </div>
            </div>

            {!canParticipate ? (
              <div className="rounded-2xl border border-border bg-warning/10 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-200">
                <p className="font-semibold text-foreground">Preview mode</p>
                <p className="mt-1">Join this public room to send messages, share files, appear online, and use live collaboration tools.</p>
              </div>
            ) : null}

            {isMuted ? (
              <div className="rounded-2xl border border-border bg-warning/10 px-4 py-3 text-sm text-neutral-700 dark:text-neutral-200">
                <p className="font-semibold text-foreground">Messaging paused</p>
                <p className="mt-1">You are muted in this room. You can still read messages, but sending is disabled until a manager unmutes you.</p>
              </div>
            ) : null}

            <ScrollArea className="h-[50vh] rounded-[2rem] border border-border bg-white/50 md:h-[58vh] xl:h-[68vh] dark:bg-neutral-950/40">
              <div
                ref={scrollViewportRef}
                className="h-[50vh] space-y-4 overflow-y-auto p-4 md:h-[58vh] xl:h-[68vh]"
                onScroll={async (event) => {
                  const viewport = event.currentTarget;
                  setShowScrollToBottom(viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 220);

                  if (viewport.scrollTop < 50 && messages.length > 0) {
                    const before = messages[0].created_at;
                    const result = await getOlderMessages(room.id, before);
                    if (result.data?.length) {
                      const previousHeight = viewport.scrollHeight;
                      upsertMessages(result.data);
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
                  const canPinMessage = isManager;
                  const canDeleteMessage = isManager || message.user_id === currentUser.id;
                  const hasMessageActions = canPinMessage || canDeleteMessage;

                  return (
                    <div
                      key={message.id}
                      id={`message-${message.id}`}
                      className="group flex items-start gap-3"
                      onContextMenu={(event) => event.preventDefault()}
                    >
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
                            <RelativeTime value={message.created_at} className="text-xs text-neutral-500" />
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                          {renderMessageContent(message.content)}
                        </p>
                        {message.file_url ? (
                          <a
                            href={message.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                          >
                            Open attachment
                          </a>
                        ) : null}
                      </div>
                      {hasMessageActions ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                              aria-label="Message actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canPinMessage ? (
                              <DropdownMenuItem onClick={() => void handleTogglePin(message)}>
                                {message.is_pinned ? "Unpin message" : "Pin message"}
                              </DropdownMenuItem>
                            ) : null}
                            {canDeleteMessage ? (
                              <DropdownMenuItem onClick={() => void handleDeleteMessage(message)}>Delete message</DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <div className="w-10 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {typingUser ? <p className="text-sm text-neutral-500">{typingUser} is typing...</p> : null}
            {showScrollToBottom ? (
              <Button
                variant="outline"
                className="self-end"
                onClick={() => {
                  const viewport = scrollViewportRef.current;
                  if (viewport) viewport.scrollTop = viewport.scrollHeight;
                }}
              >
                Scroll to bottom
              </Button>
            ) : null}

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
                ref={composerRef}
                value={draft}
                rows={1}
                maxLength={4000}
                disabled={!canParticipate || isMuted || isPending}
                className="max-h-40 min-h-[52px] w-full resize-none bg-transparent text-sm outline-none"
                placeholder={
                  !canParticipate
                    ? "Join the room to participate in chat"
                    : isMuted
                      ? "You are muted in this room"
                      : "Type a message, use @ to mention a member, Shift+Enter for a new line"
                }
                onChange={(event) => {
                  setDraft(event.target.value);
                  handleTyping();
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => document.getElementById("room-attachment")?.click()}
                    disabled={attachmentUploading}
                  >
                    {attachmentUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <Dialog open={isEmojiDialogOpen} onOpenChange={setIsEmojiDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Open emoji picker">
                        <SmilePlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Pick an emoji</DialogTitle>
                        <DialogDescription>Add a quick reaction or visual cue to your current message draft.</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-4 gap-3 pt-4">
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            className="rounded-2xl bg-neutral-100 p-4 text-2xl dark:bg-neutral-900"
                            onClick={() => {
                              setDraft((current) => `${current}${emoji}`);
                              setIsEmojiDialogOpen(false);
                              focusComposer();
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={isShareDialogOpen}
                    onOpenChange={(open) => {
                      setIsShareDialogOpen(open);
                      if (!open) {
                        setShareQuery("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">Share resource</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share a library resource</DialogTitle>
                        <DialogDescription>Search approved library resources and insert a share link into the room chat.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input placeholder="Search resources" value={shareQuery} onChange={(event) => setShareQuery(event.target.value)} />
                        <div className="space-y-3">
                          {filteredResources.map((resource) => (
                            <button
                              key={resource.id}
                              type="button"
                              className="w-full rounded-2xl border border-border px-4 py-3 text-left transition hover:border-accent"
                              onClick={() => {
                                const resourceLink = `${window.location.origin}/dashboard/library/${resource.id}`;
                                setDraft((current) => {
                                  const separator = current.trim().length > 0 && !current.endsWith("\n") ? "\n" : "";
                                  return `${current}${separator}Study resource: ${resource.title} ${resourceLink}`;
                                });
                                setShareQuery("");
                                setIsShareDialogOpen(false);
                                focusComposer();
                              }}
                            >
                              <p className="font-medium">{resource.title}</p>
                              <p className="text-sm text-neutral-500">{resource.category?.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Button onClick={sendCurrentMessage} disabled={isPending || !canParticipate || isMuted}>
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
