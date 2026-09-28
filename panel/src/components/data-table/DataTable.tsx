import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import { DataTableToolbar, type FacetDef } from './DataTableToolbar';
import { useTablePrefs, type Density } from './useTablePrefs';

export interface DataTableProps<T> {
  /** Stable id — scopes saved column layout and density to this table. */
  tableId: string;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  facets?: FacetDef[];
  /** Rendered in the toolbar, right-aligned. */
  actions?: ReactNode;
  /** Rendered in place of the toolbar actions while rows are selected. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  enableSelection?: boolean;
  /** Called whenever the selected row set changes. */
  onSelectionChange?: (rows: T[]) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  /** Maximum body height before the body scrolls under a sticky header. */
  maxBodyHeight?: string;
  /** Columns hidden on first visit. The viewer can re-enable them in the column picker. */
  defaultHiddenColumns?: string[];
}

const DENSITY_ROW: Record<Density, string> = {
  compact: 'h-8 text-[12px]',
  comfortable: 'h-10 text-[13px]',
  relaxed: 'h-12 text-[13px]',
};

export function DataTable<T>({
  tableId,
  columns,
  data,
  loading,
  searchPlaceholder = 'Search…',
  facets,
  actions,
  bulkActions,
  enableSelection,
  onSelectionChange,
  onRowClick,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  pageSize = 25,
  maxBodyHeight = 'calc(100vh - 20rem)',
  defaultHiddenColumns,
}: DataTableProps<T>) {
  const { density, setDensity, columnVisibility, setColumnVisibility } = useTablePrefs(
    tableId,
    defaultHiddenColumns,
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      columnVisibility: columnVisibility as VisibilityState,
    },
    enableRowSelection: Boolean(enableSelection),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility(typeof updater === 'function' ? updater(columnVisibility as VisibilityState) : updater),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize } },
  });

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map((r) => r.original),
    // `table` is stable; the selection map and the data are what actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowSelection, data],
  );

  // Report selection upward as an effect, never during render.
  //
  // Keyed on `rowSelection` — the actual selection state — and deliberately NOT
  // on `selectedRows`. A caller that passes a freshly-derived array as `data`
  // (`rows.filter(...)` inline, which is the normal thing to write) gives it a
  // new identity on every render; keying off the derived array then fires this
  // effect every render, and if the parent stores the result in state that is
  // an infinite loop that pins the main thread and blocks navigation.
  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange(table.getSelectedRowModel().rows.map((r) => r.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const from = totalRows === 0 ? 0 : pageIndex * table.getState().pagination.pageSize + 1;
  const to = Math.min(totalRows, (pageIndex + 1) * table.getState().pagination.pageSize);

  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar
        table={table}
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        searchPlaceholder={searchPlaceholder}
        facets={facets}
        density={density}
        onDensityChange={setDensity}
        actions={
          selectedRows.length > 0 && bulkActions
            ? bulkActions(selectedRows, () => setRowSelection({}))
            : actions
        }
        selectedCount={selectedRows.length}
      />

      <div className="overflow-hidden rounded-lg border border-line bg-surface-2">
        <div className="overflow-auto" style={{ maxHeight: maxBodyHeight }}>
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-surface-3">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    const align = (header.column.columnDef.meta as { align?: string } | undefined)?.align;
                    return (
                      <th
                        key={header.id}
                        style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                        className={cn(
                          'whitespace-nowrap border-b border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted',
                          align === 'right' ? 'text-right' : 'text-left',
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              'inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-ink',
                              align === 'right' && 'flex-row-reverse',
                            )}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === 'asc' ? (
                              <ArrowUp className="size-3" />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className="size-3" />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-40" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length} className="p-0">
                    <TableSkeleton rows={8} cols={Math.min(6, table.getVisibleLeafColumns().length)} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length}>
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'border-b border-line transition-colors last:border-b-0 hover:bg-surface-3',
                      row.getIsSelected() && 'bg-primary-soft hover:bg-primary-soft',
                      onRowClick && 'cursor-pointer',
                      DENSITY_ROW[density],
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const align = (cell.column.columnDef.meta as { align?: string } | undefined)?.align;
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-3 text-ink',
                            align === 'right' ? 'tnum text-right' : 'text-left',
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
        <span className="tnum">
          {totalRows === 0 ? 'No rows' : `${from}–${to} of ${totalRows.toLocaleString('en-IN')}`}
          {selectedRows.length > 0 && ` · ${selectedRows.length} selected`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="tnum px-1.5">
            {pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
