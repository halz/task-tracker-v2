"use client";

interface SourceIconProps {
  source: string | null;
}

export function SourceIcon({ source }: SourceIconProps) {
  const iconMap: Record<string, { icon: string; color: string }> = {
    email: { icon: "📧", color: "text-blue-500" },
    manual: { icon: "✍️", color: "text-gray-500" },
    phone: { icon: "📞", color: "text-green-500" },
    chat: { icon: "💬", color: "text-purple-500" },
  };

  const config = iconMap[source || "manual"] || iconMap.manual;

  return (
    <span className={`text-2xl ${config.color}`} title={source || "manual"}>
      {config.icon}
    </span>
  );
}
