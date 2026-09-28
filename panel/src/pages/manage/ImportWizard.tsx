import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  FileSpreadsheet,

  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Can } from '@/rbac/can';
import { previewImport } from '@/api/crm';
import { cn } from '@/lib/utils';
import type { ImportPreview } from '@/types/crm';

const TARGET_FIELDS = [
  { value: 'companyName', label: 'Company name' },
  { value: 'contactName', label: 'Contact name' },
  { value: 'designation', label: 'Designation' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'state', label: 'State' },
  { value: 'city', label: 'City' },
  { value: 'industry', label: 'Industry' },
  { value: 'productInterest', label: 'Product interest' },
  { value: 'estimatedVolume', label: 'Estimated volume' },
  { value: 'source', label: 'Source' },
  { value: '__skip', label: '— Do not import —' },
];

type Step = 'upload' | 'map' | 'validate' | 'done';

/**
 * Import wizard.
 *
 * Four steps, and the third one is the point: nothing is written until a human
 * has seen the validation errors and the duplicate matches. Silent imports are
 * how a CRM fills up with the same company under six spellings.
 */
export default function ImportWizardPage() {
  const [step, setStep] = useState<Step>('upload');
  const [module, setModule] = useState('leads');
  const [dupePolicy, setDupePolicy] = useState('skip');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const analyse = useMutation({
    mutationFn: (fileName: string) => previewImport(fileName),
    onSuccess: (p) => {
      setPreview(p);
      setMapping(Object.fromEntries(p.columns.map((c) => [c.source, c.target ?? '__skip'])));
      setStep('map');
    },
  });

  const errors = preview?.issues.filter((i) => i.severity === 'error') ?? [];
  const warnings = preview?.issues.filter((i) => i.severity === 'warning') ?? [];
  const willImport = preview
    ? preview.validRows - (dupePolicy === 'skip' ? preview.duplicates.length : 0)
    : 0;

  return (
    <>
      <PageHeader
        title="Data Import"
        description="CSV or Excel, with column mapping, validation and duplicate detection before anything is written."
      />

      <Stepper step={step} />

      {step === 'upload' && (
        <Card className="mt-4">
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Import into</Label>
                <Select value={module} onValueChange={setModule}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="contacts">Contacts</SelectItem>
                    <SelectItem value="companies">Companies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>If a row matches an existing record</Label>
                <RadioGroup value={dupePolicy} onValueChange={setDupePolicy} className="space-y-1.5 pt-1">
                  {[
                    ['skip', 'Skip the row — keep what we have'],
                    ['update', 'Update the existing record'],
                    ['create', 'Create anyway (allows duplicates)'],
                  ].map(([v, label]) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                      <RadioGroupItem value={v} />
                      {label}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <Separator />

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-3 px-6 py-10 text-center transition-colors hover:border-primary">
              <FileSpreadsheet className="mb-2 size-7 text-ink-muted" aria-hidden />
              <span className="text-[13px] font-medium text-ink">Drop a CSV or Excel file here</span>
              <span className="mt-0.5 text-xs text-ink-muted">or click to browse · up to 10,000 rows</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) analyse.mutate(f.name);
                }}
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink-muted">
                Need the shape? Download the template with the expected columns.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Download template
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={analyse.isPending}
                  onClick={() => analyse.mutate('indiamart-leads-sept.xlsx')}
                >
                  {analyse.isPending ? 'Reading…' : 'Use a sample file'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'map' && preview && (
        <Card className="mt-4">
          <CardHeader>
            <div>
              <CardTitle>Map columns</CardTitle>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {preview.fileName} · {preview.totalRows} rows. Unmapped columns are ignored.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="py-2 pr-3 text-left font-semibold">Column in file</th>
                    <th className="px-3 py-2 text-left font-semibold">Sample value</th>
                    <th className="py-2 pl-3 text-left font-semibold">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.columns.map((c) => (
                    <tr key={c.source} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3 font-medium text-ink">{c.source}</td>
                      <td className="max-w-56 truncate px-3 py-2 text-ink-muted">{c.sample}</td>
                      <td className="py-2 pl-3">
                        <Select
                          value={mapping[c.source] ?? '__skip'}
                          onValueChange={(v) => setMapping((m) => ({ ...m, [c.source]: v }))}
                        >
                          <SelectTrigger className="w-56">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGET_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep('validate')}>
                Validate <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'validate' && preview && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Rows in file" value={preview.totalRows} />
            <StatTile label="Errors" value={errors.length} sublabel="These rows will be skipped" />
            <StatTile label="Duplicates found" value={preview.duplicates.length} sublabel={`Policy: ${dupePolicy}`} />
            <StatTile label="Will be imported" value={willImport} emphasis />
          </div>

          {errors.length > 0 && (
            <IssueCard
              title={`${errors.length} rows cannot be imported`}
              tone="critical"
              icon={XCircle}
              rows={errors.map((i) => ({
                left: `Row ${i.row} · ${i.column}`,
                right: i.message,
              }))}
            />
          )}

          {warnings.length > 0 && (
            <IssueCard
              title={`${warnings.length} rows import with a warning`}
              tone="warning"
              icon={AlertTriangle}
              rows={warnings.map((i) => ({ left: `Row ${i.row} · ${i.column}`, right: i.message }))}
            />
          )}

          {preview.duplicates.length > 0 && (
            <IssueCard
              title={`${preview.duplicates.length} rows match an existing record`}
              tone="warning"
              icon={Copy}
              rows={preview.duplicates.map((d) => ({
                left: `Row ${d.row} · matched on ${d.field}`,
                right: d.matches,
              }))}
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep('map')}>
              Back
            </Button>
            <Can
              module="dataImport"
              action="run"
              fallback={
                <Badge tone="outline">
                  <AlertTriangle /> Running an import needs the “Run an import” permission
                </Badge>
              }
            >
              <Button variant="primary" onClick={() => setStep('done')}>
                Import {willImport} rows <ArrowRight />
              </Button>
            </Can>
          </div>
        </div>
      )}

      {step === 'done' && preview && (
        <Card className="mt-4">
          <EmptyState
            icon={<CheckCircle2 className="size-5 text-good" />}
            title={`${willImport} records imported`}
            description={`${errors.length} rows skipped for errors, ${preview.duplicates.length} duplicates handled by the "${dupePolicy}" policy. The full result is written to the audit log.`}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setStep('upload'); setPreview(null); }}>
                  Import another file
                </Button>
                <Button variant="primary">View imported records</Button>
              </div>
            }
          />
        </Card>
      )}
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'map', label: 'Map columns' },
    { key: 'validate', label: 'Validate' },
    { key: 'done', label: 'Done' },
  ];
  const current = steps.findIndex((s) => s.key === step);
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium',
              i === current
                ? 'bg-primary text-primary-fg'
                : i < current
                  ? 'bg-primary-soft text-primary'
                  : 'bg-surface-3 text-ink-muted',
            )}
          >
            {i < current ? <CheckCircle2 className="size-3" /> : <span className="tnum">{i + 1}</span>}
            {s.label}
          </span>
          {i < steps.length - 1 && <ArrowRight className="size-3 text-ink-muted" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function IssueCard({
  title,
  tone,
  icon: Icon,
  rows,
}: {
  title: string;
  tone: 'critical' | 'warning';
  icon: typeof AlertTriangle;
  rows: { left: string; right: string }[];
}) {
  return (
    <Card className={tone === 'critical' ? 'border-critical/30' : 'border-warning/30'}>
      <CardHeader>
        <CardTitle className={cn('flex items-center gap-2', tone === 'critical' ? 'text-critical' : 'text-warning')}>
          <Icon className="size-4" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-line">
          {rows.slice(0, 8).map((r, i) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5 text-xs">
              <span className="font-medium text-ink">{r.left}</span>
              <span className="text-ink-secondary">{r.right}</span>
            </li>
          ))}
        </ul>
        {rows.length > 8 && (
          <p className="mt-2 text-[11px] text-ink-muted">+{rows.length - 8} more — download the full report</p>
        )}
      </CardContent>
    </Card>
  );
}

