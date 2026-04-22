'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Users, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface LobbyProps {
    roomId: string;
    players: any[];
    isHost: boolean;
    onStartGame: () => void;
}

const COLOR_MAP: Record<string, string> = {
    red: 'bg-red-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-400',
    blue: 'bg-blue-500',
};

export const Lobby = ({ roomId, players, isHost, onStartGame }: LobbyProps) => {
    const [copied, setCopied] = React.useState(false);

    const copyLink = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
            <Card className="w-full max-w-md border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="border-b-4 border-black">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-3xl font-black uppercase tracking-tighter">Lobby</CardTitle>
                        <Badge variant="outline" className="border-2 border-black font-black uppercase p-2">
                            {players.length}/4 PLAYERS
                        </Badge>
                    </div>
                    <CardDescription className="text-black font-bold uppercase pt-2">
                        Wait for players to join via code
                    </CardDescription>
                </CardHeader>
                <CardContent className="py-6 space-y-6">
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase opacity-50 tracking-widest">Room Code</p>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-gray-100 border-4 border-black p-4 font-mono text-2xl font-black tracking-[0.2em] text-center">
                                {roomId}
                            </div>
                            <Button 
                                onClick={copyLink}
                                variant="outline" 
                                className="h-auto border-4 border-black hover:bg-black hover:text-white transition-all active:scale-95"
                            >
                                {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                         <p className="text-xs font-black uppercase opacity-50 tracking-widest">Connected Players</p>
                         <div className="grid grid-cols-1 gap-3">
                             {players.map((p, idx) => (
                                 <div 
                                    key={p.userId} 
                                    className="flex items-center gap-4 border-4 border-black p-3 bg-white"
                                 >
                                     <div className={cn("w-6 h-6 rounded-full border-2 border-black", COLOR_MAP[p.color || 'red'])} />
                                     <div className="flex-1 font-black uppercase truncate">
                                         {p.name} {p.userId === players[0].userId && <span className="text-[10px] bg-black text-white px-1 ml-1">HOST</span>}
                                     </div>
                                     {p.isBot && <Badge className="bg-blue-500">BOT</Badge>}
                                 </div>
                             ))}
                             {Array.from({ length: 4 - players.length }).map((_, i) => (
                                 <div 
                                    key={`empty-${i}`} 
                                    className="flex items-center gap-4 border-4 border-black p-3 bg-gray-50 opacity-30"
                                 >
                                     <div className="w-6 h-6 rounded-full border-2 border-black bg-gray-200" />
                                     <div className="font-black uppercase">Waiting...</div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t-4 border-black p-6 bg-gray-50 flex flex-col gap-4">
                    {isHost ? (
                        <Button 
                            onClick={onStartGame}
                            disabled={players.length < 2}
                            className="w-full py-8 text-2xl font-black uppercase tracking-widest border-4 border-black bg-white text-black hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                        >
                            <Play className="mr-2 fill-current" /> Start Game
                        </Button>
                    ) : (
                        <div className="w-full py-4 text-center font-black uppercase animate-pulse">
                            Waiting for host to start...
                        </div>
                    )}
                    <p className="text-[10px] font-bold text-center opacity-50">
                        AT LEAST 2 PLAYERS REQUIRED TO BEGIN
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};
