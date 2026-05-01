"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, LoadingSkeleton, EmptyState } from "@/app/components/shared";
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";

interface Contact {
  user_id: number;
  name: string;
  email: string;
  last_message_at: number | null; // epoch seconds
  last_message_preview: string | null;
  last_sender_id: number | null;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  title: string | null;
  description: string | null;
  path: string | null;
  read_at: number | null;
  created_at: number; // epoch seconds
}

interface Props {
  selfUserId: number;
}

const POLL_INTERVAL_MS = 5_000;

function formatTime(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
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

function fileUrl(relPath: string): string {
  return `/uploads/${relPath}`;
}

function fileLabel(relPath: string): string {
  const parts = relPath.split("/");
  return parts[parts.length - 1] || relPath;
}

export default function ConsultantChatShell({ selfUserId }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState("");
  const [search, setSearch] = useState("");

  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");

  const [draft, setDraft] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch contacts ──────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/consultant-chat/contacts");
      if (!res.ok) throw new Error("Failed to load consultants");
      const json = await res.json();
      setContacts(json.data || []);
      setContactsError("");
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
    setDraftFile(null);

    try {
      const res = await fetch(
        `/api/consultant-chat/messages?consultant_id=${contact.user_id}`
      );
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
    if (!activeContact) return;

    pollingRef.current = setInterval(async () => {
      try {
        const lastId = messages.length > 0 ? messages[messages.length - 1].id : 0;
        const res = await fetch(
          `/api/consultant-chat/messages?consultant_id=${activeContact.user_id}&after_id=${lastId}`
        );
        if (!res.ok) return;
        const json = await res.json();
        const incoming: Message[] = json.data?.messages || [];
        if (incoming.length > 0) {
          setMessages((prev) => [...prev, ...incoming]);
        }
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
  }, [activeContact, messages, fetchContacts]);

  // ── Send message ───────────────────────────────────────────────────
  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const body = draft.trim();
      if (!activeContact || sending) return;
      if (body.length === 0 && !draftFile) return;

      setSending(true);
      try {
        const form = new FormData();
        form.set("consultant_id", String(activeContact.user_id));
        if (body) form.set("body", body);
        if (draftFile) form.set("file", draftFile);

        const res = await fetch("/api/consultant-chat/messages", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error || "Failed to send");
        }
        const json = await res.json();
        const msg: Message = {
          id: json.data.id,
          sender_id: selfUserId,
          receiver_id: activeContact.user_id,
          title: null,
          description: body || null,
          path: json.data.path ?? null,
          read_at: null,
          created_at:
            typeof json.data.created_at === "number"
              ? json.data.created_at
              : Math.floor(Date.now() / 1000),
        };
        setMessages((prev) => [...prev, msg]);
        setDraft("");
        setDraftFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchContacts();
      } catch (err) {
        setMessagesError(err instanceof Error ? err.message : "Failed to send");
      } finally {
        setSending(false);
      }
    },
    [draft, draftFile, activeContact, sending, selfUserId, fetchContacts]
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
    <div className="flex flex-col h-[calc(100dvh-10rem)] min-h-[420px]">
      <div className="shrink-0 mb-3">
        <h1 className="text-2xl font-bold text-primary-900">Consultant Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Direct messages with consultants. Attach files when needed.
        </p>
      </div>

      <Card padding="none" className="overflow-hidden flex-1 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] h-full">
          {/* Contacts pane */}
          <div className="border-r border-gray-100 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search consultants..."
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
                  {search ? "No matches." : "No consultants available."}
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
                                {c.last_message_preview || "Consultant"}
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
          <div className="flex flex-col min-h-0 h-full">
            {!activeContact ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <EmptyState
                  icon={<ChatBubbleLeftRightIcon className="h-12 w-12" />}
                  title="Select a consultant"
                  description="Pick a consultant from the list to start messaging."
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
                      Consultant · {activeContact.email}
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
                      No messages yet. Send the first one.
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
                              {m.title && (
                                <p className={`text-xs font-semibold mb-1 ${mine ? "text-primary-50" : "text-gray-700"}`}>
                                  {m.title}
                                </p>
                              )}
                              {m.description && (
                                <p className="whitespace-pre-wrap break-words">{m.description}</p>
                              )}
                              {m.path && (
                                <a
                                  href={fileUrl(m.path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`mt-1 inline-flex items-center gap-1 text-xs underline ${
                                    mine ? "text-primary-50" : "text-primary-700"
                                  }`}
                                >
                                  <DocumentIcon className="h-3.5 w-3.5" />
                                  {fileLabel(m.path)}
                                </a>
                              )}
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
                  className="border-t border-gray-100 p-3 bg-white"
                >
                  {draftFile && (
                    <div className="mb-2 flex items-center gap-2 text-xs bg-gray-100 rounded-lg px-2 py-1.5">
                      <DocumentIcon className="h-4 w-4 text-gray-500 shrink-0" />
                      <span className="truncate flex-1">{draftFile.name}</span>
                      <span className="text-gray-400 shrink-0">
                        {(draftFile.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setDraftFile(f);
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Attach a file"
                    >
                      <PaperClipIcon className="h-5 w-5" />
                    </button>
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
                      disabled={!draft.trim() && !draftFile}
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
