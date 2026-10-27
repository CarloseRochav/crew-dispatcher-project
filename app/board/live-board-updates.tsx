"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "cn";
import { Radio, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createRefreshScheduler } from "@/lib/realtime/refresh-scheduler";
import { createClient } from "@/lib/supabase/client";

type Connection = "connecting" | "live" | "reconnecting";

// Any change to a job the dispatcher may read reloads the board from the
// server, with the filters in the URL. Realtime checks each event against the
// same RLS policies as the queries (tests/rls/jobs.realtime.test.ts).
export function LiveBoardUpdates() {
  const router = useRouter();
  const [connection, setConnection] = useState<Connection>("connecting");

  useEffect(() => {
    const supabase = createClient();
    const scheduler = createRefreshScheduler(() => router.refresh());
    let channel: RealtimeChannel | null = null;
    let wasLive = false;
    let stopped = false;

    async function subscribe() {
      // Joins with the dispatcher's session token, not just the anon key.
      await supabase.realtime.setAuth();
      if (stopped) return;

      // A unique name, so a quick unmount and remount never reuses a channel being removed.
      channel = supabase
        .channel(`board-jobs-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => scheduler.schedule())
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // Back after a drop: changes made meanwhile were never sent, so reload once.
            if (wasLive) scheduler.schedule();
            wasLive = true;
            setConnection("live");
          } else if (!stopped) {
            setConnection(wasLive ? "reconnecting" : "connecting");
          }
        });
    }

    void subscribe();

    return () => {
      stopped = true;
      scheduler.cancel();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return <LiveIndicator connection={connection} />;
}

const INDICATOR = {
  live: { icon: Radio, label: "Live", className: "text-status-done" },
  connecting: { icon: RefreshCw, label: "Connecting…", className: "text-muted-foreground" },
  reconnecting: { icon: RefreshCw, label: "Reconnecting…", className: "text-muted-foreground" },
} as const;

function LiveIndicator({ connection }: { connection: Connection }) {
  const { icon: Icon, label, className } = INDICATOR[connection];

  return (
    <p role="status" aria-live="polite" className={cn("flex items-center gap-1.5 text-sm font-medium", className)}>
      <Icon aria-hidden className={cn("size-4", connection !== "live" && "motion-safe:animate-spin")} />
      {label}
    </p>
  );
}
