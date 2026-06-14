import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentUserProfile,
  getWeddingEvents,
  getWeddingSettings,
} from "@/lib/queries";
import { isAdmin } from "@/lib/admin";
import { Header } from "@/components/Header";
import { WeddingEventsManager } from "@/components/WeddingEventsManager";

export default async function WeddingEventsPage() {
  const me = await getCurrentUserProfile();
  if (!me) redirect("/login");

  const [events, weddingSettings] = await Promise.all([
    getWeddingEvents(),
    getWeddingSettings(),
  ]);

  const meIsAdmin = isAdmin(me.email ?? "");
  const finalDate = weddingSettings?.final_date ?? null;

  return (
    <>
      <Header me={me} finalDate={finalDate} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"
        >
          ← Back to calendar
        </Link>

        <div>
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-stone-900">
            Wedding Events
          </h1>
          {finalDate && (
            <p className="mt-2 text-sm text-stone-500">
              Wedding date:{" "}
              <Link
                href={`/day/${finalDate}`}
                className="text-emerald-700 font-medium hover:underline"
              >
                {finalDate}
              </Link>
            </p>
          )}
          {!finalDate && (
            <p className="mt-2 text-sm text-stone-400 italic">
              No final wedding date set yet. An admin can set it from the day page.
            </p>
          )}
        </div>

        <WeddingEventsManager
          events={events}
          meId={me.id}
          meIsAdmin={meIsAdmin}
        />
      </main>
    </>
  );
}
