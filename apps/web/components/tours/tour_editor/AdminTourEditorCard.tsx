import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function TourEditorCard({
  id,
  title,
  description,
  icon: Icon,
  art: Art,
  headerAction,
  compact = false,
  fillHeight = false,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  art?: LucideIcon;
  headerAction?: ReactNode;
  compact?: boolean;
  fillHeight?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`min-w-0 scroll-mt-5 rounded-[14px] border border-[#e1edfc] bg-white shadow-sm ${
        fillHeight ? 'lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden' : ''
      }`}
    >
      <div
        className={`relative border-b border-[#edf2fb] ${
          fillHeight ? 'lg:shrink-0' : ''
        } ${
          compact ? 'px-4 py-3' : 'px-4 py-3.5 sm:px-5 sm:py-3.5'
        } ${
          headerAction ? 'grid items-center min-[560px]:grid-cols-[minmax(0,1fr)_auto] gap-2.5' : 'flex items-center'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
            <Icon size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[16px] font-[750] leading-[1.5] text-[#0b1747]">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-[12px] leading-[1.5] text-[#7387aa]">
                {description}
              </p>
            )}
          </div>
          {Art && (
            <Art
              className="ml-auto hidden rotate-[-12deg] text-[#b3d6fc] sm:block opacity-40"
              size={44}
              strokeWidth={1.2}
              aria-hidden="true"
            />
          )}
        </div>
        {headerAction && <div className="min-w-0">{headerAction}</div>}
      </div>
      <div
        className={`min-w-0 ${
          compact ? 'p-3.5 sm:p-4' : 'p-4 sm:p-5'
        } ${
          fillHeight ? 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden' : ''
        }`}
      >
        {children}
      </div>
    </section>
  );
}
