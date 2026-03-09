import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/auth";
import { getUserRounds } from "@/lib/golf/round-queries";
import { HistoryAuthPrompt } from "./_components/history-auth-prompt";
import { HistoryDashboard } from "./_components/history-dashboard";

export const metadata: Metadata = {
  title: "Round History",
  description:
    "Track your strokes gained trends over time. See where your game is improving and where to focus practice.",
};

export default async function HistoryPage() {
  const user = await getUser();

  if (!user) {
    return <HistoryAuthPrompt />;
  }

  const rounds = await getUserRounds(user.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl tracking-tight text-neutral-950">
        Round History
      </h1>
      <p className="mt-2 text-neutral-600">
        Your strokes gained performance over time.
      </p>

      <div className="mt-8">
        <HistoryDashboard rounds={rounds} />
      </div>
    </main>
  );
}
