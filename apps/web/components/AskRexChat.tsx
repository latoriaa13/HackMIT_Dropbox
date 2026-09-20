"use client";

import { useCallback, useRef, useState } from "react";

type Message = { role: "rex" | "user"; text: string };

const GREETING =
  "Hi — I'm Rex. Ask me about your donors in plain language (e.g. who to thank, who lapsed, or who shares a reunion year). I'll search your constituent data and explain what I find.";

function formatSegmentReply(data: {
  segmentName?: string;
  description?: string;
  count?: number;
  sharedCharacteristics?: string[];
  constituents?: Array<{ name?: string; id?: string }>;
  unsupportedSignals?: string[];
}): string {
  const parts: string[] = [];
  if (data.segmentName) parts.push(`**${data.segmentName}**`);
  if (data.description) parts.push(data.description);
  const n = data.count ?? data.constituents?.length ?? 0;
  parts.push(`I found **${n}** matching constituent${n === 1 ? "" : "s"}.`);
  if (data.sharedCharacteristics?.length) {
    parts.push(`In common: ${data.sharedCharacteristics.slice(0, 4).join("; ")}.`);
  }
  const names = (data.constituents ?? [])
    .slice(0, 5)
    .map((c) => c.name || c.id)
    .filter(Boolean);
  if (names.length) parts.push(`Examples: ${names.join(", ")}${n > 5 ? "…" : ""}.`);
  if (data.unsupportedSignals?.length) {
    parts.push(
      `(Some filters aren't in your dataset yet: ${data.unsupportedSignals.join(", ")}.)`
    );
  }
  return parts.join("\n\n");
}

function RexAvatar() {
  return (
    <span className="relative block h-full w-full">
      <img
        src="/rex-dino-avatar.png"
        alt=""
        width={256}
        height={256}
        decoding="async"
        className="rex-avatar-light absolute inset-0 h-full w-full object-cover object-center"
      />
      <img
        src="/rex-dino-avatar-dark.png"
        alt=""
        aria-hidden
        width={256}
        height={256}
        decoding="async"
        className="rex-avatar-dark absolute inset-0 h-full w-full object-cover object-center"
      />
    </span>
  );
}

export function AskRexChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "rex", text: GREETING }]);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    scrollDown();
    try {
      const res = await fetch("/api/segments/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 20 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "rex",
            text:
              data.error ??
              "I couldn't run that search right now. Try a simpler question about donors, giving, or events.",
          },
        ]);
      } else {
        setMessages((m) => [...m, { role: "rex", text: formatSegmentReply(data) }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "rex", text: "Something went wrong on my side — try again in a moment." },
      ]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div
          className="ask-rex-chat flex max-h-[min(70vh,520px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-lg"
          role="dialog"
          aria-label="Ask Rex chat"
        >
          <header className="flex items-center gap-3 border-b border-[#e2e8f0] bg-[#fff7ed] px-4 py-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#ff6b00] bg-white">
              <RexAvatar />
            </div>
            <div>
              <p className="ask-rex-title text-sm font-bold">Ask Rex</p>
              <p className="ask-rex-subtitle text-xs">Donor & segment questions</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ask-rex-muted ml-auto rounded-lg px-2 py-1 text-lg leading-none hover:bg-white/80"
              aria-label="Close chat"
            >
              ×
            </button>
          </header>
          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-3"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "rex" && (
                  <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#e2e8f0] bg-white">
                    <RexAvatar />
                  </div>
                )}
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#ff6b00] font-medium text-white"
                      : "ask-rex-rex-bubble"
                  }`}
                >
                  {msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                </p>
              </div>
            ))}
            {loading && <p className="ask-rex-muted text-xs">Rex is thinking…</p>}
          </div>
          <form
            className="flex gap-2 border-t border-[#e2e8f0] bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your donors…"
              className="ask-rex-input flex-1 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#ff6b00]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="donorex-btn-primary shrink-0 rounded-xl px-4 py-2 text-sm text-white"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ask-rex-launcher flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white py-1.5 pl-1.5 pr-4 shadow-lg transition hover:shadow-xl"
        aria-expanded={open}
        aria-label={open ? "Close Ask Rex" : "Open Ask Rex"}
      >
        <span className="relative block h-12 w-12 overflow-hidden rounded-full border-2 border-[#ff6b00] bg-white">
          <RexAvatar />
        </span>
        <span className="text-sm font-bold text-[#0b192c]">Ask Rex</span>
      </button>
    </div>
  );
}
