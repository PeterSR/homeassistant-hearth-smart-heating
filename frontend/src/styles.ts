import { css } from "lit";

// ---------------------------------------------------------------------------
// Design tokens
//
// We use HA's built-in tokens wherever possible (--ha-space-*, --ha-font-size-*,
// --ha-font-weight-*, --ha-border-radius-*). These inherit through shadow DOM
// and automatically respect the user's HA theme.
//
// HA token reference (from computed styles):
//   Spacing:       --ha-space-1 (4px) through --ha-space-20 (80px), in 4px steps
//   Font sizes:    --ha-font-size-xs (10px), -s (12px), -m (14px), -l (16px),
//                  -xl (20px), -2xl (24px), -3xl (28px), -4xl (32px), -5xl (40px)
//   Font weights:  --ha-font-weight-light (300), -normal (400), -medium (500),
//                  -bold (700), -heading (700)
//   Border radius: --ha-border-radius-sm (4px), -md (8px), -lg (12px),
//                  -xl (16px), -2xl (20px), -pill (9999px)
//   Shadows:       --ha-box-shadow-s, -m, -l
//
// Only define hearth-specific tokens for values HA doesn't provide.
// ---------------------------------------------------------------------------

export const tokens = css`
  :host {
    /* Font sizes between HA's scale steps */
    --hearth-text-between-xs-s: 11px; /* between ha-font-size-xs (10) and -s (12) */
    --hearth-text-between-s-m: 13px; /* between ha-font-size-s (12) and -m (14) */

    /* Temperature display - larger than HA's biggest (40px) */
    --hearth-text-temp-hero: 48px;

    /* Mode colors - single source of truth for all status/mode indicators */
    --hearth-color-home: #039be5;       /* Blue - comfortable / active heating */
    --hearth-color-away: #9e9e9e;       /* Gray - reduced / unoccupied */
    --hearth-color-schedule: #7e57c2;   /* Purple - following schedule */
    --hearth-color-vacation: #ffb300;   /* Amber - vacation mode */
    --hearth-color-manual: #ff5722;     /* Red-orange - manual override */
    --hearth-color-off: #bdbdbd;        /* Light gray - disabled */
    --hearth-color-now: #e91e63;        /* Pink - current time marker */
  }
`;

// ---------------------------------------------------------------------------
// Reusable style fragments - import into components as needed
// ---------------------------------------------------------------------------

/** Base styles applied to all panel views (not Lovelace card) */
export const viewStyles = css`
  :host {
    display: block;
    padding: var(--ha-space-4, 16px);
    font-family: var(--ha-font-family-body, Roboto, Noto, sans-serif);
    color: var(--primary-text-color);
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }
`;

/** Card grid layout */
export const gridStyles = css`
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--ha-space-4, 16px);
  }
`;

/** Horizontal button/action bar */
export const actionBarStyles = css`
  .action-bar {
    display: flex;
    gap: var(--ha-space-2, 8px);
    margin-top: var(--ha-space-4, 16px);
    flex-wrap: wrap;
  }
`;

/** Mode badge pill - used on cards and in detail views */
export const modeBadgeStyles = css`
  .mode-badge {
    display: inline-block;
    padding: 2px var(--ha-space-2, 8px);
    border-radius: var(--ha-border-radius-lg, 12px);
    font-size: var(--hearth-text-between-s-m, 13px);
    font-weight: var(--ha-font-weight-medium, 500);
    text-transform: capitalize;
    color: white;
  }
  .mode-badge.home {
    background: var(--hearth-color-home, #039be5);
  }
  .mode-badge.away {
    background: var(--hearth-color-away, #9e9e9e);
  }
  .mode-badge.off {
    background: var(--hearth-color-off, #bdbdbd);
  }
  .mode-badge.vacation {
    background: var(--hearth-color-vacation, #ffb300);
  }
  .mode-badge.override {
    background: var(--hearth-color-manual, #ff5722);
    cursor: pointer;
  }
`;

/** Temperature display - large hero temp + unit superscript */
export const tempDisplayStyles = css`
  .temp-display {
    font-size: var(--hearth-text-temp-hero, 48px);
    font-weight: var(--ha-font-weight-light, 300);
    text-align: center;
  }
  .temp-unit {
    font-size: var(--ha-font-size-2xl, 24px);
    vertical-align: super;
  }
`;

/** Secondary/meta text */
export const secondaryTextStyles = css`
  .secondary-text {
    font-size: var(--ha-font-size-m, 14px);
    color: var(--secondary-text-color);
    margin-top: var(--ha-space-1, 4px);
  }
`;

/** Section with uppercase label heading */
export const sectionStyles = css`
  .section {
    margin-bottom: var(--ha-space-6, 24px);
  }
  .section h3 {
    font-size: var(--ha-font-size-m, 14px);
    font-weight: var(--ha-font-weight-medium, 500);
    text-transform: uppercase;
    color: var(--secondary-text-color);
    margin: 0 0 var(--ha-space-2, 8px);
  }
`;

/** Empty state centered message */
export const emptyStateStyles = css`
  .empty-state {
    text-align: center;
    padding: var(--ha-space-12, 48px) var(--ha-space-4, 16px);
    color: var(--secondary-text-color);
  }
  .empty-state h2 {
    font-weight: var(--ha-font-weight-normal, 400);
    margin-bottom: var(--ha-space-2, 8px);
  }
`;

/** Dialog overlay + card shell - shared by all dialogs */
export const dialogStyles = css`
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog-card {
    width: 90%;
    max-width: 480px;
    max-height: 80vh;
    overflow-y: auto;
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--ha-space-4, 16px) var(--ha-space-4, 16px) 0;
  }
  .dialog-header h2 {
    margin: 0;
    font-size: var(--ha-font-size-xl, 20px);
    font-weight: var(--ha-font-weight-medium, 500);
  }
  .dialog-body {
    padding: var(--ha-space-4, 16px);
  }
  .dialog-content {
    padding: var(--ha-space-6, 24px) var(--ha-space-6, 24px) var(--ha-space-2, 8px);
  }
  .dialog-content h3 {
    margin: 0;
    font-size: var(--ha-font-size-l, 16px);
    font-weight: var(--ha-font-weight-normal, 400);
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--ha-space-2, 8px);
    padding: var(--ha-space-4, 16px);
    border-top: 1px solid var(--divider-color, #e0e0e0);
    margin-top: var(--ha-space-2, 8px);
  }
`;

/** Form field + input styling for dialogs */
export const formStyles = css`
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-4, 16px);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-1, 4px);
    font-size: var(--hearth-text-between-s-m, 13px);
    font-weight: var(--ha-font-weight-medium, 500);
    color: var(--secondary-text-color);
  }
  .field input,
  .field select {
    padding: var(--ha-space-2, 8px) var(--ha-space-4, 16px);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: var(--ha-border-radius-md, 8px);
    font-size: var(--ha-font-size-m, 14px);
    background: var(--card-background-color, white);
    color: var(--primary-text-color);
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-1, 4px);
  }
  .field-group > label:first-child {
    font-size: var(--hearth-text-between-s-m, 13px);
    font-weight: var(--ha-font-weight-medium, 500);
    color: var(--secondary-text-color);
    margin-bottom: var(--ha-space-1, 4px);
  }
  .checkbox-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--ha-space-2, 8px);
    font-size: var(--ha-font-size-m, 14px);
    color: var(--primary-text-color);
  }
`;
