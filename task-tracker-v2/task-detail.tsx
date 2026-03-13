"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/db/schema";
import { StatusBadge } from "./status-badge";
import { SourceIcon } from "./source-icon";

interface TaskAction {
  id: string;
  taskId: string;
  type: string;
  content: string;
  summary?: string;  // legacy fallback
  actor?: string;    // optional
  createdAt: string;
}

interface RelatedEmail {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  recipients: string;
  body: string;
  receivedAt: string;
  mailbox: string;
  isSent: number;
}

type TaskDetailItem = Task & {
  siteId?: string | null;
  siteName?: string | null;
  sitePhone?: string | null;
};

interface TaskDetailProps {
  task: TaskDetailItem;
  onBack: () => void;
  onUpdate: () => void;
  lang?: "ja" | "en";
}

const TRANSLATIONS = {
  ja: {
    findRelated: "関連メールを探す",
    searching: "検索中...",
    relatedEmails: "関連メール",
    statusChange: "ステータス変更",
    in_progress: "対応中",
    waiting: "返信待ち",
    on_hold: "保留",
    no_action: "対処不要",
    completed: "完了",
    history: "履歴",
    noHistory: "履歴はありません",
    sent: "送信",
    received: "受信",
    subject: "件名",
    from: "送信者",
    to: "宛先",
    body: "本文",
    noBody: "(本文なし)",
    sentMail: "送信メール",
    receivedMail: "受信メール",
    high: "高",
    medium: "中",
    low: "低",
  },
  en: {
    findRelated: "Find Related Emails",
    searching: "Searching...",
    relatedEmails: "Related Emails",
    statusChange: "Change Status",
    in_progress: "In Progress",
    waiting: "Waiting",
    on_hold: "On Hold",
    no_action: "No Action",
    completed: "Done",
    history: "History",
    noHistory: "No history",
    sent: "Sent",
    received: "Received",
    subject: "Subject",
    from: "From",
    to: "To",
    body: "Body",
    noBody: "(No content)",
    sentMail: "Sent Email",
    receivedMail: "Received Email",
    high: "High",
    medium: "Med",
    low: "Low",
  },
};

