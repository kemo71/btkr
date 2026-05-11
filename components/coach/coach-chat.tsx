"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Field, Textarea, Select, Badge } from "@/components/dga";
import type { FrameworkSlug } from "@/lib/frameworks";

interface Message {
  role: "user" | "assistant";
  content: string;
}

/**
 * Streaming chat UI for the AI Innovation Coach.
 *
 * Maintains conversation state locally (no server persistence in Phase 1).
 * On submit, posts the history to `/api/coach`, then reads the response
 * stream chunk-by-chunk and appends to the in-progress assistant message.
 */
export function CoachChat({
  initialFramework,
  locale,
  frameworks,
  labels,
}: {
  initialFramework: FrameworkSlug | null;
  locale: "ar" | "en";
  frameworks: { slug: FrameworkSlug; label: string }[];
  labels: {
    framework: string;
    general: string;
    you: string;
    coach: string;
    placeholder: string;
    send: string;
    sending: string;
    streamError: string;
    empty: string;
  };
}) {
  const [framework, setFramework] = useState<FrameworkSlug | null>(
    initialFramework,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || streaming) return;

    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setDraft("");
    setError(null);
    setStreaming(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ framework, locale, messages: history }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // Optimistically append an empty assistant message; we'll grow it.
      startTransition(() => {
        setMessages((m) => [...m, { role: "assistant", content: "" }]);
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            next[next.length - 1] = {
              role: "assistant",
              content: last.content + chunk,
            };
          }
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "stream-error");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label={labels.framework}>
        {(p) => (
          <Select
            {...p}
            value={framework ?? ""}
            onChange={(e) =>
              setFramework((e.target.value || null) as FrameworkSlug | null)
            }
            disabled={streaming || messages.length > 0}
          >
            <option value="">{labels.general}</option>
            {frameworks.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div
        ref={scrollRef}
        className="flex max-h-[60vh] min-h-[300px] flex-col gap-3 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-neutral-500">{labels.empty}</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "flex flex-col items-end"
                  : "flex flex-col items-start"
              }
            >
              <span className="text-xs text-neutral-500">
                {m.role === "user" ? labels.you : labels.coach}
              </span>
              <div
                className={
                  m.role === "user"
                    ? "mt-1 max-w-[85%] rounded-lg bg-primary-600 px-3 py-2 text-sm text-white whitespace-pre-wrap"
                    : "mt-1 max-w-[85%] rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 whitespace-pre-wrap"
                }
              >
                {m.content || (streaming ? "…" : "")}
              </div>
            </div>
          ))
        )}
      </div>

      {error ? <Badge tone="danger">{labels.streamError}</Badge> : null}

      <form onSubmit={send} className="flex flex-col gap-2">
        <Textarea
          name="message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              send(e);
            }
          }}
          placeholder={labels.placeholder}
          rows={3}
          disabled={streaming}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={streaming || !draft.trim()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-base font-medium text-white shadow-sm transition-colors hover:bg-primary-700 disabled:bg-neutral-300"
          >
            {streaming ? labels.sending : labels.send}
          </button>
        </div>
      </form>
    </div>
  );
}
