"use client";

import { useState, useTransition } from "react";
import { addComment, deleteComment } from "@/actions/comments";
import { initials } from "@/lib/utils";
import type { CommentRow, Profile } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

type Props = {
  date: string;
  comments: CommentRow[];
  profilesById: Map<string, Profile>;
  meId: string;
};

export function CommentThread({ date, comments, profilesById, meId }: Props) {
  const top = comments.filter((c) => !c.parent_id);
  const repliesByParent = new Map<string, CommentRow[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const arr = repliesByParent.get(c.parent_id) ?? [];
      arr.push(c);
      repliesByParent.set(c.parent_id, arr);
    }
  }

  return (
    <div className="space-y-4">
      {top.length === 0 && (
        <div className="text-sm text-stone-500 italic">
          No discussion yet. Start the conversation below.
        </div>
      )}
      {top.map((c) => (
        <CommentItem
          key={c.id}
          c={c}
          replies={repliesByParent.get(c.id) ?? []}
          profilesById={profilesById}
          date={date}
          meId={meId}
        />
      ))}
      <Composer date={date} />
    </div>
  );
}

function CommentItem({
  c,
  replies,
  profilesById,
  date,
  meId,
}: {
  c: CommentRow;
  replies: CommentRow[];
  profilesById: Map<string, Profile>;
  date: string;
  meId: string;
}) {
  const author = profilesById.get(c.user_id);
  const [replyOpen, setReplyOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Bubble c={c} author={author} date={date} meId={meId}>
        <button
          type="button"
          onClick={() => setReplyOpen(!replyOpen)}
          className="text-xs text-stone-500 hover:text-stone-900"
        >
          Reply
        </button>
      </Bubble>
      {replies.length > 0 && (
        <div className="ml-10 space-y-2">
          {replies.map((r) => (
            // No "Reply" affordance on replies — keep threads one level deep.
            <Bubble
              key={r.id}
              c={r}
              author={profilesById.get(r.user_id)}
              date={date}
              meId={meId}
            />
          ))}
        </div>
      )}
      {replyOpen && (
        <div className="ml-10">
          <Composer date={date} parentId={c.id} onDone={() => setReplyOpen(false)} />
        </div>
      )}
    </div>
  );
}

function Bubble({
  c,
  author,
  date,
  meId,
  children,
}: {
  c: CommentRow;
  author?: Profile;
  date: string;
  meId: string;
  children?: React.ReactNode;
}) {
  const [, startTransition] = useTransition();
  const mine = c.user_id === meId;
  return (
    <div className="flex gap-3">
      <div
        className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white text-xs font-medium"
        style={{ backgroundColor: author?.avatar_color ?? "#a8a29e" }}
      >
        {author ? initials(author.display_name) : "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-stone-900">
            {author?.display_name ?? "Unknown"}
          </span>
          <span className="text-xs text-stone-400">
            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm text-stone-700 whitespace-pre-wrap">
          {c.body}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {children}
          {mine && (
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  deleteComment(c.id, date).catch(console.error);
                })
              }
              className="text-xs text-stone-400 hover:text-rose-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Composer({
  date,
  parentId,
  onDone,
}: {
  date: string;
  parentId?: string;
  onDone?: () => void;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = body.trim();
        if (!t) return;
        startTransition(() => {
          addComment(date, t, parentId)
            .then(() => {
              setBody("");
              onDone?.();
            })
            .catch(console.error);
        });
      }}
      className="space-y-2"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "Add a thought…"}
        rows={parentId ? 2 : 3}
        className="w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:border-stone-400"
      />
      <div className="flex items-center justify-end gap-2">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-xs text-stone-500 hover:text-stone-900"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {parentId ? "Reply" : "Post"}
        </button>
      </div>
    </form>
  );
}