const PriorityBadge = ({ priority, lang = "ja" }: { priority: string | null; lang?: "ja" | "en" }) => {
  const t = TRANSLATIONS[lang];
  const config = {
    high: { icon: "🔴", label: t.high, color: "bg-red-100 text-red-700" },
    medium: { icon: "🟡", label: t.medium, color: "bg-yellow-100 text-yellow-700" },
    low: { icon: "🔵", label: t.low, color: "bg-blue-100 text-blue-700" },
  };
  const p = priority || "medium";
  const c = config[p as keyof typeof config] || config.medium;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

export function TaskDetail({ task, onUpdate, lang = "ja" }: TaskDetailProps) {
  const t = TRANSLATIONS[lang];
  const [actions, setActions] = useState<TaskAction[]>([]);
  const [relatedEmails, setRelatedEmails] = useState<RelatedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<RelatedEmail | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(task.sitePhone || "");
  const [savingPhone, setSavingPhone] = useState(false);

  const STATUS_BUTTONS = [
    { status: "in_progress", label: t.in_progress, icon: "🔄", color: "border-cyan-400 text-cyan-700 hover:bg-cyan-50" },
    { status: "waiting", label: t.waiting, icon: "📤", color: "border-orange-400 text-orange-700 hover:bg-orange-50" },
    { status: "on_hold", label: t.on_hold, icon: "⏸️", color: "border-amber-400 text-amber-700 hover:bg-amber-50" },
    { status: "no_action", label: t.no_action, icon: "⏭️", color: "border-slate-400 text-slate-700 hover:bg-slate-50" },
    { status: "completed", label: t.completed, icon: "✅", color: "border-green-400 text-green-700 hover:bg-green-50" },
  ];

  useEffect(() => {
    setRelatedEmails([]);
    setSelectedEmail(null);
    setIsEditingPhone(false);
    setPhoneInput(task.sitePhone || "");
    fetch(`/api/tasks/${task.id}`)
      .then((res) => res.json())
      .then((data) => setActions(data.actions || []))
      .catch(console.error);
  }, [task.id, task.sitePhone]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const res = await fetch(`/api/tasks/${task.id}`);
      const data = await res.json();
      setActions(data.actions || []);
      onUpdate();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleFindRelatedEmails = async () => {
    setLoadingEmails(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/related-emails`);
      if (res.ok) {
        const data = await res.json();
        setRelatedEmails(data.emails || []);
      }
    } catch (error) {
      console.error("Failed to fetch related emails:", error);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleSavePhone = async () => {
    if (!task.siteId) return;
    const normalized = phoneInput.trim();
    if (normalized && !/^[+()\-\d\s]{6,25}$/.test(normalized)) {
      alert(lang === "ja" ? "電話番号の形式が正しくありません" : "Invalid phone number format");
      return;
    }

    setSavingPhone(true);
    try {
      const res = await fetch(`/api/sites/${task.siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized || null }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update phone (${res.status})`);
      }

      setIsEditingPhone(false);
      onUpdate();
    } catch (error) {
      console.error("Failed to update site phone:", error);
      alert(lang === "ja" ? "電話番号の更新に失敗しました" : "Failed to update phone number");
    } finally {
      setSavingPhone(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", { 
        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" 
      });
    } catch {
      return dateStr || '';
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-start gap-3">
            <SourceIcon source={task.source} />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 break-words">{task.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge status={task.status} lang={lang} />
                <PriorityBadge priority={task.priority} lang={lang} />
                {task.counterparty && (
                  <span className="text-gray-600 flex items-center gap-1 text-sm truncate max-w-[200px]">
                    <span className="text-gray-400">👤</span> {task.counterparty}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Inline Site Phone Edit */}
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">📞 Site Phone</h3>
            <p className="text-xs text-gray-500 mb-3">{task.siteName || "Unknown site"}</p>

            {!isEditingPhone ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-800">{task.sitePhone || "—"}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(true)}
                  disabled={!task.siteId}
                  className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  ✏️ {lang === "ja" ? "編集" : "Edit"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+61 7 xxxx xxxx"
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput(task.sitePhone || "");
                      setIsEditingPhone(false);
                    }}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 hover:bg-gray-100"
                  >
                    {lang === "ja" ? "キャンセル" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePhone}
                    disabled={savingPhone || !task.siteId}
                    className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingPhone ? (lang === "ja" ? "保存中..." : "Saving...") : (lang === "ja" ? "保存" : "Save")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Find Related Emails Button */}
          {task.source === "email" && task.sourceId && (
            <button
              onClick={handleFindRelatedEmails}
              disabled={loadingEmails}
              className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loadingEmails ? `🔄 ${t.searching}` : `🔍 ${t.findRelated}`}
            </button>
          )}

          {/* Related Emails */}
          {relatedEmails.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-3 md:p-4">
              <h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                📨 {t.relatedEmails}
                <span className="bg-purple-200 text-purple-800 text-xs px-2 py-0.5 rounded-full">{relatedEmails.length}</span>
              </h3>
              <div className="space-y-2 max-h-60 md:max-h-48 overflow-y-auto">
                {relatedEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      email.isSent
                        ? "bg-green-100 border-l-4 border-green-500"
                        : "bg-white border-l-4 border-blue-500"
                    } hover:shadow-md active:scale-[0.98]`}
                  >
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                        email.isSent ? "bg-green-200 text-green-700" : "bg-blue-200 text-blue-700"
                      }`}>
                        {email.isSent ? t.sent : t.received}
                      </span>
                      <span className="font-mono">{formatDate(email.receivedAt)}</span>
                    </div>
                    <p className="font-medium text-gray-800 text-sm truncate">{email.subject}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {email.isSent ? `To: ${email.recipients}` : `From: ${email.senderName}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Change */}
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.statusChange}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STATUS_BUTTONS.map((btn) => (
                <button
                  key={btn.status}
                  onClick={() => handleStatusChange(btn.status)}
                  disabled={updating || task.status === btn.status}
                  className={`px-3 py-2 rounded-lg border-2 font-medium transition-all text-sm ${btn.color} ${
                    task.status === btn.status ? "opacity-50 cursor-not-allowed bg-gray-100" : "bg-white"
                  } disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1`}
                >
                  <span>{btn.icon}</span>
                  <span className="text-xs md:text-sm">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              📜 {t.history}
              {actions.length > 0 && (
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{actions.length}</span>
              )}
            </h3>
            {actions.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center bg-gray-50 rounded-lg">{t.noHistory}</p>
            ) : (
              <div className="space-y-3 max-h-60 md:max-h-48 overflow-y-auto">
                {actions.map((action, idx) => (
                  <div key={action.id || idx} className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="font-mono">{formatDate(action.createdAt)}</span>
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                        {action.type === "email_received" ? "📨" : action.type === "status_change" ? "🔄" : "📝"}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{action.content || action.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Detail Modal */}
      {selectedEmail && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 md:p-4"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-2xl max-h-[90vh] md:max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-4 border-b ${
              selectedEmail.isSent ? "bg-gradient-to-r from-green-50 to-white" : "bg-gradient-to-r from-blue-50 to-white"
            }`}>
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                {selectedEmail.isSent ? `📤 ${t.sentMail}` : `📥 ${t.receivedMail}`}
              </h3>
              <button onClick={() => setSelectedEmail(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-2 -mr-2">
                &times;
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto max-h-[70vh] md:max-h-[60vh] space-y-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">{t.subject}</span>
                <p className="font-semibold text-gray-900 break-words">{selectedEmail.subject}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">{t.from}</span>
                  <p className="text-gray-800 text-sm break-all">{selectedEmail.senderName} &lt;{selectedEmail.senderEmail}&gt;</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">{t.to}</span>
                  <p className="text-gray-800 text-sm break-all">{selectedEmail.recipients}</p>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wide">{t.body}</span>
                <div className="mt-2 p-3 md:p-4 bg-gray-50 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
                  {selectedEmail.body || t.noBody}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
