'use client';

import React, { useState, Suspense } from 'react'
import { LocalGame } from './local-game'
import { LudoOnline } from './online-game'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { nanoid } from 'nanoid'
import { Users, Monitor, ArrowLeft, Plus } from 'lucide-react'
import { cn } from '@/lib/utils';

export const LudoMenu = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get('roomId');
    const [joinCode, setJoinCode] = useState('');
    const [localPlayerCount, setLocalPlayerCount] = useState(4);

    if (roomId) {
        return (
            <main className='bg-background text-foreground min-h-screen'>
                <LudoOnline roomId={roomId} />
            </main>
        );
    }

    return (
        <main className='bg-background text-foreground min-h-screen flex items-center justify-center p-4'>
            <div className="w-full max-w-4xl space-y-12">
                <div className="text-center space-y-4">
                    <h1 className="text-6xl font-black tracking-tighter border-b-8 border-primary pb-2 inline-block">
                        LUDO ARCADIA
                    </h1>
                    <p className="text-xl font-bold uppercase opacity-50 tracking-[0.2em]">Select Your Arena</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* LOCAL PLAY */}
                    <Card className="border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all bg-card">
                        <CardHeader className="border-b-4 border-foreground bg-muted/50">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase">
                                <Monitor className="w-8 h-8" /> Local Match
                            </CardTitle>
                            <CardDescription className="text-foreground/70 font-bold uppercase">
                                Play against friends on the same machine
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="flex flex-col gap-6">
                                <div className="space-y-3">
                                    <div className="text-xs font-black uppercase opacity-50">Select Player Count</div>
                                    <div className="flex gap-3">
                                        {[2, 3, 4].map(count => (
                                            <button
                                                key={count}
                                                onClick={() => setLocalPlayerCount(count)}
                                                className={cn(
                                                    "flex-1 h-14 text-2xl font-black border-4 border-foreground transition-all active:scale-95",
                                                    localPlayerCount === count
                                                        ? "bg-foreground text-background shadow-none translate-x-1 translate-y-1"
                                                        : "bg-background text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-0.5 hover:translate-y-0.5"
                                                )}
                                            >
                                                {count}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={() => router.push(`/game/ludo?local=true&players=${localPlayerCount}`)}
                                    className="w-full h-16 text-xl font-black uppercase tracking-widest border-4 border-foreground bg-foreground text-background hover:bg-background hover:text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-1 active:translate-y-1"
                                >
                                    Start Local Game
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ONLINE PLAY */}
                    <Card className="border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all bg-card">
                        <CardHeader className="border-b-4 border-foreground bg-muted/50">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase">
                                <Users className="w-8 h-8" /> Online Duel
                            </CardTitle>
                            <CardDescription className="text-foreground/70 font-bold uppercase">
                                Challenge players across the web
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-3">
                                <div className="text-xs font-black uppercase opacity-50">Have a code?</div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="ROOM CODE"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        className="h-12 border-4 border-foreground font-black uppercase tracking-widest bg-background"
                                    />
                                    <Button
                                        onClick={() => router.push(`/game/ludo?roomId=${joinCode}`)}
                                        disabled={!joinCode}
                                        className="h-12 border-4 border-foreground px-6 bg-foreground text-background hover:bg-background hover:text-foreground"
                                    >
                                        JOIN
                                    </Button>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t-2 border-foreground/20" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-4 font-black">OR</span>
                                </div>
                            </div>

                            <Button
                                onClick={() => router.push(`/game/ludo?roomId=${nanoid(6).toUpperCase()}`)}
                                className="w-full h-16 text-xl font-black uppercase tracking-widest border-4 border-foreground bg-background text-foreground hover:bg-foreground hover:text-background"
                            >
                                <Plus className="mr-2" /> Host New Game
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
};

export const Game = () => {
    const searchParams = useSearchParams();
    const isLocal = searchParams.get('local') === 'true';

    if (isLocal) {
        return (
            <main className='bg-background text-foreground min-h-screen'>
                <div className="p-4">
                    <Button
                        variant="link"
                        onClick={() => window.location.href = '/game/ludo'}
                        className="font-black uppercase tracking-widest text-foreground flex items-center gap-2 hover:opacity-70"
                    >
                        <ArrowLeft className="w-4 h-4" /> Exit to Menu
                    </Button>
                </div>
                <LocalGame />
            </main>
        );
    }

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-black uppercase tracking-widest">
                Loading Arena...
            </div>
        }>
            <LudoMenu />
        </Suspense>
    );
};
