// Event detail type interfaces for all ui-* custom events.
//
// Usage:
//   element.addEventListener('ui-press', (e: CustomEvent<UIPressDetail>) => {
//     console.log(e.detail.pointerType);
//   });

// ── Press ──
export interface UIPressDetail {
  pointerType: string;
}

// ── Select (child → coordinator) ──
export interface UISelectDetail {
  value: string;
  label: string;
}

// ── Change (component public event — shape varies by component) ──

export interface UITextChangeDetail {
  value: string;
}

export interface UIRangeValueDetail {
  value: number;
}

export interface UIPickerChangeDetail {
  value: string;
  label: string;
}

export interface UIToggleChangeDetail {
  checked: boolean;
  value: string;
}

// ── Input (live keystroke events) ──
export interface UIInputDetail {
  value: string;
}

// ── Disabled ──
export interface UIDisabledDetail {
  disabled: boolean;
}

// ── Drag / Drop ──
export interface UIDragStartDetail {
  item: HTMLElement;
  index: number;
}

export interface UIDragMoveDetail {
  item: HTMLElement;
  x: number;
  y: number;
}

export interface UIDragOverDetail {
  item: HTMLElement | null;
  target?: HTMLElement;
  index: number;
  insertBefore?: HTMLElement | null;
}

export interface UIDropDetail {
  item: HTMLElement;
  target?: HTMLElement | null;
  fromIndex: number;
  toIndex: number;
  insertBefore?: HTMLElement | null;
}

export interface UIDragCancelDetail {
  item: HTMLElement;
}

// ── Validate ──
export interface UIInvalidDetail {
  message: string;
  value: string;
}

export interface UIValidDetail {
  value: string;
}

// ── Range Selection ──
export interface UIRangeChangeDetail {
  startIndex: number;
  endIndex: number;
  items: HTMLElement[];
}

export interface UIRangeSelectDetail {
  startIndex: number;
  endIndex: number;
  items: HTMLElement[];
}

// ── Drop Zone ──
export interface UIFileDropDetail {
  files: File[];
  dataTransfer: DataTransfer;
}

export interface UITextDropDetail {
  text: string;
}

// ── Search ──
export interface UISearchDetail {
  query: string;
  matchCount: number;
  total: number;
}

// ── Clipboard ──
export interface UIClipDetail {
  items: HTMLElement[];
  data: string;
  action: 'copy' | 'cut' | 'paste';
}

// ── Intersect ──
export interface UIIntersectDetail {
  isIntersecting: boolean;
  ratio: number;
}

// ── Copy ──
export interface UICopyDetail {
  value: string;
}

// ── Virtual Scroll ──
export interface UIVirtualChangeDetail {
  start: number;
  end: number;
  totalCount: number;
}

// ── Selection ──
export interface UISelectionChangeDetail {
  selected: HTMLElement[];
  count: number;
}

// ── Hover ──
export interface UIHoverDetail {
  pointerType: string;
}

// ── Sort ──
export interface UISortDetail {
  column: string | null;
  direction: 'asc' | 'desc' | 'none';
}

// ── Swipe ──
export interface UISwipeDetail {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
}

// ── Resize ──
export interface UIResizeDetail {
  width: number;
  height: number;
}

// ── Edit ──
export interface UIEditStartDetail {
  value: string;
}

export interface UIEditCommitDetail {
  value: string;
  previousValue: string;
}

export interface UIEditCancelDetail {
  value: string;
}

// ── Slideshow ──
export interface UISlideChangeDetail {
  index: number;
  slide: HTMLElement;
}

// ── Chat ──
export interface UISendDetail {
  value: string;
}

// ── Toast ──
export interface UIToastDetail {
  id: number;
  message: string;
  intent: 'info' | 'success' | 'warning' | 'danger';
}

// ── Table (component-specific) ──
export interface UITableSortDetail {
  column: string | null;
  direction: 'asc' | 'desc' | 'none';
}

export interface UITableSelectDetail {
  value: string;
  selected: boolean;
  allSelected: string[];
}

export interface UITableReorderDetail {
  row: HTMLElement;
  fromIndex: number;
  toIndex: number;
}

export interface UITableResizeDetail {
  column: number;
  width: number;
}

export interface UITableResizeEndDetail {
  column: number;
  width: number;
  allWidths: number[];
}

// ── Calendar (range mode) ──
export interface UICalendarRangeDetail {
  start: string | null;
  end: string | null;
}
