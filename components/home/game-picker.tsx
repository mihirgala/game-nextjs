"use client";

import { useRouter } from "next/navigation";
import type { User } from "better-auth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircleDot, Dices, ArrowRight, Sparkles, Users } from "lucide-react";
import { useAtom } from "jotai";
import { socketAtom } from "@/lib/atoms";
import { nanoid } from "nanoid";

interface Game {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  available: boolean;
  players: string;
}

const GAMES: Game[] = [
  {
    id: "tictactoe",
    name: "Tic Tac Toe",
    description: "Battle for the grid in this classic 3x3 strategy game.",
    icon: CircleDot,
    color: "text-blue-500",
    available: true,
    players: "1v1",
  },
  {
    id: "ludo",
    name: "Ludo (Made with AI)",
    description: "Race your tokens across the board in this multiplayer classic.",
    icon: Dices,
    color: "text-orange-500",
    available: true,
    players: "2-4",
  },
  {
    id: "ludoMihir",
    name: "Ludo (Made by mihir)",
    description: "Race your tokens across the board in this multiplayer classic.",
    icon: Dices,
    color: "text-orange-500",
    available: true,
    players: "2-4",
  },
];

interface GamePickerProps {
  user: User;
}

export function GamePicker({ user }: GamePickerProps) {
  const router = useRouter();
  const [socket] = useAtom(socketAtom);

  const broadcastInvite = (gameId: string) => {
    if (!socket) return;
    const roomId = nanoid(10);
    const inviteMsg = {
      senderId: user.id,
      senderName: user.name ?? "Unknown",
      text: `🎮 Challenging everyone to a match of Tic Tac Toe! ⚔️`,
      createdAt: new Date().toISOString(),
      invite: {
        game: gameId,
        roomId: roomId
      }
    };
    (socket as any).emit("lobby:broadcast", inviteMsg);
    router.push(`/game/${gameId}?roomId=${roomId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-primary">{user.name?.split(" ")[0]}</span>
          </h2>
        </div>
        <p className="text-muted-foreground">
          Pick your battlefield and start competing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map((game) => {
          const Icon = game.icon;
          return (
            <Card
              key={game.id}
              className={`relative overflow-hidden transition-all duration-300 ${game.available
                  ? "hover:shadow-lg hover:-translate-y-1 cursor-pointer border-primary/20"
                  : "opacity-70 grayscale-[0.5]"
                }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className={`p-3 rounded-xl bg-primary/5 ${game.color}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={game.available ? "default" : "secondary"}>
                      {game.available ? "Open" : "Soon"}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-xl">{game.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {game.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-4 space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{game.players} Players</span>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full justify-between"
                  variant={game.available ? "default" : "outline"}
                  disabled={!game.available}
                  onClick={() => router.push(`/game/${game.id}`)}
                >
                  {game.available ? "Play Now" : "Coming Soon"}
                  {game.available && <ArrowRight className="w-4 h-4" />}
                </Button>
                {game.available && (
                  <Button
                    variant="ghost"
                    className="w-full h-8 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary"
                    onClick={() => broadcastInvite(game.id)}
                  >
                    <Sparkles className="w-3 h-3 mr-2" />
                    Broadcast to Lobby
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}

        <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center bg-muted/30">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg text-muted-foreground font-medium">New Games</CardTitle>
          <CardDescription>Adding more games soon!</CardDescription>
        </Card>
      </div>
    </div>
  );
}
