import { Fragment } from "react";
import { getSearchHighlightRanges } from "shared";

export function AdminSearchHighlight({ text, query }: { text: string; query: string }) {
  const ranges = getSearchHighlightRanges(text, query);
  if (!ranges.length) return <>{text}</>;
  let previous = 0;
  return <>{ranges.map(([start, end]) => {
    const before = text.slice(previous, start);
    previous = end;
    return <Fragment key={start}>{before}<mark className="rounded-sm bg-amber-100 text-slate-900">{text.slice(start, end)}</mark></Fragment>;
  })}{text.slice(previous)}</>;
}
