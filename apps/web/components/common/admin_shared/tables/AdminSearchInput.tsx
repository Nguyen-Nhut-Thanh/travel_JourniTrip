"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRef } from "react";
import type { AdminSearchInputProps } from 'shared';

/** Hiển thị ô nhập từ khóa tìm kiếm có biểu tượng. */
export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  roundedClassName = "rounded-xl",
  className = "",
  inputClassName = "",
  inputRef,
  loading = false,
  ...props
}: AdminSearchInputProps) {
  const input = useRef<HTMLInputElement | null>(null);
  return (
    <div className={`relative ${className}`} aria-busy={loading || undefined}>
      {loading ? <Loader2 aria-label="Đang tìm kiếm" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={17} />
        : <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />}
      <input
        {...props}
        ref={element => {
          input.current = element;
          if (typeof inputRef === "function") inputRef(element);
          else if (inputRef) inputRef.current = element;
        }}
        type="search"
        maxLength={props.maxLength ?? 200}
        aria-label={props["aria-label"] ?? placeholder}
        placeholder={placeholder}
        className={`w-full min-w-0 border border-[#e1edfc] bg-white py-2 pl-9! pr-9! text-xs sm:text-sm font-medium outline-none transition-all focus:border-[#075bff] focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:appearance-none ${roundedClassName} ${inputClassName}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && <button type="button" disabled={props.disabled || props.readOnly} aria-label="Xóa từ khóa tìm kiếm" onClick={() => { onChange(""); input.current?.focus(); }} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed"><X size={14} /></button>}
    </div>
  );
}
