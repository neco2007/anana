'use client'
import { useState, useEffect, useCallback } from 'react'
import { Database, Settings, RefreshCcw } from 'lucide-react'

function formatDateJP(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${y}年${m}月${d}日`;
}

export default function SatofuruSummaryPanel() {
  const [items, setItems] = useState<{ name: string; count: number }[]>([])
  const [displayDate, setDisplayDate] = useState('')
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(() => {
    if (!window.eel) return;
    setLoading(true);
    window.eel.fetch_table_rows('satofuru_data')((res: any) => {
      setLoading(false);
      if (!res.success) return;
      const rows: any[] = res.rows ?? [];

      const dateMap: { [date: string]: { [product: string]: number } } = {};
      rows.forEach(row => {
        const rawDate =
          row['インポート日'] ||
          (row['_import_at'] ? String(row['_import_at']).split(' ')[0] : '') ||
          '';
        const date = rawDate.replace(/\//g, '-').split('T')[0];
        const product = (row['発注商品名'] || '').trim();
        const count = parseInt(row['ケース数']) || 0;
        if (date && product) {
          if (!dateMap[date]) dateMap[date] = {};
          dateMap[date][product] = (dateMap[date][product] || 0) + count;
        }
      });

      const sortedDates = Object.keys(dateMap).sort();
      if (sortedDates.length === 0) {
        setItems([]);
        setDisplayDate('');
        return;
      }

      const latestDate = sortedDates[sortedDates.length - 1];
      setDisplayDate(latestDate);

      const productCounts = dateMap[latestDate];
      const result = Object.entries(productCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => a[0].localeCompare(b[0], 'ja'));
      setItems(result.map(([name, count]) => ({ name, count })));
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col h-full min-h-[600px] overflow-hidden">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#5b9bd5] text-white">
        <div className="flex items-center space-x-2">
          <Database size={18} className="fill-white" />
          <h2 className="font-bold text-sm">04.さとふる 発注集計</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Settings size={16} className="cursor-pointer hover:rotate-90 transition-transform opacity-90" />
          <RefreshCcw
            size={16}
            className={`cursor-pointer hover:rotate-180 transition-transform opacity-90 ${loading ? 'animate-spin' : ''}`}
            onClick={loadData}
          />
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 flex flex-col text-xs text-slate-800">
        <div className="flex justify-end p-2 border-b border-slate-200 bg-slate-50 text-slate-900 font-bold">
          <span>{displayDate ? formatDateJP(displayDate) : '-'}</span>
        </div>
        <div className="flex justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-bold">
          <span className="opacity-0">商品名</span>
          <span>個数</span>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs">読み込み中...</div>
          )}
          {!loading && items.length === 0 && (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs">データがありません</div>
          )}
          {!loading && items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center px-3 py-2 border-b border-slate-100 hover:bg-blue-50 transition-colors">
              <span className="truncate pr-4">{item.name}</span>
              <span className="text-blue-600 font-bold whitespace-nowrap">{item.count}ケース</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
