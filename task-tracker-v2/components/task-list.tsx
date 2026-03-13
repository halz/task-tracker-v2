"use client";

import { useState } from "react";
import type { Task } from "@/db/schema";
import { StatusBadge } from "./status-badge";
import { SourceIcon } from "./source-icon";

type TaskListItem = Task & {
  woNumber?: string | null;
  siteName?: string | null;
  updatedAt?: string | number | Date | null;
};

interface TaskListProps {
  tasks: TaskListItem[];
  onSelect: (task: TaskListItem) => void;
  selectedId?: string;
  lang?: "ja" | "en";
  onTitleUpdated?: () => Promise<void> | void;
}

const TRANSLATIONS = {
  ja: {
    noTasks: "タスクがありません",
    high: "高",
    medium: "中",
    low: "低",
    edit: "編集",
    save: "保存",
    cancel: "キャンセル",
    saving: "保存中...",
  },
  en: {
    noTasks: "No tasks",
    high: "High",
    medium: "Med",
    low: "Low",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving...",
  },
};

// Priority-based styling for visibility
const getPriorityStyles = (priority: string | null, isSelected: boolean) => {
  const p = priority || "medium";
  if (isSelected) {
    return "bg-blue-50 border-l-blue-500";
  }
  switch (p) {
    case "high":
      return "bg-gradient-to-r from-red-50 to-white border-l-red-500 hover:from-red-100 hover:to-red-50";
    case "medium":
      return "bg-gradient-to-r from-yellow-50 to-white border-l-yellow-500 hover:from-yellow-100 hover:to-yellow-50";
    case "low":
      return "bg-gradient-to-r from-blue-50 to-white border-l-blue-400 hover:from-blue-100 hover:to-blue-50";
    default:
      return "bg-white border-l-gray-300 hover:bg-gray-50";
  }
};

// Status-based left border accent
const getStatusAccent = (status: string, isSelected: boolean) => {
  if (isSelected) return ""; // Already handled by priority
  switch (status) {
    case "new":
      return "ring-1 ring-inset ring-blue-200";
    case "in_progress":
      return "ring-1 ring-inset ring-cyan-200";
    case "waiting":
      return "ring-1 ring-inset ring-orange-200";
    case "no_action":
      return "ring-1 ring-inset ring-slate-200 opacity-60";
    case "completed":
      return "ring-1 ring-inset ring-green-200 opacity-50";
    default:
      return "";
  }
};

const PriorityBadge = ({ priority, lang = "ja" }: { priority: string | null; lang?: "ja" | "en" }) => {
  const t = TRANSLATIONS[lang];
  const config = {
    high: { icon: "🔴", label: t.high, color: "bg-red-100 text-red-700 ring-1 ring-red-300" },
    medium: { icon: "🟡", label: t.medium, color: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300" },
    low: { icon: "🔵", label: t.low, color: "bg-blue-100 text-blue-700 ring-1 ring-blue-300" },
  };
  const p = priority || "medium";
  const c = config[p as keyof typeof config] || config.medium;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
};

export function TaskList({ tasks, onSelect, selectedId, lang = "ja", onTitleUpdated }: TaskListProps) {
  const t = TRANSLATIONS[lang];
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">📭</div>
        {t.noTasks}
      </div>
    );
  }

  const startEdit = (task: TaskListItem) => {
    setEditingTaskId(task.id);
    setTitleInput(task.title || "");
  };

  const handleSelect = (task: TaskListItem) => {
    // While editing, lock navigation to avoid losing context
    if (editingTaskId && editingTaskId !== task.id) return;
    onSelect(task);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setTitleInput("");
  };

  const saveTitle = async (taskId: string) => {
    const normalized = titleInput.trim();
    if (!normalized) return;

    setSavingTaskId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: normalized }),
      });

      if (!res.ok) throw new Error(`Failed to update title (${res.status})`);

      await onTitleUpdated?.();
      setEditingTaskId(null);
      setTitleInput("");
    } catch (error) {
      console.error("Failed to update task title:", error);
      alert(lang === "ja" ? "タスク名の更新に失敗しました" : "Failed to update task title");
    } finally {
      setSavingTaskId(null);
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {tasks.map((task) => {
        const isSelected = task.id === selectedId;
        const isEditing = editingTaskId === task.id;
        const isSaving = savingTaskId === task.id;
        const priorityStyles = getPriorityStyles(task.priority, isSelected);
        const statusAccent = getStatusAccent(task.status, isSelected);

        return (
          <div
            key={task.id}
            onClick={() => handleSelect(task)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEdit(task);
            }}
            className={`p-4 cursor-pointer transition-all duration-200 border-l-4 ${priorityStyles} ${statusAccent} ${
              isSelected ? "shadow-md scale-[1.01]" : "hover:shadow-sm active:scale-[0.99]"
            } ${editingTaskId && editingTaskId !== task.id ? "opacity-60" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <SourceIcon source={task.source} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                  <span className="truncate">
                    {task.updatedAt ? new Date(task.updatedAt).toLocaleString("sv-SE", { hour12: false }).slice(0, 16) : "-"}
                  </span>
                  <span className="font-semibold text-gray-600 whitespace-nowrap">WO#{task.woNumber || "—"}</span>
                </div>

                {isEditing ? (
                  <div className="mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveTitle(task.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveTitle(task.id)}
                        disabled={isSaving || !titleInput.trim()}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSaving ? t.saving : t.save}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <h3
                      className={`font-semibold truncate flex-1 ${
                        isSelected ? "text-blue-900" : task.status === "no_action" ? "text-gray-500" : "text-gray-900"
                      }`}
                    >
                      {task.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(task);
                      }}
                      disabled={!!editingTaskId && editingTaskId !== task.id}
                      className="px-1.5 py-0.5 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={t.edit}
                    >
                      ✏️
                    </button>
                  </div>
                )}

                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className={`truncate ${task.status === "no_action" ? "text-gray-400" : "text-gray-600"}`}>
                    {task.siteName || "Unknown site"}
                  </span>
                  <span className={`truncate ${task.status === "no_action" ? "text-gray-400" : "text-gray-500"}`}>
                    {task.counterparty || "Unknown sender"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <StatusBadge status={task.status} lang={lang} />
                  <PriorityBadge priority={task.priority} lang={lang} />
                </div>
              </div>
              {task.priority === "high" && (
                <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" title="High Priority" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
