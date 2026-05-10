'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { getFlagEmoji } from '@/lib/utils';
import { Banknote, Building2, TrendingUp, AlertTriangle, RefreshCw, CheckCircle2, Upload, Info, X } from 'lucide-react';
import type { RegulatoryCapital, BankAccount, Entity } from '@/lib/db/schema';

interface Props {
  regulatoryCapital: RegulatoryCapital[];
  bankAccounts: BankAccount[];
  entities: Entity[];
}

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy || 'USD', maximumFractionDigits: 0 }).format(n);

export default function CapitalClient({ regulatoryCapital, bankAccounts, entities }: Props) {
  const router = useRouter();
  const [entityFilter, setEntityFilter] = useState<'all' | string>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/capital/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error || 'Upload failed');
      } else {
        setImportMessage(
          `${json.created} created · ${json.updated} updated · ${json.skipped} skipped`,
        );
        router.refresh();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/capital/balance', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Sync failed');
      setSyncMessage(
        `Synced ${body.totalAccounts ?? 0} accounts · ${body.breaches ?? 0} breach(es)`,
      );
      router.refresh();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  }

  const entityMap = useMemo(() => {
    const m = new Map<string, Entity>();
    entities.forEach(e => m.set(e.id, e));
    return m;
  }, [entities]);

  const filteredCapital = useMemo(
    () => regulatoryCapital.filter(c => entityFilter === 'all' || c.entityId === entityFilter),
    [regulatoryCapital, entityFilter],
  );
  const filteredBanks = useMemo(
    () => bankAccounts.filter(b => entityFilter === 'all' || b.entityId === entityFilter),
    [bankAccounts, entityFilter],
  );

  const totalBuffer = useMemo(() => {
    const active = filteredCapital.filter(c => c.minimumRequired > 0);
    if (active.length === 0) return 0;
    const sum = active.reduce((acc, c) => acc + c.bufferPercentage, 0);
    return Math.round(sum / active.length);
  }, [filteredCapital]);

  const breaches = filteredCapital.filter(c => c.currentBalance < c.minimumRequired).length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Header title="Capital" subtitle="Regulatory capital and bank balances across entities" />

      <main className="flex-1 p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Entity:</span>
          <select
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded px-3 py-1.5 bg-white"
          >
            <option value="all">All entities</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-3">
            {syncMessage && (
              <span className="text-xs text-gray-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> {syncMessage}
              </span>
            )}
            <button
              onClick={() => setShowImport(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
              title="Refresh balances from EntityOS database (push live data via bank-sync API)"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Refreshing…' : 'Refresh Balances'}
            </button>
          </div>
        </div>

        {showImport && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Import bank accounts from CSV</h3>
                <p className="text-sm text-gray-500 mt-1">Upload balances from your treasury spreadsheet. Matching (entityId + accountNumber) rows are updated in place.</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/bank_accounts_template.csv"
                  download
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Download template
                </a>
                <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-4 text-sm text-indigo-900">
              <div className="flex gap-2 items-start">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <div className="font-medium">CSV format instructions</div>
                  <div>Required columns: <code className="bg-white px-1 rounded">entityId</code>, <code className="bg-white px-1 rounded">bankName</code>, <code className="bg-white px-1 rounded">accountNumber</code>, <code className="bg-white px-1 rounded">currency</code>, <code className="bg-white px-1 rounded">balance</code>.</div>
                  <div>Optional: <code className="bg-white px-1 rounded">minRequiredBalance</code>, <code className="bg-white px-1 rounded">notes</code>.</div>
                  <div>Use entityId values from your entity list (e.g. <code className="bg-white px-1 rounded">ent-001</code>). Rows with an existing entityId+accountNumber pair are updated, not duplicated.</div>
                </div>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleUpload(f);
              }}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm text-gray-700 font-medium">
                {uploading ? 'Uploading…' : 'Click to select a CSV, or drag & drop'}
              </div>
              <div className="text-xs text-gray-500 mt-1">.csv file only</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </div>
          </div>
        )}

        {importError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">{importError}</div>
            <button onClick={() => setImportError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {importMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">Import complete — {importMessage}</div>
            <button onClick={() => setImportMessage(null)} className="text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Capital Requirements</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{filteredCapital.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Avg Buffer</span>
            </div>
            <div className="text-2xl font-semibold text-gray-900">{totalBuffer}%</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-4 h-4 ${breaches > 0 ? 'text-red-500' : 'text-gray-500'}`} />
              <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Breaches</span>
            </div>
            <div className={`text-2xl font-semibold ${breaches > 0 ? 'text-red-600' : 'text-gray-900'}`}>{breaches}</div>
          </div>
        </div>

        <section className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Regulatory Capital</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3 text-right">Minimum Required</th>
                <th className="px-4 py-3 text-right">Current Balance</th>
                <th className="px-4 py-3 text-right">Buffer %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCapital.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No capital records.</td></tr>
              ) : (
                filteredCapital.map(c => {
                  const entity = entityMap.get(c.entityId);
                  const breach = c.currentBalance < c.minimumRequired;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {entity && <span>{getFlagEmoji(entity.country)}</span>}
                          <span className="font-medium text-gray-900">{entity?.name ?? c.entityId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{c.capitalRequirement}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{fmt(c.minimumRequired, c.currency)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${breach ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmt(c.currentBalance, c.currency)}
                      </td>
                      <td className={`px-4 py-3 text-right ${breach ? 'text-red-600' : 'text-gray-700'}`}>
                        {c.bufferPercentage}%
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Bank Accounts</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Bank</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Min Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBanks.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No bank accounts.</td></tr>
              ) : (
                filteredBanks.map(b => {
                  const entity = entityMap.get(b.entityId);
                  const breach = b.balance < b.minRequiredBalance;
                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {entity && <span>{getFlagEmoji(entity.country)}</span>}
                          <span className="font-medium text-gray-900">{entity?.name ?? b.entityId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{b.bankName}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{b.accountNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{b.currency}</td>
                      <td className={`px-4 py-3 text-right font-medium ${breach ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmt(b.balance, b.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{fmt(b.minRequiredBalance, b.currency)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
