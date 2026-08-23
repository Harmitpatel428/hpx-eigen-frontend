import type { LeadStage } from '../types';

// Per-user Sales Dashboard UI preferences. No backend user-preferences API exists,
// so these follow the existing hpx:ui:v1:* localStorage convention.
// ponytail: per-browser only — move to a user-preferences API if multi-device sync is needed

const COLOURFUL_KEY = 'hpx:ui:v1:salesDashboardColourful';
const STAGE_FILTER_KEY = 'sales_dashboard_stage_filter';

/** Colourful pill filters — ON by default, OFF gives the clean/minimal look */
export function loadColourfulFilters(): boolean {
  try { return localStorage.getItem(COLOURFUL_KEY) !== 'off'; } catch { return true; }
}

export function saveColourfulFilters(on: boolean): void {
  try { localStorage.setItem(COLOURFUL_KEY, on ? 'on' : 'off'); } catch {}
}

/**
 * Selected stage filter. Session-scoped (sessionStorage): survives refresh,
 * cleared on logout and tab close — fresh sessions start on NEW.
 */
export function loadStageFilter(): LeadStage | '' {
  try {
    const raw = sessionStorage.getItem(STAGE_FILTER_KEY);
    if (raw === '') return '';
    return (raw as LeadStage) || 'NEW';
  } catch { return 'NEW'; }
}

export function saveStageFilter(stage: LeadStage | ''): void {
  try { sessionStorage.setItem(STAGE_FILTER_KEY, stage); } catch {}
}

export function clearStageFilter(): void {
  try { sessionStorage.removeItem(STAGE_FILTER_KEY); } catch {}
}
