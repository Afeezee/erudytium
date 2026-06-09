import { useAuth } from "@clerk/nextjs";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RoomExperience } from "@/components/rooms/RoomExperience";
import {
  createMessageAttachmentUploadUrl,
  deleteMessage,
  getOlderMessages,
  joinRoom,
  kickMember,
  leaveRoom,
  muteMember,
  pinMessage,
  promoteToModerator,
  sendMessage
} from "@/lib/actions/rooms";
import { createClient } from "@/lib/supabase/client";
import type { Message, Resource, RoomMember, StudyRoom, User } from "@/types";

jest.mock("@clerk/nextjs", () => ({
  useAuth: jest.fn()
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() })
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn()
  }
}));

jest.mock("dompurify", () => ({
  __esModule: true,
  default: {
    sanitize: (value: string) => value
  }
}));

jest.mock("@/components/ui/RelativeTime", () => ({
  RelativeTime: ({ value, className }: { value: string | Date; className?: string }) => <time className={className}>{String(value)}</time>
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>
}));

jest.mock("@/components/ui/dialog", () => {
  const React = require("react");
  const DialogContext = React.createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

  const composeClickHandlers = (original?: (event: React.MouseEvent) => void, next?: () => void) => (event: React.MouseEvent) => {
    original?.(event);

    if (!event.defaultPrevented) {
      next?.();
    }
  };

  const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const resolvedOpen = open ?? internalOpen;
    const setOpen = (nextOpen: boolean) => {
      if (open === undefined) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    };

    return <DialogContext.Provider value={{ open: resolvedOpen, setOpen }}>{children}</DialogContext.Provider>;
  };

  const DialogTrigger = ({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) => {
    const context = React.useContext(DialogContext);

    if (!context) {
      return children;
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: composeClickHandlers(children.props.onClick, () => context.setOpen(true))
      });
    }

    return <button type="button" onClick={() => context.setOpen(true)}>{children}</button>;
  };

  const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const context = React.useContext(DialogContext);

    if (!context?.open) {
      return null;
    }

    return <div role="dialog" className={className}>{children}</div>;
  };

  const DialogHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const DialogTitle = ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>;
  const DialogDescription = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;

  return { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription };
});

jest.mock("@/components/ui/dropdown-menu", () => {
  const React = require("react");
  const DropdownContext = React.createContext<{ open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>> } | null>(null);

  const composeClickHandlers = (original?: (event: React.MouseEvent) => void, next?: () => void) => (event: React.MouseEvent) => {
    original?.(event);

    if (!event.defaultPrevented) {
      next?.();
    }
  };

  const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
    const [open, setOpen] = React.useState(false);
    return <DropdownContext.Provider value={{ open, setOpen }}>{children}</DropdownContext.Provider>;
  };

  const DropdownMenuTrigger = ({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) => {
    const context = React.useContext(DropdownContext);

    if (!context) {
      return children;
    }

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: composeClickHandlers(children.props.onClick, () => context.setOpen((current: boolean) => !current))
      });
    }

    return <button type="button" onClick={() => context.setOpen((current: boolean) => !current)}>{children}</button>;
  };

  const DropdownMenuContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const context = React.useContext(DropdownContext);

    if (!context?.open) {
      return null;
    }

    return <div className={className}>{children}</div>;
  };

  const DropdownMenuItem = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
    const context = React.useContext(DropdownContext);

    return (
      <button
        type="button"
        onClick={() => {
          onClick?.();
          context?.setOpen(false);
        }}
      >
        {children}
      </button>
    );
  };

  return { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
});

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn()
}));

