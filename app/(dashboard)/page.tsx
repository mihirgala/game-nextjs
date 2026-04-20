import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { HomePage } from "@/components/home/home-page";
import {
  getFriends,
  getPendingRequests,
} from "@/app/actions/friends";
import { getMatchHistory } from "@/app/actions/history";

export default async function Home() {
  // Session is already verified in layout.tsx, but we can get it again here 
  // or use the layout to pass it, but re-fetching is fine for now/cached.
  const session = await auth.api.getSession({ headers: await headers() });
  
  // Parallel data fetching
  const [friends, pending, history] = await Promise.all([
    getFriends(),
    getPendingRequests(),
    getMatchHistory(),
  ]);

  return (
    <HomePage
      user={session!.user}
      initialFriends={friends}
      initialPending={pending}
      initialHistory={history as any}
    />
  );
}
