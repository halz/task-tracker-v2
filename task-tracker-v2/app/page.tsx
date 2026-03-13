"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/db/schema";
import { TaskList } from "@/components/task-list";
import { TaskDetail } from "@/components/task-detail";

type FilterStatus = "active" | "new" | "in_progress" | "waiting" | "no_action" | "completed";
type Language = "ja" | "en";

const TRANSLATIONS = {
  ja: {
    title: "タスクトラッカー",
    items: "件",
    active: "未完了",
    new: "新規",
    in_progress: "対応中",
    waiting: "返信待ち",
    no_action: "対処不要",
    completed: "完了",
    loading: "読み込み中...",
    selectTask: "左のリストからタスクを選択してください",
    backToList: "タスク一覧に戻る",
    lang: "🌐 EN",
    search: "検索...",
    searchResults: "検索結果",
    clearSearch: "クリア",
  },
  en: {
    title: "Task Tracker",
    items: "items",
    active: "Active",
    new: "New",
    in_progress: "In Progress",
    waiting: "Waiting",
    no_action: "No Action",
    completed: "Done",
    loading: "Loading...",
    selectTask: "Select a task from the list",
    backToList: "Back to list",
    lang: "🌐 日本語",
    search: "Search...",
    searchResults: "Search Results",
    clearSearch: "Clear",
  },
};

const getFilters = (t: typeof TRANSLATIONS.ja) => [
  { key: "active" as FilterStatus, label: t.active, icon: "📌", color: "bg-gray-100 text-gray-700 border-gray-300" },
  { key: "new" as FilterStatus, label: t.new, icon: "📥", color: "bg-blue-100 text-blue-700 border-blue-400" },
  { key: "in_progress" as FilterStatus, label: t.in_progress, icon: "🔄", color: "bg-cyan-100 text-cyan-700 border-cyan-400" },
  { key: "waiting" as FilterStatus, label: t.waiting, icon: "📤", color: "bg-orange-100 text-orange-700 border-orange-400" },
  { key: "no_action" as FilterStatus, label: t.no_action, icon: "⏭️", color: "bg-slate-100 text-slate-700 border-slate-400" },
  { key: "completed" as FilterStatus, label: t.completed, icon: "✅", color: "bg-green-100 text-green-700 border-green-400" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("active");
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>("ja");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Task[] | null>(null);
  const [searching, setSearching] = useState(false);

  const t = TRANSLATIONS[lang];
  const FILTERS = getFilters(t);

  // Load language preference
  useEffect(() => {
    const saved = localStorage.getItem("tasktracker-lang");
    if (saved === "en" || saved === "ja") setLang(saved);
  }, []);

  const toggleLang = () => {
    const newLang = lang === "ja" ? "en" : "ja";
    setLang(newLang);
    localStorage.setItem("tasktracker-lang", newLang);
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  // Search function with debounce
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/tasks/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.tasks || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks, selectedTask]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // Determine which tasks to display
  const HIDDEN_FROM_ACTIVE = new Set(["completed", "no_action", "projectized"]);

  const displayTasks = searchResults !== null 
    ? searchResults 
    : filter === "active"
      ? tasks.filter((t) => !HIDDEN_FROM_ACTIVE.has(t.status))
      : tasks.filter((t) => t.status === filter);

  const activeTasks = tasks.filter((t) => !HIDDEN_FROM_ACTIVE.has(t.status));

  const taskCounts: Record<FilterStatus, number> = {
    active: activeTasks.length,
    new: tasks.filter(t => t.status === "new").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    waiting: tasks.filter(t => t.status === "waiting").length,
    no_action: tasks.filter(t => t.status === "no_action").length,
    completed: tasks.filter(t => t.status === "completed").length,
  };

  const showMobileDetail = selectedTask !== null;

  return (
    <main className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className={`bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex-shrink-0 ${showMobileDetail ? 'hidden md:block' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">📋 {t.title}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="px-2 py-1 text-xs md:text-sm rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              {t.lang}
            </button>
            <span className="text-xs md:text-sm text-gray-500">{activeTasks.length} {t.items}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </span>
              )}
            </div>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t.clearSearch}
              </button>
            )}
          </div>
          {searchResults !== null && (
            <div className="mt-2 text-sm text-purple-600 font-medium">
              🔎 {t.searchResults}: {searchResults.length} {t.items}
            </div>
          )}
        </div>

        {/* Filters - hide when searching */}
        {searchResults === null && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
            {FILTERS.map((f) => {
              const isActive = filter === f.key;
              const count = taskCounts[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? `${f.color} shadow-sm`
                      : "bg-white text-gray-500 border-transparent hover:bg-gray-50"
                  }`}
                >
                  {f.icon} {f.label}
                  {count > 0 && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${isActive ? "bg-white/50" : "bg-gray-100"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Mobile Header when viewing detail */}
      {showMobileDetail && (
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <button
            onClick={() => setSelectedTask(null)}
            className="flex items-center gap-2 text-blue-600 font-medium"
          >
            <span className="text-xl">←</span>
            <span>{t.backToList}</span>
          </button>
        </header>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Task List */}
        <div className={`w-full md:w-96 border-r border-gray-200 bg-white overflow-y-auto md:flex-shrink-0 ${showMobileDetail ? 'hidden md:block' : ''}`}>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
              <p>{t.loading}</p>
            </div>
          ) : (
            <TaskList
              tasks={displayTasks}
              onSelect={setSelectedTask}
              selectedId={selectedTask?.id}
              lang={lang}
              onTitleUpdated={fetchTasks}
            />
          )}
        </div>

        {/* Right Pane - Task Detail */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${!showMobileDetail ? 'hidden md:block' : ''}`}>
          {selectedTask ? (
            <TaskDetail
              task={selectedTask}
              onBack={() => setSelectedTask(null)}
              onUpdate={fetchTasks}
              lang={lang}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">👈</div>
                <p>{t.selectTask}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
