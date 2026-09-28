import type { ColumnDef, Row } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

/** Row-selection column. Kept here so every table gets identical behaviour. */
export function selectionColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: 'select',
    size: 40,
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(v) => table.toggleAllPageRowsSelected(Boolean(v))}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(v) => row.toggleSelected(Boolean(v))}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
  };
}

/**
 * Filter function for the multi-select faceted filters: keep a row when its
 * value is one of the selected values. An empty selection means "no filter".
 */
export function arrIncludes<T>(row: Row<T>, columnId: string, value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return true;
  return (value as string[]).includes(String(row.getValue(columnId)));
}
