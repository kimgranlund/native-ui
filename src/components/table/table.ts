import { define } from '@nonoun/native-core';
import { NTableCell } from './table-cell-element.ts';
import { NTableHeader } from './table-header-element.ts';
import { NTableRow } from './table-row-element.ts';
import { NTableHead } from './table-head-element.ts';
import { NTableBody } from './table-body-element.ts';
import { NTable } from './table-element.ts';

// WHY: Children first — cells/rows before head/body before table
define('n-table-cell', NTableCell);
define('n-table-header', NTableHeader);
define('n-table-row', NTableRow);
define('n-table-head', NTableHead);
define('n-table-body', NTableBody);
define('n-table', NTable);

export { NTableCell, NTableHeader, NTableRow, NTableHead, NTableBody, NTable };