jest.mock("@/lib/actions/rooms", () => ({
  createMessageAttachmentUploadUrl: jest.fn(),
  deleteMessage: jest.fn(),
  getOlderMessages: jest.fn(),
  joinRoom: jest.fn(),
  kickMember: jest.fn(),
  leaveRoom: jest.fn(),
  muteMember: jest.fn(),
  pinMessage: jest.fn(),
  promoteToModerator: jest.fn(),
  sendMessage: jest.fn()
}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedCreateClient = jest.mocked(createClient);
const mockedCreateMessageAttachmentUploadUrl = jest.mocked(createMessageAttachmentUploadUrl);
const mockedDeleteMessage = jest.mocked(deleteMessage);
const mockedGetOlderMessages = jest.mocked(getOlderMessages);
const mockedJoinRoom = jest.mocked(joinRoom);
const mockedKickMember = jest.mocked(kickMember);
const mockedLeaveRoom = jest.mocked(leaveRoom);
const mockedMuteMember = jest.mocked(muteMember);
const mockedPinMessage = jest.mocked(pinMessage);
const mockedPromoteToModerator = jest.mocked(promoteToModerator);
const mockedSendMessage = jest.mocked(sendMessage);

const mockRealtimeHandlers: Partial<Record<"INSERT" | "UPDATE" | "DELETE", (payload: any) => void>> = {};
const mockTrack = jest.fn().mockResolvedValue(undefined);
const mockSend = jest.fn();
const mockPresenceState = jest.fn(() => ({}));
const mockUnsubscribe = jest.fn().mockResolvedValue(undefined);
const mockRemoveChannel = jest.fn();

const currentUser: User = {
  id: "user-1",
  clerk_id: "clerk-user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "student",
  department: "Engineering",
  level: "400",
  bio: null,
  avatar_url: null,
  is_active: true,
  user_preferences: {
    mentionAlerts: true,
    resourceAlerts: true,
    requestUpdates: true,
    emailDigests: false
  },
  created_at: "2026-01-01T00:00:00.000Z"
};

const otherUser: User = {
  id: "user-2",
  clerk_id: "clerk-user-2",
  name: "Grace Hopper",
  email: "grace@example.com",
  role: "student",
  department: "Engineering",
  level: "400",
  bio: null,
  avatar_url: null,
  is_active: true,
  user_preferences: {
    mentionAlerts: true,
    resourceAlerts: true,
    requestUpdates: true,
    emailDigests: false
  },
  created_at: "2026-01-01T00:00:00.000Z"
};

const room: StudyRoom = {
  id: "room-1",
  name: "Distributed Systems",
  description: "Study room",
  topic: "Systems",
  is_private: false,
  invite_code: null,
  created_by: currentUser.id,
  exam_date: null,
  created_at: "2026-01-01T00:00:00.000Z"
};

const members: RoomMember[] = [
  {
    id: "member-1",
    room_id: room.id,
    user_id: currentUser.id,
    role: "owner",
    is_muted: false,
    joined_at: "2026-01-01T00:00:00.000Z",
    user: { id: currentUser.id, name: currentUser.name, avatar_url: currentUser.avatar_url, email: currentUser.email }
  },
  {
    id: "member-2",
    room_id: room.id,
    user_id: otherUser.id,
    role: "member",
    is_muted: false,
    joined_at: "2026-01-01T00:00:00.000Z",
    user: { id: otherUser.id, name: otherUser.name, avatar_url: otherUser.avatar_url, email: otherUser.email }
  }
];

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "message-1",
  room_id: room.id,
  user_id: otherUser.id,
  content: "Remote moderation target",
  file_url: null,
  is_pinned: false,
  created_at: "2026-01-02T00:00:00.000Z",
  user: { id: otherUser.id, name: otherUser.name, avatar_url: otherUser.avatar_url },
  ...overrides
});

const shareableResources: Resource[] = [];

const renderRoomExperience = (messages: Message[] = [makeMessage()]) =>
  render(
    <RoomExperience
      room={room}
      currentUser={currentUser}
      members={members}
      messages={messages}
      shareableResources={shareableResources}
    />
  );

