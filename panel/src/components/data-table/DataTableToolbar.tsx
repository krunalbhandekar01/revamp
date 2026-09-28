import type { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';
import { Check, Columns3, Rows3, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Density } from './useTablePrefs';

export interface FacetDef {
  columnId: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * One filter row, directly above the table it controls.
 * Search is debounce-free because filtering is client-side here; when this
 * moves server-side, wrap `onSearchChange` in `useDebouncedValue`.
 */
export function DataTableToolbar<T>({
  table,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  facets,
  density,
  onDensityChange,
  actions,
  selectedCount,
}: {
  table: Table<T>;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  facets?: FacetDef[];
  density: Density;
  onDensityChange: (d: Density) => void;
  actions?: ReactNode;
  selectedCount: number;
}) {
  const hasFilters = table.getState().columnFilters.length > 0 || searchValue.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label="Search table"
        />
      </div>

      {facets?.map((facet) => (
        <FacetFilter key={facet.columnId} table={table} facet={facet} />
      ))}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            table.resetColumnFilters();
            onSearchChange('');
          }}
        >
          <X /> Clear
        </Button>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {selectedCount > 0 && <Badge tone="primary">{selectedCount} selected</Badge>}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Row density">
              <Rows3 />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Row height</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={density} onValueChange={(v) => onDensityChange(v as Density)}>
              <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="relaxed">Relaxed</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Choose columns">
              <Columns3 />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-auto">
            <DropdownMenuLabel>Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}
                  onSelect={(e) => e.preventDefault()}
                >
                  {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {actions}
      </div>
    </div>
  );
}

function FacetFilter<T>({ table, facet }: { table: Table<T>; facet: FacetDef }) {
  const column = table.getColumn(facet.columnId);
  if (!column) return null;

  const selected = new Set((column.getFilterValue() as string[]) ?? []);
  const counts = column.getFacetedUniqueValues();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="md" className={cn(selected.size > 0 && 'border-primary/50')}>
          {facet.label}
          {selected.size > 0 && (
            <Badge tone="primary" className="ml-0.5">
              {selected.size}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1">
        <div className="max-h-64 overflow-auto">
          {facet.options.map((opt) => {
            const isSelected = selected.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (isSelected) next.delete(opt.value);
                  else next.add(opt.value);
                  column.setFilterValue(next.size ? [...next] : undefined);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-ink transition-colors hover:bg-surface-3"
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                    isSelected ? 'border-primary bg-primary text-primary-fg' : 'border-line-strong',
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </span>
                <span className="flex-1 truncate">{opt.label}</span>
                <span className="tnum text-xs text-ink-muted">{counts.get(opt.value) ?? 0}</span>
              </button>
            );
          })}
        </div>
        {selected.size > 0 && (
          <>
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              onClick={() => column.setFilterValue(undefined)}
              className="w-full cursor-pointer rounded-md px-2 py-1.5 text-center text-xs text-ink-secondary transition-colors hover:bg-surface-3"
            >
              Clear filter
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
