import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, FileDown, Mail, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Money } from '@/components/common/Money';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { computeQuoteTotals, getPriceLists, getProducts, updateQuote } from '@/api/crm';
import { money, percent, qty, shortDate, toRupees } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Quote, QuoteLine } from '@/types/crm';

/** Above this, a quote cannot be sent without a manager's sign-off. */
const APPROVAL_THRESHOLD = 8;

/**
 * Quote builder.
 *
 * Totals come from one function (`computeQuoteTotals`) that the list, the
 * builder and — later — the PDF all share. Quote arithmetic re-derived in three
 * places is how a customer ends up with two different grand totals.
 */
export function QuoteBuilder({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const qc = useQueryClient();
  const { can } = useAuth();

  const [lines, setLines] = useState<QuoteLine[]>(quote.lines);
  const [headerDiscount, setHeaderDiscount] = useState(quote.headerDiscountPercent);
  const [transport, setTransport] = useState(toRupees(quote.transportCharges));
  const [priceListId, setPriceListId] = useState(quote.priceListId);

  const { data: products = [] } = useQuery({ queryKey: qk.crm.products, queryFn: getProducts });
  const { data: priceLists = [] } = useQuery({ queryKey: qk.crm.priceLists, queryFn: getPriceLists });

  const totals = useMemo(
    () => computeQuoteTotals(lines, headerDiscount, Math.round(transport * 100)),
    [lines, headerDiscount, transport],
  );

  const needsApproval = totals.effectiveDiscountPercent > APPROVAL_THRESHOLD;
  const editable = quote.status === 'Draft' || quote.status === 'Pending Approval';

  const save = useMutation({
    mutationFn: (patch: Partial<Quote>) => updateQuote(quote.id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });

  const priceList = priceLists.find((p) => p.id === priceListId);

  function addLine(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const listed = priceList?.entries.find((e) => e.productId === p.id)?.price ?? p.listPrice;
    setLines((prev) => [
      ...prev,
      {
        id: `ql-new-${prev.length}-${Date.now()}`,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        quantity: 1,
        unit: p.unit,
        unitPrice: listed,
        discountPercent: 0,
        taxPercent: p.taxPercent,
      },
    ]);
  }

  function patchLine(id: string, patch: Partial<QuoteLine>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent width="xl" className="gap-0">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>{quote.refNo}</SheetTitle>
            <Badge
              tone={
                quote.status === 'Accepted'
                  ? 'good'
                  : quote.status === 'Rejected' || quote.status === 'Expired'
                    ? 'critical'
                    : quote.status === 'Pending Approval'
                      ? 'warning'
                      : 'neutral'
              }
            >
              {quote.status}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
            <span>{quote.companyName}</span>
            {quote.contactName && <span>{quote.contactName}</span>}
            <span>Valid until {shortDate(quote.validUntil)}</span>
            <span>Owner: {quote.ownerName}</span>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          {needsApproval && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs leading-relaxed text-warning">
              <ShieldCheck className="mt-px size-4 shrink-0" aria-hidden />
              <span>
                Effective discount is {percent(totals.effectiveDiscountPercent)}, above the{' '}
                {APPROVAL_THRESHOLD}% threshold. This quote cannot be sent until a Sales Manager approves
                it — the workflow rule “Discount above 8% needs approval” routes it automatically.
              </span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Price list</Label>
              <Select value={priceListId} onValueChange={setPriceListId} disabled={!editable}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priceLists.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment terms</Label>
              <Input defaultValue={quote.paymentTerms} disabled={!editable} />
            </div>
            <div>
              <Label>Delivery terms</Label>
              <Input defaultValue={quote.deliveryTerms} disabled={!editable} />
            </div>
          </div>

          <Separator />

          {/* ------------------------------------------------------------ lines */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Line items
              </span>
              {editable && can('quote', 'update') && (
                <Select onValueChange={addLine}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Add a product…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => p.active)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-3">
                  <tr className="text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-3 py-2 text-left font-semibold">Product</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Rate</th>
                    <th className="px-3 py-2 text-right font-semibold">Disc %</th>
                    <th className="px-3 py-2 text-right font-semibold">Tax %</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    {editable && <th className="w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-xs text-ink-muted">
                        No lines yet. Add a product to begin.
                      </td>
                    </tr>
                  )}
                  {lines.map((l) => {
                    const gross = l.unitPrice * l.quantity;
                    const net = gross - (gross * l.discountPercent) / 100;
                    return (
                      <tr key={l.id} className="border-t border-line">
                        <td className="px-3 py-2">
                          <div className="text-ink">{l.productName}</div>
                          <div className="text-[11px] text-ink-muted">{l.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editable ? (
                            <Input
                              inputMode="numeric"
                              value={String(l.quantity)}
                              onChange={(e) =>
                                patchLine(l.id, { quantity: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
                              }
                              className="h-7 w-20 text-right"
                            />
                          ) : (
                            <span className="tnum">{qty(l.quantity, l.unit)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editable ? (
                            <Input
                              inputMode="numeric"
                              value={String(toRupees(l.unitPrice))}
                              onChange={(e) =>
                                patchLine(l.id, {
                                  unitPrice: Math.round(Number(e.target.value.replace(/[^\d]/g, '')) * 100) || 0,
                                })
                              }
                              className="h-7 w-24 text-right"
                            />
                          ) : (
                            <Money value={l.unitPrice} />
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {editable ? (
                            <Input
                              inputMode="numeric"
                              value={String(l.discountPercent)}
                              onChange={(e) =>
                                patchLine(l.id, {
                                  discountPercent: Math.min(50, Number(e.target.value.replace(/[^\d]/g, '')) || 0),
                                })
                              }
                              className={cn('h-7 w-16 text-right', l.discountPercent > 10 && 'border-warning')}
                            />
                          ) : (
                            <span className="tnum">{l.discountPercent}%</span>
                          )}
                        </td>
                        <td className="tnum px-3 py-2 text-right text-ink-secondary">{l.taxPercent}%</td>
                        <td className="tnum px-3 py-2 text-right font-medium">
                          <Money value={Math.round(net)} />
                        </td>
                        {editable && (
                          <td className="px-1 py-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Remove line"
                              onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}
                            >
                              <Trash2 />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ----------------------------------------------------------- totals */}
          <div className="ml-auto w-full max-w-sm space-y-1.5 text-[13px]">
            <Row label="Subtotal" value={money(totals.subtotal)} />
            <Row label="Line discounts" value={`− ${money(totals.lineDiscount)}`} tone="good" />
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink-secondary">
                Header discount
                {editable ? (
                  <Input
                    inputMode="numeric"
                    value={String(headerDiscount)}
                    onChange={(e) =>
                      setHeaderDiscount(Math.min(30, Number(e.target.value.replace(/[^\d]/g, '')) || 0))
                    }
                    className="h-6 w-14 text-right"
                  />
                ) : (
                  <span>{headerDiscount}%</span>
                )}
              </span>
              <span className="tnum font-medium text-good">− {money(totals.headerDiscount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ink-secondary">
                Transport
                {editable && (
                  <Input
                    inputMode="numeric"
                    value={String(transport)}
                    onChange={(e) => setTransport(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                    className="h-6 w-24 text-right"
                  />
                )}
              </span>
              <span className="tnum font-medium text-ink">{money(totals.transport)}</span>
            </div>
            <Separator />
            <Row label="Taxable value" value={money(totals.taxableValue)} />
            <Row label="GST" value={money(totals.tax)} />
            <Separator />
            <div className="flex items-center justify-between gap-3 pt-0.5">
              <span className="font-semibold text-ink">Grand total</span>
              <span className="tnum text-lg font-semibold text-ink">{money(totals.grandTotal)}</span>
            </div>
            <div className="text-right text-[11px] text-ink-muted">
              Effective discount {percent(totals.effectiveDiscountPercent)}
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="ghost">
            <FileDown /> PDF
          </Button>
          {quote.status === 'Pending Approval' ? (
            <Can
              module="quote"
              action="approveDiscount"
              fallback={
                <Tooltip content="Only a Sales or Finance Manager can approve a discount above threshold.">
                  <span>
                    <Button variant="primary" disabled>
                      <AlertTriangle /> Awaiting approval
                    </Button>
                  </span>
                </Tooltip>
              }
            >
              <Button variant="primary" onClick={() => save.mutate({ status: 'Approved' })}>
                <ShieldCheck /> Approve discount
              </Button>
            </Can>
          ) : (
            <Can module="quote" action="send">
              <Button
                variant="primary"
                disabled={lines.length === 0 || (needsApproval && quote.status !== 'Approved')}
                onClick={() =>
                  save.mutate({
                    lines,
                    headerDiscountPercent: headerDiscount,
                    transportCharges: Math.round(transport * 100),
                    status: needsApproval ? 'Pending Approval' : 'Sent',
                  })
                }
              >
                {needsApproval ? (
                  <>
                    <ShieldCheck /> Submit for approval
                  </>
                ) : (
                  <>
                    <Send /> Send quotation
                  </>
                )}
              </Button>
            </Can>
          )}
          <Can module="quote" action="send">
            <Button variant="outline">
              <Mail /> Email template
            </Button>
          </Can>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-secondary">{label}</span>
      <span className={cn('tnum font-medium', tone === 'good' ? 'text-good' : 'text-ink')}>{value}</span>
    </div>
  );
}

