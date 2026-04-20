"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

// ─── Get Full Match History ───────────────────────────────────────────────────

export async function getMatchHistory() {
  const user = await getSession();

  const records = await prisma.matchPlayer.findMany({
    where: { userId: user.id },
    include: {
      match: {
        include: {
          players: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: { match: { playedAt: "desc" } },
    take: 50,
  });

  return records.map((r) => {
    const opponents = r.match.players.filter(
      (p) => p.userId !== user.id
    );
    return {
      matchId: r.matchId,
      game: r.match.game,
      playedAt: r.match.playedAt.toISOString(),
      isWinner: r.isWinner,
      score: r.score,
      opponents: opponents.map((o) => ({
        isBot: o.isBot,
        name: o.isBot ? "AI Bot" : (o.user?.name || "Unknown Player"),
        image: o.user?.image ?? null,
        userId: o.userId ?? null,
        isWinner: o.isWinner,
      })),
    };
  });
}

// ─── Get History vs Specific Opponent ────────────────────────────────────────

export async function getMatchHistoryVs(opponentId: string) {
  const user = await getSession();

  // Get matches where both user and opponent played
  const opponentMatches = await prisma.matchPlayer.findMany({
    where: { userId: opponentId },
    select: { matchId: true },
  });
  const matchIds = opponentMatches.map((m) => m.matchId);

  const records = await prisma.matchPlayer.findMany({
    where: {
      userId: user.id,
      matchId: { in: matchIds },
    },
    include: {
      match: {
        include: {
          players: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: { match: { playedAt: "desc" } },
  });

  return records.map((r) => ({
    matchId: r.matchId,
    game: r.match.game,
    playedAt: r.match.playedAt.toISOString(),
    isWinner: r.isWinner,
    score: r.score,
    opponents: r.match.players
      .filter((p) => p.userId !== user.id)
      .map((o) => ({
        isBot: o.isBot,
        name: o.isBot ? "AI Bot" : (o.user?.name || "Unknown Player"),
        image: o.user?.image ?? null,
        userId: o.userId ?? null,
        isWinner: o.isWinner,
      })),
  }));
}
// ─── Save Match Result ────────────────────────────────────────────────────────

export async function saveMatchResult(payload: {
  game: string;
  players: { userId: string | null; isBot: boolean; isWinner: boolean; score?: number }[];
}) {
  const user = await getSession();

  // Create the match record
  const match = await prisma.match.create({
    data: {
      game: payload.game,
      playedAt: new Date(),
    },
  });

  // Create match_player records for each player
  await prisma.matchPlayer.createMany({
    data: payload.players.map((p) => ({
      matchId: match.id,
      userId: p.userId,
      isBot: p.isBot,
      isWinner: p.isWinner,
      score: p.score ?? null,
    })),
  });

  return match;
}
