import { define } from '../../core/define.ts';
import { UIAccordionItem } from './ui-accordion-item-element.ts';
import { UIAccordion } from './ui-accordion-element.ts';

// WHY: Children registered FIRST so they upgrade before parent's setup() queries them
define('ui-accordion-item', UIAccordionItem);
define('ui-accordion', UIAccordion);

export { UIAccordionItem, UIAccordion };
