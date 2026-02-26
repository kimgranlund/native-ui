import { define } from '../../core/define.ts';
import { UITableCell } from './ui-table-cell-element.ts';
import { UITableHeader } from './ui-table-header-element.ts';
import { UITableRow } from './ui-table-row-element.ts';
import { UITableHead } from './ui-table-head-element.ts';
import { UITableBody } from './ui-table-body-element.ts';
import { UITable } from './ui-table-element.ts';

// WHY: Children first — cells/rows before head/body before table
define('ui-table-cell', UITableCell);
define('ui-table-header', UITableHeader);
define('ui-table-row', UITableRow);
define('ui-table-head', UITableHead);
define('ui-table-body', UITableBody);
define('ui-table', UITable);

export { UITableCell, UITableHeader, UITableRow, UITableHead, UITableBody, UITable };
