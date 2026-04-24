"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, LoadingSkeleton, EmptyState } from "@/app/components/shared";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface Contact {
  user_id: number;
  name: string;
  email: string;
  role: "school_admin" | "teacher";
  thread_id: number | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_sender_id: number | null;
  unread_count: number;
}

interface Message {
  id: number;
  thread_id: number;
  sender_id: number;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface ChatPageShellProps {
  selfUserId: number;
}

const POLL_INTERVAL_MS = 5_000;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export default function ChatPageShell({ selfUserId }: ChatPageShellProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [search, setSearch] = useState("");

  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch contacts ──────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/contacts");
      if (!res.ok) throw new Error("Failed to load contacts");
      const json = await res.json();
      setContacts(json.data || []);
    } catch (err) {
      setContactsError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ── Open / switch active conversation ──────────────────────────────
  const openConversation = useCallback(async (contact: Contact) => {
    setActiveContact(contact);
    setMessages([]);
    setMessagesError("");
    setMessagesLoading(true);
    setDraft("");

    try {
      // Ensure a thread exists (create if needed).
      let threadId = contact.thread_id;
      if (!threadId) {
        const res = await fetch("/api/chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ other_user_id: contact.user_id }),
        });
        if (!res.ok) throw new Error("Failed to open conversation");
        const json = await res.json();
        threadId = json.data?.thread_id ?? null;
      }
      if (!threadId) throw new Error("Failed to resolve thread");

      setActiveThreadId(threadId);

      const res = await fetch(`/api/chat/threads/${threadId}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      const json = await res.json();
      setMessages(json.data?.messages || []);

      // Optimistically zero out unread for this contact.
      setContacts((prev) =>
        prev.map((c) => (c.user_id === contact.user_id ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Auto-scroll to bottom whenever messages grow.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ── Polling for new messages in the active thread ──────────────────
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (!activeThreadId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const lastId = messages.length > 0 ? messages[messages.length - 1].id : 0;
        const res = await fetch(
          `/api/chat/threads/${activeThreadId}/messages?after_id=${lastId}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const incoming: Message[] = json.data?.messages || [];
        if (incoming.length > 0) {
          setMessages((prev) => [...prev, ...incoming]);
        }
        // Also refresh contact list so unread counts + previews stay accurate.
        fetchContacts();
      } catch {
        /* ignore transient polling errors */
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeThreadId, messages, fetchContacts]);

  // ── Send message ───────────────────────────────────────────────────
  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const body = draft.trim();
      if (!body || !activeThreadId || sending) return;
      setSending(true);
      try {
        const res = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to send");
        }
        const json = await res.json();
        const msg: Message = {
          id: json.data.id,
          thread_id: activeThreadId,
          sender_id: selfUserId,
          body,
          read_at: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, msg]);
        setDraft("");
        fetchContacts();
      } catch (err) {
        setMessagesError(err instanceof Error ? err.message : "Failed to send");
      } finally {
        setSending(false);
      }
    },
    [draft, activeThreadId, sending, selfUserId, fetchContacts]
  );

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Direct messages with the school admin and teachers in your school.
        </p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] min-h-[560px]">
          {/* Contacts pane */}
          <div className="border-r border-gray-100 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contactsLoading ? (
                <div className="p-4">
                  <LoadingSkeleton lines={6} />
                </div>
              ) : contactsError ? (
                <p className="p-4 text-sm text-red-600">{contactsError}</p>
              ) : filteredContacts.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">
                  {search ? "No matches." : "No contacts available."}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredContacts.map((c) => {
                    const isActive = activeContact?.user_id === c.user_id;
                    return (
                      <li key={c.user_id}>
                        <button
                          onClick={() => openConversation(c)}
                          className={`w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                            isActive ? "bg-primary-50" : ""
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {c.name}
                              </p>
                              {c.last_message_at && (
                                <span className="text-[10px] text-gray-400 shrink-0">
                                  {formatTime(c.last_message_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-gray-500 truncate">
                                {c.last_message_preview ||
                                  (c.role === "school_admin" ? "School admin" : "Teacher")}
                              </p>
                              {c.unread_count > 0 && (
                                <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                                  {c.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Conversation pane */}
          <div className="flex flex-col min-h-[560px]">
            {!activeContact ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <EmptyState
                  icon={<ChatBubbleLeftRightIcon className="h-12 w-12" />}
                  title="Select a conversation"
                  description="Pick someone from the list to start messaging."
                />
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs shrink-0">
                    {initials(activeContact.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {activeContact.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {activeContact.role === "school_admin" ? "School Admin" : "Teacher"}
                      {" · "}
                      {activeContact.email}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                  {messagesLoading ? (
                    <LoadingSkeleton lines={6} />
                  ) : messagesError ? (
                    <p className="text-sm text-red-600 text-center py-4">{messagesError}</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No messages yet. Say hi.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {messages.map((m) => {
                        const mine = m.sender_id === selfUserId;
                        return (
                          <li
                            key={m.id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                                mine
                                  ? "bg-primary-600 text-white rounded-br-sm"
                                  : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.body}</p>
                              <p
                                className={`text-[10px] mt-1 ${
                                  mine ? "text-primary-100/80" : "text-gray-400"
                                }`}
                              >
                                {formatTime(m.created_at)}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Composer */}
                <form
                  onSubmit={handleSend}
                  className="border-t border-gray-100 p-3 flex items-end gap-2 bg-white"
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e as unknown as React.FormEvent);
                      }
                    }}
                    placeholder="Write a message..."
                    rows={2}
                    className="flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    loading={sending}
                    disabled={!draft.trim()}
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    Send
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
