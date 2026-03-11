import { define } from '@nonoun/native-core';
import { NAccordionItem } from './accordion-item-element.ts';
import { NAccordion } from './accordion-element.ts';

// WHY: Children registered FIRST so they upgrade before parent's setup() queries them
define('n-accordion-item', NAccordionItem);
define('n-accordion', NAccordion);

export { NAccordionItem, NAccordion };
