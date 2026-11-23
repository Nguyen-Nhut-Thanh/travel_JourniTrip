"use client";

import { Bot, Compass, Headset, Sparkles, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const actions = [
  { id: "ai", label: "Chatbot AI tư vấn", angle: -90, icon: Bot, color: "from-blue-600 to-indigo-600 shadow-indigo-500/30" },
  { id: "staff", label: "Nhân viên tư vấn", angle: -120, icon: Headset, color: "from-emerald-500 to-teal-600 shadow-emerald-500/30" },
  { id: "explore", label: "Tìm tour du lịch", angle: -150, icon: Compass, color: "from-amber-500 to-orange-600 shadow-amber-500/30" },
  { id: "deals", label: "Khám phá ưu đãi", angle: -180, icon: Sparkles, color: "from-violet-600 to-rose-600 shadow-violet-500/30" },
] as const;

export type ChatAction = (typeof actions)[number]["id"];

export function ChatActionMenu({ chatOpen, unread, onCloseChat, onSelect }: {
  chatOpen: boolean;
  unread: number;
  onCloseChat: () => void;
  onSelect: (action: ChatAction) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuId = useId();
  const visible = expanded && !chatOpen;
  const clearCloseTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  useEffect(() => () => clearCloseTimer(), []);
  useEffect(() => {
    if (!visible) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setExpanded(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [visible]);

  return (
    <div
      ref={wrapper}
      className="relative ml-auto flex h-[58px] w-[58px] items-center justify-center select-none"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse" || chatOpen) return;
        clearCloseTimer();
        setExpanded(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        clearCloseTimer();
        closeTimer.current = setTimeout(() => {
          if (!wrapper.current?.contains(document.activeElement)) setExpanded(false);
        }, 180);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && visible) {
          event.stopPropagation();
          setExpanded(false);
          trigger.current?.focus();
        }
      }}
    >
      {visible && <div aria-hidden="true" className="absolute bottom-0 right-0 h-[170px] w-[170px] rounded-tl-full" />}
      <div id={menuId} role="group" aria-label="Chức năng hỗ trợ du lịch">
        {actions.map(({ id, label, angle, icon: Icon, color }, index) => (
          <div
            key={id}
            style={{
              transform: `translate(${visible ? Math.round(Math.cos(angle * Math.PI / 180) * 112) : 0}px, ${visible ? Math.round(Math.sin(angle * Math.PI / 180) * 112) : 0}px) scale(${visible ? 1 : 0.3})`,
              transitionDelay: visible ? `${index * 45}ms` : "0ms",
            }}
            className={`group/action absolute left-[5px] top-[5px] z-10 transition-all duration-300 motion-reduce:transition-none ${visible ? "opacity-100" : "pointer-events-none invisible opacity-0"}`}
          >
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-max max-w-[45vw] -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-1.5 text-center text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100">
              {label}
            </span>
            <button
              type="button"
              aria-label={label}
              tabIndex={visible ? 0 : -1}
              onClick={() => {
                clearCloseTimer();
                setExpanded(false);
                onSelect(id);
              }}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${color} text-white shadow-lg ring-2 ring-white transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 motion-reduce:transition-none`}
            >
              <Icon className="h-5 w-5" />
              {id === "staff" && unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
            </button>
          </div>
        ))}
      </div>
      <button
        ref={trigger}
        type="button"
        aria-label={chatOpen ? "Đóng chat" : `Trợ lý du lịch${unread ? `, ${unread} tin chưa đọc` : ""}`}
        aria-expanded={chatOpen || visible}
        aria-controls={chatOpen ? undefined : menuId}
        onClick={() => {
          clearCloseTimer();
          if (chatOpen) {
            setExpanded(false);
            onCloseChat();
          } else setExpanded((value) => !value);
        }}
        className="relative z-20 flex h-[50px] w-[50px] items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-600/30 ring-2 ring-white/90 transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 motion-reduce:transition-none"
      >
        <Bot className={`h-6 w-6 transition-all duration-300 motion-reduce:transition-none ${chatOpen || visible ? "rotate-90 scale-0 opacity-0" : "scale-100 opacity-100"}`} />
        <X className={`absolute h-6 w-6 transition-all duration-300 motion-reduce:transition-none ${chatOpen || visible ? "scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
        {!chatOpen && !visible && unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-xs font-bold ring-2 ring-white">{unread > 99 ? "99+" : unread}</span>}
      </button>
    </div>
  );
}
