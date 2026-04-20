"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

// ─── Send Friend Request ──────────────────────────────────────────────────────

export async function sendFriendRequest(toId: string) {
  const user = await getSession();
  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromId: user.id, toId },
        { fromId: toId, toId: user.id },
      ],
    },
  });
  if (existing) return { error: "Request already exists" };

  const isFriend = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id: user.id, user2Id: toId },
        { user1Id: toId, user2Id: user.id },
      ],
    },
  });
  if (isFriend) return { error: "Already friends" };

  const request = await prisma.friendRequest.create({
    data: { fromId: user.id, toId, status: "pending" },
    include: { from: true, to: true },
  });

  revalidatePath("/");
  return { success: true, request };
}

// ─── Accept Friend Request ────────────────────────────────────────────────────

export async function acceptFriendRequest(requestId: string) {
  const user = await getSession();
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.toId !== user.id) return { error: "Not found" };

  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    }),
    prisma.friendship.create({
      data: {
        user1Id: request.fromId,
        user2Id: request.toId,
      },
    }),
  ]);

  revalidatePath("/");
  return { success: true };
}

// ─── Reject Friend Request ────────────────────────────────────────────────────

export async function rejectFriendRequest(requestId: string) {
  const user = await getSession();
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.toId !== user.id) return { error: "Not found" };

  await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "rejected" },
  });

  revalidatePath("/");
  return { success: true };
}

// ─── Remove Friend ────────────────────────────────────────────────────────────

export async function removeFriend(friendId: string) {
  const user = await getSession();

  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { user1Id: user.id, user2Id: friendId },
        { user1Id: friendId, user2Id: user.id },
      ],
    },
  });

  revalidatePath("/");
  return { success: true };
}

// ─── Get Friends ──────────────────────────────────────────────────────────────

export async function getFriends() {
  const user = await getSession();

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ user1Id: user.id }, { user2Id: user.id }],
    },
    include: {
      user1: {
        select: { id: true, name: true, email: true, image: true, isOnline: true }
      },
      user2: {
        select: { id: true, name: true, email: true, image: true, isOnline: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return friendships.map((f: any) => {
    const friend = f.user1Id === user.id ? f.user2 : f.user1;
    return {
      id: f.id,
      friend: {
        ...friend,
        // Fallback for names: email prefix or "Unknown Player"
        name: friend.name?.trim() || friend.email.split("@")[0] || "Unknown Player",
      },
      createdAt: f.createdAt.toISOString(),
    };
  });
}

// ─── Get Pending Requests ─────────────────────────────────────────────────────

export async function getPendingRequests() {
  const user = await getSession();

  const received = await prisma.friendRequest.findMany({
    where: { toId: user.id, status: "pending" },
    include: { from: true, to: true },
    orderBy: { createdAt: "desc" },
  });

  const sent = await prisma.friendRequest.findMany({
    where: { fromId: user.id, status: "pending" },
    include: { from: true, to: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    received: received.map((r) => ({
      id: r.id,
      from: {
        ...r.from,
        name: r.from.name?.trim() || r.from.email.split("@")[0] || "Unknown User"
      },
      to: r.to,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
    sent: sent.map((s) => ({
      id: s.id,
      from: s.from,
      to: {
        ...s.to,
        name: s.to.name?.trim() || s.to.email.split("@")[0] || "Unknown User"
      },
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

// ─── Find Users (search) ──────────────────────────────────────────────────────

export async function findUsers(query: string) {
  const user = await getSession();
  if (!query || query.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: user.id } },
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
      ],
    },
    take: 10,
    select: { id: true, name: true, email: true, image: true, isOnline: true },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return users.map(u => ({
    ...u,
    name: u.name?.trim() || u.email.split("@")[0] || "Unknown User"
  }));
}
