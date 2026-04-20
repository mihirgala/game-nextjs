"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

// ─── Send DM ──────────────────────────────────────────────────────────────────

export async function sendDM(receiverId: string, text: string) {
  const user = await getSession();

  const message = await prisma.message.create({
    data: {
      senderId: user.id,
      receiverId,
      text,
    },
    include: { sender: true },
  });

  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.sender.name,
    senderImage: message.sender.image,
    text: message.text ?? "",
    receiverId: message.receiverId,
    createdAt: message.createdAt.toISOString(),
  };
}

// ─── Get DMs ──────────────────────────────────────────────────────────────────

export async function getDMs(friendId: string) {
  const user = await getSession();

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: friendId },
        { senderId: friendId, receiverId: user.id },
      ],
    },
    include: { sender: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: m.sender.name,
    senderImage: m.sender.image,
    text: m.text ?? "",
    receiverId: m.receiverId,
    createdAt: m.createdAt.toISOString(),
  }));
}
