"use client";

import { atom } from "jotai";
import type { Socket } from "socket.io-client";

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string | null;
  text: string;
  createdAt: string; // ISO string
  invite?: {
    game: string;
    roomId: string;
  };
}

/** Global chat — in-memory for the session only, seeded by socket history */
export const globalChatAtom = atom<ChatMessage[]>([]);

/** Room chat — per game room, in-memory for the session only */
export const roomChatAtom = atom<Record<string, ChatMessage[]>>({});

// ─── Socket ──────────────────────────────────────────────────────────────────

export const socketAtom = atom<Socket | null>(null);

// ─── Friends ─────────────────────────────────────────────────────────────────

export interface FriendUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  isOnline: boolean;
}

export interface FriendshipRecord {
  id: string;
  friend: FriendUser;
  createdAt: string;
}

export interface FriendRequestRecord {
  id: string;
  from: FriendUser;
  to: FriendUser;
  status: string;
  createdAt: string;
}

export const friendsAtom = atom<FriendshipRecord[]>([]);
export const pendingRequestsAtom = atom<FriendRequestRecord[]>([]);
export const sentRequestsAtom = atom<FriendRequestRecord[]>([]);

// ─── Active DM ───────────────────────────────────────────────────────────────

export const activeDMAtom = atom<FriendUser | null>(null);

// ─── Navigation ──────────────────────────────────────────────────────────────
export type DashboardTab = "games" | "chat" | "social" | "records";
export const dashboardTabAtom = atom<DashboardTab>("games");
