// Event detail type interfaces for all native:* custom events.
//
// Usage:
//   element.addEventListener('native:press', (e: CustomEvent<NPressDetail>) => {
//     console.log(e.detail.pointerType);
//   });

// ── Press ──
export interface NPressDetail {
  pointerType: string;
}

// ── Select (child → coordinator) ──
export interface NSelectDetail {
  value: string;
  label: string;
}

// ── Change (component public event — shape varies by component) ──

export interface NTextChangeDetail {
  value: string;
}

export interface NRangeValueDetail {
  value: number;
}

export interface NPickerChangeDetail {
  value: string;
  label: string;
}

export interface NToggleChangeDetail {
  checked: boolean;
  value: string;
}

// ── Input (live keystroke events) ──
export interface NInputDetail {
  value: string;
}

// ── Disabled ──
export interface NDisabledDetail {
  disabled: boolean;
}

// ── Drag / Drop ──
export interface NDragStartDetail {
  item: HTMLElement;
  index: number;
}

export interface NDragMoveDetail {
  item: HTMLElement;
  x: number;
  y: number;
}

export interface NDragOverDetail {
  item: HTMLElement | null;
  target?: HTMLElement;
  index: number;
  insertBefore?: HTMLElement | null;
}

export interface NDropDetail {
  item: HTMLElement;
  target?: HTMLElement | null;
  fromIndex: number;
  toIndex: number;
  insertBefore?: HTMLElement | null;
}

export interface NDragCancelDetail {
  item: HTMLElement;
}

// ── Validate ──
export interface NInvalidDetail {
  message: string;
  value: string;
}

export interface NValidDetail {
  value: string;
}

// ── Range Selection ──
export interface NRangeChangeDetail {
  startIndex: number;
  endIndex: number;
  items: HTMLElement[];
}

export interface NRangeSelectDetail {
  startIndex: number;
  endIndex: number;
  items: HTMLElement[];
}

// ── Drop Zone ──
export interface NFileDropDetail {
  files: File[];
  dataTransfer: DataTransfer;
}

export interface NTextDropDetail {
  text: string;
}

// ── Search ──
export interface NSearchDetail {
  query: string;
  matchCount: number;
  total: number;
}

// ── Clipboard ──
export interface NClipDetail {
  items: HTMLElement[];
  data: string;
  action: 'copy' | 'cut' | 'paste';
}

// ── Intersect ──
export interface NIntersectDetail {
  isIntersecting: boolean;
  ratio: number;
}

// ── Copy ──
export interface NCopyDetail {
  value: string;
}

// ── Virtual Scroll ──
export interface NVirtualChangeDetail {
  start: number;
  end: number;
  totalCount: number;
}

// ── Selection ──
export interface NSelectionChangeDetail {
  selected: HTMLElement[];
  count: number;
}

// ── Hover ──
export interface NHoverDetail {
  pointerType: string;
}

// ── Sort ──
export interface NSortDetail {
  column: string | null;
  direction: 'asc' | 'desc' | 'none';
}

// ── Swipe ──
export interface NSwipeDetail {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

// ── Toss ──
export interface NTossDetail {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  bounces: number;
  rotation: number;
}

export interface NBounceDetail {
  edge: 'left' | 'right' | 'top' | 'bottom';
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

// ── CSS Inspect ──
export interface NCSSInspectDetail {
  active: boolean;
  layers: number;
}

// ── Resize ──
export interface NResizeDetail {
  width: number;
  height: number;
  handle?: string | null;
  delta?: { dx: number; dy: number };
}

export interface NResizeCancelDetail {
  handle: string | null;
}

// ── Edit ──
export interface NEditStartDetail {
  value: string;
}

export interface NEditCommitDetail {
  value: string;
  previousValue: string;
}

export interface NEditCancelDetail {
  value: string;
}

// ── Pagination Dots ──
export interface NPaginationDotsChangeDetail {
  index: number;
}

// ── Slideshow ──
export interface NSlideChangeDetail {
  index: number;
  slide: HTMLElement;
}

// ── Chat ──
export interface NSendDetail {
  value: string;
}

// ── Toast ──
export interface NToastDetail {
  id: number;
  message: string;
  intent: 'info' | 'success' | 'warning' | 'danger';
}

// ── Table (component-specific) ──
export interface NTableSortDetail {
  column: string | null;
  direction: 'asc' | 'desc' | 'none';
}

export interface NTableSelectDetail {
  value: string;
  selected: boolean;
  allSelected: string[];
}

export interface NTableReorderDetail {
  row: HTMLElement;
  fromIndex: number;
  toIndex: number;
}

export interface NTableResizeDetail {
  column: number;
  width: number;
}

export interface NTableResizeEndDetail {
  column: number;
  width: number;
  allWidths: number[];
}

// ── Calendar (range mode) ──
export interface NCalendarRangeDetail {
  start: string | null;
  end: string | null;
}

// ── Shortcut ──
export interface NShortcutDetail {
  id: string;
  combo: string;
}

// ── Gripper ──
export interface NGripStartDetail {
  mode: string;
  placement: string;
  startValue: { width: number; height: number };
}

export interface NGripDetail {
  mode: string;
  placement: string;
  value: { width: number; height: number };
  delta: { dx: number; dy: number };
}

export interface NGripEndDetail {
  mode: string;
  placement: string;
  value: { width: number; height: number };
}

export interface NGripCancelDetail {
  mode: string;
  placement: string;
}
