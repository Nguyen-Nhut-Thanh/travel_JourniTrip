"use client";

import { ArrowLeft, MapPin, Plane } from 'lucide-react';
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

const SECTIONS = [
  { id: 'tour-info', label: 'Thông tin cơ bản' },
  { id: 'tour-media', label: 'Hình ảnh & Media' },
  { id: 'tour-settings', label: 'Giá & Cài đặt' },
];

export function TourEditorShell({ title, description, onBack, children, sections = SECTIONS }: {
  title: string; description: string; onBack: () => void; children: ReactNode;
  sections?: ReadonlyArray<{ id: string; label: string }>;
}) {
  const [active, setActive] = useState(sections[0]?.id || '');
  const heroRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const hero = heroRef.current;
    const page = hero?.closest<HTMLElement>('[data-admin-page]');
    if (!hero || !page) return;
    const updatePosition = () => {
      const offset = Math.max(0, hero.getBoundingClientRect().top - page.getBoundingClientRect().top);
      hero.style.setProperty('--tour-editor-background-top', `${-offset}px`);
    };
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(hero);
    observer.observe(page);
    const breadcrumb = page.querySelector('[aria-label="Đường dẫn"]');
    if (breadcrumb) observer.observe(breadcrumb);
    return () => observer.disconnect();
  }, []);
  return <div className="relative isolate mx-auto w-full max-w-[1520px] px-4 pb-6 pt-3 md:px-6 md:pb-8 text-[#0b1747] before:absolute before:-z-[2] before:inset-x-[-28px] before:top-[-16px] before:bottom-0 before:content-[''] before:bg-[radial-gradient(ellipse_at_25%_8%,#fff_0%,#f2f7ff_44%,#eaf3ff_100%)] motion-reduce:[&_*]:transition-none! motion-reduce:[&_*]:scroll-auto! motion-reduce:[&_*::before]:transition-none! motion-reduce:[&_*::before]:scroll-auto!">
    <div ref={heroRef} className="relative isolate -mx-4 -mt-3 mb-4 min-h-[148px] px-4 pt-3 pb-3 sm:-mx-6 sm:px-6">
    <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-[1] overflow-hidden rounded-b-[20px] bg-[linear-gradient(110deg,#f8fbff,#edf6ff)]" style={{ top: 'var(--tour-editor-background-top, 0px)' }} aria-hidden="true">
    <div className="absolute inset-y-0 right-0 -z-[1] w-[56%] bg-no-repeat [background-image:linear-gradient(90deg,#f5faff_0%,#f5faffcc_18%,#f5faff00_55%),linear-gradient(0deg,#eff6ff_0%,#eff6ff00_38%),url('/images/about/hero-bay-traveler.png')] [background-size:auto,auto,200%_auto] [background-position:center,center,left_49%] max-sm:w-[66%] max-sm:opacity-50" aria-hidden="true" />
    <div className="pointer-events-none absolute top-0 right-[28%] h-[66px] w-[180px] text-[#5592b8] max-sm:hidden [&>svg:first-child]:h-full [&>svg:first-child]:w-full" aria-hidden="true">
      <svg viewBox="0 0 200 70" fill="none"><path d="M10 52C38 1 100-2 151 26" stroke="#a7cffc" strokeWidth="1.5" strokeDasharray="5 5" /></svg>
      <MapPin className="absolute top-[37px] left-0" size={18} fill="#5a9bfa" stroke="white" />
      <Plane className="absolute top-0 right-2 rotate-[17deg]" size={42} strokeWidth={1.4} fill="#dcefff" />
    </div>
    </div>
    <header className="relative min-h-[80px] pt-1 pb-2">
      <div className="flex max-w-[76%] items-start gap-3.5 max-sm:max-w-full">
        <button type="button" onClick={onBack} aria-label="Quay lại danh sách tour" className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl border border-[#e1edfc] bg-white text-[#627491] shadow-2xs hover:border-[#98bcfb] hover:text-[#075bff] transition"><ArrowLeft size={18} /></button>
        <div><h1 className="text-[24px] font-extrabold leading-[1.25] tracking-[-0.6px] text-[#07123e] max-sm:text-[22px]">{title}</h1><p className="mt-1 max-w-[620px] text-[13px] leading-[1.6] text-[#637da5] max-sm:text-[12px]">{description}</p></div>
      </div>
    </header>
    <nav className="relative flex items-center gap-2.5 max-sm:gap-1.5" aria-label="Đi đến phần thông tin tour">
      {sections.map((section, index) => <Fragment key={section.id}>
        {index > 0 && <span className="h-px w-5 shrink-0 bg-[#d5e4fa] max-sm:hidden" aria-hidden="true" />}
        <button type="button" className="group flex min-w-0 items-center gap-2 rounded-full border border-[#e1edfc] bg-white/90 px-3.5 py-2 text-[12px] font-semibold text-[#637da5] transition duration-150 hover:border-blue-200 hover:bg-blue-50/70 hover:text-[#075bff] aria-[current=location]:border-[#075bff] aria-[current=location]:bg-blue-50 aria-[current=location]:text-[#075bff] max-sm:flex-1 max-sm:justify-center max-sm:gap-1.5 max-sm:rounded-xl max-sm:px-2 max-sm:py-2 max-sm:text-[11px]" aria-current={active === section.id ? 'location' : undefined} onClick={() => {
          setActive(section.id);
          document.getElementById(section.id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
        }}><span className="grid size-5.5 shrink-0 place-items-center rounded-full border border-[#dce7f7] bg-white text-[11px] font-bold group-aria-[current=location]:border-[#075bff] group-aria-[current=location]:bg-[#075bff] group-aria-[current=location]:text-white group-aria-[current=location]:shadow-xs">{index + 1}</span>{section.label}</button>
      </Fragment>)}
    </nav>
    </div>
    {children}
    <svg className="pointer-events-none absolute right-[-20px] bottom-0 -z-[1] h-[180px] w-[60%] opacity-60" viewBox="0 0 700 200" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 200 145 135 205 160 330 55 400 100 490 20 580 95 640 75 700 110V200Z" fill="#e0edfd" />
      <path d="m190 200 180-105 32 25 83-84 55 77 52-24L700 159v41Z" fill="#cde3fc" />
      <path d="m437 87 48-51 34 48-24-9-10 8-11-17-17 26Z" fill="#f8fbff" />
      <path d="m310 200 170-68 53 25 90-34 77 48v29Z" fill="#b8d6f7" />
    </svg>
  </div>;
}
