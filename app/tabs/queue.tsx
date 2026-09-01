import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { LabHeader } from "@/components/DesignSystem";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { getMyActivePokerMatches, joinPokerQueue, leavePokerQueue } from "@/lib/pokerArena";

type JoinQueueResponse = { status: "waiting" | "matched"; match_id?: string; message?: string };

const POLL_INTERVAL_MS = 2500;

export default function QueueScreen() {
  const [status, setStatus] = useState<"joining" | "waiting" | "error">("joining");
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const matchedRef = useRef(false);

  const goToMatch = useCallback((matchId: string) => {
    matchedRef.current = true;
    router.replace({ pathname: "/tabs/live-match/[matchId]", params: { matchId } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollHandle: ReturnType<typeof setInterval> | undefined;

    async function poll() {
      try {
        const matches = await getMyActivePokerMatches();
        const match = matches[0];
        if (match && !cancelled) goToMatch(match.id);
      } catch {
        // transient network hiccup - keep polling until the next tick
      }
    }

    joinPokerQueue()
      .then((response: JoinQueueResponse) => {
        if (cancelled) return;
        if (response?.status === "matched" && response.match_id) {
          goToMatch(response.match_id);
          return;
        }
        setStatus("waiting");
        pollHandle = setInterval(poll, POLL_INTERVAL_MS);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to join the queue.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
      if (pollHandle) clearInterval(pollHandle);
      if (!matchedRef.current) leavePokerQueue().catch(() => undefined);
    };
  }, [goToMatch, retryToken]);

  async function cancelQueue() {
    matchedRef.current = true;
    await leavePokerQueue().catch(() => undefined);
    router.back();
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/dashboard" />
      <LabHeader eyebrow="Friendly practice" title="Wait and Play" subtitle="You'll be matched with the next club member looking for a heads-up practice hand." icon="account-clock-outline" />
      {status === "error" ? (
        <ErrorState
          message={error}
          onRetry={() => {
            setStatus("joining");
            setRetryToken((value) => value + 1);
          }}
        />
      ) : (
        <>
          <LoadingState label={status === "joining" ? "Joining the queue..." : "Waiting for an opponent..."} />
          <AppButton accessibilityLabel="Leave the matchmaking queue" mode="outlined" onPress={cancelQueue}>
            Cancel
          </AppButton>
        </>
      )}
    </ScreenContainer>
  );
}
