import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Package, Plus, Tag } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getPriceLists, getProducts } from '@/api/crm';
import { money, percent, shortDate } from '@/lib/format';
import type { CrmProduct } from '@/types/crm';

export default function CataloguePage() {
  const { data: products = [], isLoading } = useQuery({ queryKey: qk.crm.products, queryFn: getProducts });
  const { data: priceLists = [] } = useQuery({ queryKey: qk.crm.priceLists, queryFn: getPriceLists });

  const columns = useMemo<ColumnDef<CrmProduct, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Product',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-medium text-ink">{row.original.name}</div>
            <div className="font-mono text-[11px] text-ink-muted">{row.original.sku}</div>
          </div>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <Badge tone="outline">{String(getValue())}</Badge>,
      },
      {
        id: 'unit',
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'listPrice',
        accessorKey: 'listPrice',
        header: 'List price',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div>
            <Money value={row.original.listPrice} />
            <div className="text-[11px] text-ink-muted">per {row.original.unit}</div>
          </div>
        ),
      },
      {
        id: 'taxPercent',
        accessorKey: 'taxPercent',
        header: 'GST',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Tooltip content={`HSN ${row.original.hsn}`}>
            <span className="tnum cursor-help text-ink-secondary">{row.original.taxPercent}%</span>
          </Tooltip>
        ),
      },
      {
        id: 'availability',
        accessorKey: 'availability',
        header: 'Availability',
        filterFn: arrIncludes,
        cell: ({ getValue }) => {
          const v = String(getValue());
          return (
            <Badge tone={v === 'In Supply' ? 'good' : v === 'Limited' ? 'warning' : 'neutral'}>{v}</Badge>
          );
        },
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Description',
        cell: ({ getValue }) => (
          <span className="block max-w-80 truncate text-ink-secondary">{String(getValue())}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Catalogue & Pricing"
        description="What we sell, at what price, with what tax — the source the quote builder draws from."
        actions={
          <Can module="catalog" action="create">
            <Button variant="primary">
              <Plus /> New product
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Products" value={products.filter((p) => p.category !== 'Service').length} loading={isLoading} />
        <StatTile label="Services" value={products.filter((p) => p.category === 'Service').length} loading={isLoading} />
        <StatTile label="Price lists" value={priceLists.length} loading={isLoading} />
        <StatTile
          label="Limited supply"
          value={products.filter((p) => p.availability !== 'In Supply').length}
          sublabel="Quote with caution"
          loading={isLoading}
        />
      </div>

      <Tabs defaultValue="products" className="mt-5">
        <TabsList>
          <TabsTrigger value="products">
            <Package /> Products
          </TabsTrigger>
          <TabsTrigger value="prices">
            <Tag /> Price lists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <DataTable
            tableId="crm-products"
            columns={columns}
            data={products}
            loading={isLoading}
            searchPlaceholder="Product name or SKU…"
            emptyTitle="No products match"
            defaultHiddenColumns={['description']}
            facets={[
              {
                columnId: 'category',
                label: 'Category',
                options: ['Solid Fuel', 'Liquid Fuel', 'Waste', 'Service'].map((v) => ({ value: v, label: v })),
              },
              {
                columnId: 'availability',
                label: 'Availability',
                options: ['In Supply', 'Limited', 'On Request'].map((v) => ({ value: v, label: v })),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="prices" className="space-y-3">
          {priceLists.map((pl) => {
            const defaultList = priceLists.find((p) => p.isDefault);
            return (
              <Card key={pl.id}>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2">
                      {pl.name}
                      {pl.isDefault && <Badge tone="primary">Default</Badge>}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-ink-secondary">{pl.description}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {pl.regions.length ? pl.regions.join(', ') : 'All regions'} · valid from{' '}
                      {shortDate(pl.validFrom)}
                      {pl.validTo ? ` to ${shortDate(pl.validTo)}` : ' onwards'}
                    </p>
                  </div>
                  <Can module="catalog" action="managePrices">
                    <Button variant="outline" size="sm">
                      Edit prices
                    </Button>
                  </Can>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
                      <thead>
                        <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                          <th className="px-3 py-1.5 text-left font-semibold">Product</th>
                          <th className="px-3 py-1.5 text-right font-semibold">Price</th>
                          <th className="px-3 py-1.5 text-right font-semibold">vs default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pl.entries.slice(0, 6).map((e) => {
                          const product = products.find((p) => p.id === e.productId);
                          const base =
                            defaultList?.entries.find((d) => d.productId === e.productId)?.price ?? e.price;
                          const delta = base ? ((e.price - base) / base) * 100 : 0;
                          return (
                            <tr key={e.productId} className="border-b border-line last:border-0">
                              <td className="px-3 py-1.5 text-ink">{product?.name ?? e.productId}</td>
                              <td className="px-3 py-1.5 text-right">
                                <Money value={e.price} />
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                {pl.isDefault || Math.abs(delta) < 0.05 ? (
                                  <span className="text-ink-muted">—</span>
                                ) : (
                                  <span className={delta < 0 ? 'text-good' : 'text-serious'}>
                                    {delta > 0 ? '+' : ''}
                                    {percent(delta)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {pl.entries.length > 6 && (
                    <p className="mt-2 text-[11px] text-ink-muted">
                      Showing 6 of {pl.entries.length} products · total list value{' '}
                      {money(pl.entries.reduce((a, e) => a + e.price, 0))}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </>
  );
}