describe("RoomExperience", () => {
  beforeAll(() => {
    Object.defineProperty(window, "PointerEvent", {
      writable: true,
      value: MouseEvent
    });

    Object.defineProperty(window, "requestAnimationFrame", {
      writable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
    });

    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    mockedUseAuth.mockReturnValue({ getToken: jest.fn().mockResolvedValue("test-token") } as ReturnType<typeof useAuth>);
    mockedCreateMessageAttachmentUploadUrl.mockReset();
    mockedDeleteMessage.mockReset();
    mockedGetOlderMessages.mockReset();
    mockedJoinRoom.mockReset();
    mockedKickMember.mockReset();
    mockedLeaveRoom.mockReset();
    mockedMuteMember.mockReset();
    mockedPinMessage.mockReset();
    mockedPromoteToModerator.mockReset();
    mockedSendMessage.mockReset();
    mockTrack.mockClear();
    mockSend.mockClear();
    mockPresenceState.mockClear();
    mockUnsubscribe.mockClear();
    mockRemoveChannel.mockClear();
    mockedGetOlderMessages.mockResolvedValue({ data: [] });

    for (const key of Object.keys(mockRealtimeHandlers)) {
      delete mockRealtimeHandlers[key as keyof typeof mockRealtimeHandlers];
    }

    mockedCreateClient.mockImplementation(() => {
      const channel = {
        on: jest.fn((type: string, config: { event?: string }, callback: (payload: any) => void) => {
          if (type === "postgres_changes" && config.event && ["INSERT", "UPDATE", "DELETE"].includes(config.event)) {
            mockRealtimeHandlers[config.event as "INSERT" | "UPDATE" | "DELETE"] = callback;
          }

          return channel;
        }),
        subscribe: jest.fn((callback?: (status: string) => void) => {
          callback?.("SUBSCRIBED");
          return channel;
        }),
        unsubscribe: mockUnsubscribe,
        track: mockTrack,
        send: mockSend,
        presenceState: mockPresenceState
      };

      return {
        channel: jest.fn(() => channel),
        removeChannel: mockRemoveChannel,
        storage: {
          from: jest.fn(() => ({
            uploadToSignedUrl: jest.fn(),
            getPublicUrl: jest.fn(() => ({ data: { publicUrl: "https://example.com/uploaded-file" } }))
          }))
        }
      } as ReturnType<typeof createClient>;
    });
  });

  it("shows message actions, updates pin and delete immediately, and closes the emoji picker after selection", async () => {
    const targetMessage = makeMessage();
    mockedPinMessage.mockResolvedValue({ data: { ...targetMessage, is_pinned: true } });
    mockedDeleteMessage.mockResolvedValue({ data: null });

    renderRoomExperience([targetMessage]);

    fireEvent.click(screen.getByRole("button", { name: /open emoji picker/i }));
    expect(screen.getByText("Pick an emoji")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "😀" }));

    await waitFor(() => {
      expect(screen.queryByText("Pick an emoji")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("textbox")).toHaveValue("😀");

    fireEvent.click(screen.getByRole("button", { name: /message actions/i }));
    expect(screen.getByRole("button", { name: "Pin message" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete message" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pin message" }));

    await waitFor(() => {
      expect(mockedPinMessage).toHaveBeenCalledWith(targetMessage.id);
    });

    await waitFor(() => {
      expect(screen.getAllByText(targetMessage.content)).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole("button", { name: /message actions/i }));
    expect(screen.getByRole("button", { name: "Unpin message" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete message" }));

    await waitFor(() => {
      expect(mockedDeleteMessage).toHaveBeenCalledWith(targetMessage.id);
    });

    await waitFor(() => {
      expect(screen.queryByText(targetMessage.content)).not.toBeInTheDocument();
    });
  });

  it("applies realtime update and delete events without a refresh", async () => {
    const targetMessage = makeMessage({ content: "Realtime sync target" });
    renderRoomExperience([targetMessage]);

    expect(mockRealtimeHandlers.UPDATE).toBeDefined();
    expect(mockRealtimeHandlers.DELETE).toBeDefined();

    await act(async () => {
      mockRealtimeHandlers.UPDATE?.({ new: { ...targetMessage, is_pinned: true } });
    });

    await waitFor(() => {
      expect(screen.getAllByText(targetMessage.content)).toHaveLength(2);
    });

    await act(async () => {
      mockRealtimeHandlers.DELETE?.({ old: { id: targetMessage.id } });
    });

    await waitFor(() => {
      expect(screen.queryByText(targetMessage.content)).not.toBeInTheDocument();
    });
  });
});