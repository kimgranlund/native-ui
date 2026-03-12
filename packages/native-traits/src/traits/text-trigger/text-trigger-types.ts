export interface TextTriggerItem {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  /** Action when selected: 'tag' (styled pill, default), 'insert' (plain text), 'event' (host handles). */
  action?: 'tag' | 'insert' | 'event';
  /** Text to insert for action 'insert'. Defaults to label if omitted. */
  insertText?: string;
}

export interface TextTriggerOptions {
  input: HTMLElement;
  items: TextTriggerItem[];
}

export interface TextTriggerMatch {
  query: string;
  triggerNode: Text;
  triggerOffset: number;
  caretOffset: number;
}
