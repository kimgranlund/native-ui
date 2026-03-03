import { define } from '../../core/define.ts';
import { NSlide } from './slide-element.ts';
import { NSlideshow } from './slideshow-element.ts';
// WHY: slideshow stamps <n-pagination-dots> children — ensure it's defined
import '../pagination-dots/n-pagination-dots.ts';

define('n-slide', NSlide);
define('n-slideshow', NSlideshow);

export { NSlide, NSlideshow };
