'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Building2, Users, FileText, Calendar,
  ArrowRight, Loader2,
} from 'lucide-react';

interface Result {
  type: 'entity' | 'director' | 'document' | 'meeting';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_META = {
  entity:   { label: 'Entity',   icon: Building2, color: 'bg-indigo-100 text-indigo-600' },
  director: { label: 'Director', icon: Users,     color: 'bg-purple-100 text-purple-600' },
  document: { label: 'Document', icon: FileText,  color: 'bg-blue-100 text-blue-600'    },
  meeting:  { label: 'Meeting',  icon: Calendar,  color: 'bg-green-100 text-green-600'  },
} as const;

export default function SearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get('q') || '';

  const [query, setQuery]     = useState(initialQ);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const json = await res.json();
      setResults(json.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run search on mount if there's an initial query
  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    doSearch(query);
  }

  // Group results by type
  const grouped = results.reduce<Partial<Record<Result['type'], Result[]>>>((acc, r) => {
    (acc[r.type] = acc[r.type] || []).push(r);
    return acc;
  }, {});

  const typeOrder: Result['type'][] = ['entity', 'director', 'document', 'meeting'];

  return (
    <div className="px-8 py-6 max-w-3xl space-y-6">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search entities, directors, documents, meetings…"
          className="w-full pl-12 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {loading && (
          <Loader2 className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </form>

      {/* Initial state */}
      {!searched && !loading && (
        <div className="text-center py-16 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Type a name, country, role, or keyword to search across all records</p>
        </div>
      )}

      {/* No results */}
      {searched && !loading && results.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No results found for <span className="font-medium text-gray-700">"{initialQ || query}"</span></p>
          <p className="text-xs mt-1">Try a different keyword or check spelling</p>
        </div>
      )}

      {/* Results grouped by type */}
      {results.length > 0 && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400">
            {results.length} result{results.length !== 1 ? 's' : ''} for "{initialQ || query}"
          </p>
          {typeOrder.map(type => {
            const group = grouped[type];
            if (!group || group.length === 0) return null;
            const meta = TYPE_META[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                    <meta.icon className="w-3 h-3" />
                    {meta.label}s
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.map(r => (
                    <Link
                      key={r.id}
                      href={r.href}
                      className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50 transition-all group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                        <meta.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
