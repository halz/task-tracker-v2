"use client";

interface StatusBadgeProps {
  status: string;
  lang?: "ja" | "en";
}

const statusConfig = {
  ja: {
    new: { label: "新規", emoji: "📥", color: "bg-blue-100 text-blue-800" },
    draft_ready: { label: "下書き済", emoji: "✏️", color: "bg-yellow-100 text-yellow-800" },
    action_pending: { label: "ペンディング", emoji: "⏳", color: "bg-orange-100 text-orange-800" },
    waiting: { label: "返信待ち", emoji: "📤", color: "bg-purple-100 text-purple-800" },
    waiting_reply: { label: "返信待ち", emoji: "📤", color: "bg-purple-100 text-purple-800" },
    in_progress: { label: "対応中", emoji: "🔄", color: "bg-cyan-100 text-cyan-800" },
    on_hold: { label: "保留", emoji: "⏸️", color: "bg-amber-100 text-amber-800" },
    no_action: { label: "対処不要", emoji: "⏭️", color: "bg-slate-100 text-slate-600" },
    completed: { label: "完了", emoji: "✅", color: "bg-green-100 text-green-800" },
    projectized: { label: "プロジェクト化済み", emoji: "🗂️", color: "bg-indigo-100 text-indigo-800" },
    archived: { label: "アーカイブ", emoji: "📁", color: "bg-gray-100 text-gray-800" },
  },
  en: {
    new: { label: "New", emoji: "📥", color: "bg-blue-100 text-blue-800" },
    draft_ready: { label: "Draft Ready", emoji: "✏️", color: "bg-yellow-100 text-yellow-800" },
    action_pending: { label: "Pending", emoji: "⏳", color: "bg-orange-100 text-orange-800" },
    waiting: { label: "Waiting", emoji: "📤", color: "bg-purple-100 text-purple-800" },
    waiting_reply: { label: "Waiting", emoji: "📤", color: "bg-purple-100 text-purple-800" },
    in_progress: { label: "In Progress", emoji: "🔄", color: "bg-cyan-100 text-cyan-800" },
    on_hold: { label: "On Hold", emoji: "⏸️", color: "bg-amber-100 text-amber-800" },
    no_action: { label: "No Action", emoji: "⏭️", color: "bg-slate-100 text-slate-600" },
    completed: { label: "Done", emoji: "✅", color: "bg-green-100 text-green-800" },
    projectized: { label: "Projectized", emoji: "🗂️", color: "bg-indigo-100 text-indigo-800" },
    archived: { label: "Archived", emoji: "📁", color: "bg-gray-100 text-gray-800" },
  },
};

export function StatusBadge({ status, lang = "ja" }: StatusBadgeProps) {
  const langConfig = statusConfig[lang] || statusConfig.ja;
  const config = langConfig[status as keyof typeof langConfig] || { 
    label: status, 
    emoji: "❓", 
    color: "bg-gray-100 text-gray-800" 
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
