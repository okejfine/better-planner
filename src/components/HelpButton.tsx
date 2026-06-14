"use client";

import * as Popover from "@radix-ui/react-popover";

export function HelpButton() {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Feature guide"
          title="Feature guide"
          className="flex items-center justify-center h-7 w-7 rounded-full border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition select-none"
        >
          ?
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-80 rounded-2xl border border-stone-200 bg-white shadow-xl p-5 space-y-4 text-sm"
          sideOffset={8}
          align="end"
        >
          <div className="font-serif text-lg text-stone-900 tracking-tight">
            How it works
          </div>

          <div className="space-y-3 text-[13px] text-stone-700">
            <HelpSection icon="★" heading="Star rating">
              Rate a day 1–5 stars. The group average appears on the calendar tile.
            </HelpSection>

            <HelpSection icon="⭐" heading="Shortlist">
              Mark dates you&rsquo;d genuinely be happy with. The leaderboard score is
              shortlists minus vetoes.
            </HelpSection>

            <HelpSection icon="⛔" heading="Veto">
              Block a date that doesn&rsquo;t work for you. Even one veto tanks a
              date&rsquo;s score.
            </HelpSection>

            <HelpSection icon="📍" heading="Preferred locations">
              On each date&rsquo;s page, pick which cities work for a wedding then.
              The most-picked cities across all shortlisted dates show as{" "}
              <span className="font-medium">Popular locations</span> on the dashboard.
            </HelpSection>

            <HelpSection icon="💍" heading="Wedding events">
              Once an admin sets the final date, head to{" "}
              <span className="font-medium">Wedding Events</span> to plan your
              ceremony, reception, dinner, and more.
            </HelpSection>

            <HelpSection icon="📅" heading="Calendar drops">
              Drop your <span className="font-medium">.ics</span> file on the
              dashboard to show your busy days. Each person&rsquo;s imports appear in
              their avatar color on the calendar.
            </HelpSection>
          </div>

          <Popover.Arrow className="fill-white stroke-stone-200 stroke-1" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function HelpSection({
  icon,
  heading,
  children,
}: {
  icon: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 text-base leading-none shrink-0" aria-hidden>
        {icon}
      </span>
      <div>
        <span className="font-semibold text-stone-900">{heading} — </span>
        {children}
      </div>
    </div>
  );
}
