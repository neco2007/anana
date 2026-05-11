'use client'
import { Search, Plus, ChevronDown, Filter, Upload, Download, BarChart3, RefreshCcw, Settings, Columns } from 'lucide-react';

interface ActionBarProps {
  onSearch?: (word: string) => void;
  onCreate?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onSummaryClick?: () => void;
  viewMode?: string;
  onViewChange?: (view: string) => void;
  onDateFilterChange?: (days: number | null) => void;
}

export default function ActionBar({
  onSearch,
  onCreate,
  onImport,
  onExport,
  onSummaryClick,
  viewMode = 'basic',
  onViewChange,
  onDateFilterChange
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 shrink-0">

      {/* 左側ボタン群 */}
      <div className="flex items-center gap-1">

        {/* 検索入力 */}
        <div className="flex items-center px-3 py-1 text-[13px] border border-slate-300 rounded bg-white shadow-sm focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <Search size={14} className="mr-1.5 text-slate-500" />
          <input 
            type="text"
            placeholder="検索"
            className="outline-none w-48 bg-transparent text-slate-700 placeholder:text-slate-400"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>

        {/* 新規作成 */}
        <button 
          onClick={onCreate}
          className="flex items-center px-3 py-1 text-[13px] text-white bg-[#2d8c3c] rounded hover:brightness-90 transition-all shadow-sm font-bold"
        >
          <Plus size={14} className="mr-1" /> 新規作成
        </button>

        {/* ビュー切り替え */}
        <div className="flex items-center border border-slate-300 rounded bg-white shadow-sm overflow-hidden">
          <div className="p-1.5 border-r border-slate-300 bg-slate-50">
            <div className="w-3 h-3 flex flex-col justify-between">
              <div className="w-full h-[1px] bg-slate-500"></div>
              <div className="w-full h-[1px] bg-slate-500"></div>
              <div className="w-full h-[1px] bg-slate-500"></div>
            </div>
          </div>
          <select 
            className="px-3 py-1 text-[13px] bg-white outline-none cursor-pointer hover:bg-slate-50 appearance-none pr-8 relative"
            value={viewMode}
            onChange={(e) => onViewChange?.(e.target.value)}
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px'
            }}
          >
            <option value="basic">基本ビュー</option>
            <option value="all">全項目</option>
            <option value="summary">集計ビュー</option>
          </select>
        </div>

        {/* 日付絞り込みフィルター */}
        <div className="flex items-center border border-slate-300 rounded bg-white shadow-sm overflow-hidden ml-1">
          <div className="p-1.5 border-r border-slate-300 bg-white">
            <Filter size={15} className="text-slate-600" />
          </div>
          <select 
            className="px-3 py-1 text-[13px] bg-white outline-none cursor-pointer hover:bg-slate-50 appearance-none pr-10 relative text-slate-700 min-w-[120px]"
            onChange={(e) => {
              const val = e.target.value;
              onDateFilterChange?.(val === "" ? null : parseInt(val));
            }}
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%230079bf\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '14px'
            }}
          >
            <option value="">---</option>
            <option value="0">取込分が本日</option>
            <option value="1">1日前（昨日）の取込</option>
            <option value="2">2日前（おととい）の取込</option>
            <option value="3">3日前の取込</option>
            <option value="4">4日前の取込</option>
            <option value="5">5日前の取込</option>
            <option value="6">6日前の取込</option>
          </select>
        </div>
      </div>

      <div className="flex-1" />

      {/* 右側ボタン群 */}
      <div className="flex items-center gap-1">
        <button
          onClick={onImport}
          className="flex items-center px-3 py-1 text-[13px] border border-slate-300 rounded bg-white hover:bg-slate-100 shadow-sm transition-colors"
        >
          <Upload size={14} className="mr-1.5 text-slate-500" /> 取込
        </button>
        <button 
          onClick={onExport}
          className="flex items-center px-3 py-1 text-[13px] border border-slate-300 rounded bg-white hover:bg-slate-100 shadow-sm transition-colors"
        >
          <Download size={14} className="mr-1.5 text-slate-500" /> 出力
        </button>
        <button 
          onClick={onSummaryClick} // 追加：クリックで集計表示へ
          className="flex items-center px-3 py-1 text-[13px] border border-slate-300 rounded bg-white hover:bg-slate-100 shadow-sm transition-colors"
        >
          <BarChart3 size={14} className="mr-1.5 text-slate-500" /> 集計
        </button>

        <div className="w-px h-5 bg-slate-300 mx-1" />

        <button className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600">
          <Columns size={15} />
        </button>
        <button className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600">
          <RefreshCcw size={15} />
        </button>
        <button className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600">
          <Settings size={15} />
        </button>
      </div>
    </div>
  );
}