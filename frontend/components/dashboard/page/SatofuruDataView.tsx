'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, Calendar } from 'lucide-react'
import DataViewContainer from '../layout/DataViewContainer'
import ActionBar from '../data/ActionBar'
import OrderTable from '../data/OrderTable'
import OrderEditorModal from '../data/OrderEditorModal'
import OrderSummaryView from '../data/OrderSummaryView'
import { SATOFURU_FIELDS } from '../../../constants/orderFieldConfigs'
import OrderDetailModal from '../data/OrderDetailModal'

const WEEKDAYS_JP = ['日', '月', '火', '水', '木', '金', '土']
function formatDateWithWeekday(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return ''
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d)
  return `${y}年${m}月${d}日（${WEEKDAYS_JP[date.getDay()]}）`
}

type DateMode = 'today' | 'today_weekday' | 'next_day' | 'next_weekday' | 'custom'

const DATE_MODE_LABELS: Record<DateMode, string> = {
  today: '本日の日付（土日祝含む）',
  today_weekday: '本日の日付（土日祝含まない）',
  next_day: '翌日の日付（土日祝含む）',
  next_weekday: '翌営業日の日付（土日祝含まない）',
  custom: 'カレンダーで日付を指定',
}

const LS_DATE_MODE_KEY = 'satofuru_output_date_mode'
const LS_CUSTOM_DATE_KEY = 'satofuru_output_custom_date'

interface SatofuruDataViewProps {
  onNotify?: (message: string) => void;
}

export default function SatofuruDataView({ onNotify }: SatofuruDataViewProps) {
  const [searchWord, setSearchWord] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'basic' | 'all' | 'summary'>('basic')
  const [dateFilter, setDateFilter] = useState<number | null>(null)
  const [detailRow, setDetailRow] = useState<any | null>(null)

  const [tableData, setTableData] = useState<any[]>([])
  const [masterProducts, setMasterProducts] = useState<string[]>([])
  const [masterData, setMasterData] = useState<any[]>([])

  // テーブルの列順を保持するステート
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  // 出力日設定
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [dateMode, setDateMode] = useState<DateMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(LS_DATE_MODE_KEY) as DateMode) || 'today'
    }
    return 'today'
  })
  const [customDate, setCustomDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LS_CUSTOM_DATE_KEY) || ''
    }
    return ''
  })
  const settingsPanelRef = useRef<HTMLDivElement>(null)

  const tableId = "satofuru_data";

  const loadData = useCallback(() => {
    if (window.eel) {
      window.eel.fetch_table_rows(tableId)((res: any) => {
        if (res.success) {
          setTableData(res.rows);
        } else {
          console.error("Data Load Error:", res.error);
        }
      });
    }
  }, [tableId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // さとふるマスタの全行データと発注商品名リストを取得
  useEffect(() => {
    if (window.eel) {
      window.eel.get_satohuru_master()((data: any[]) => {
        const rawData = data ?? [];
        setMasterData(rawData);
        const seen = new Set<string>();
        const names = rawData
          .map((r: any) => (r['発注商品名'] || '').trim())
          .filter((name: string) => name && !seen.has(name) && seen.add(name));
        setMasterProducts(names);
      });
    }
  }, []);

  // 日付フィルター適用（_import_at の先頭10文字 YYYY-MM-DD で照合）
  const displayData = useMemo(() => {
    if (dateFilter === null) return tableData;
    const d = new Date();
    d.setDate(d.getDate() - dateFilter);
    // toISOString() は UTC を返すため JST 0〜9 時台にズレが生じる → ローカル日付で比較
    const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return tableData.filter(row =>
      String(row['_import_at'] || '').slice(0, 10) === targetDate
    );
  }, [tableData, dateFilter]);

  const handleImport = () => {
    const expectedLabels = SATOFURU_FIELDS.map(f => f.label);
    if (window.eel) {
      window.eel.import_csv_to_table(tableId, expectedLabels)((res: any) => {
        if (res.success) {
          const msg = `04.さとふる受注データに ${res.count}件のデータが取り込まれました。`
          onNotify?.(msg)
          loadData();
        } else {
          alert("取り込みエラー: " + res.error);
        }
      });
    }
  };

  const handleDateModeChange = (mode: DateMode) => {
    setDateMode(mode)
    localStorage.setItem(LS_DATE_MODE_KEY, mode)
  }

  const handleCustomDateChange = (val: string) => {
    setCustomDate(val)
    localStorage.setItem(LS_CUSTOM_DATE_KEY, val)
  }

  const handleExport = () => {
    if (dateMode === 'custom' && !customDate) {
      alert('カレンダーで日付を選択してください。')
      setIsSettingsOpen(true)
      return
    }
    if (window.eel) {
      window.eel.export_table_csv(tableId, columnOrder, viewMode, dateMode, customDate || null)((res: any) => {
        if (res.success) {
          alert("Excelを出力しました。");
        } else if (res.error) {
          alert("出力エラー: " + res.error);
        }
      });
    }
  };

  const handleRowDataUpdate = (rowId: any, field: string, value: any) => {
    setTableData(prev => prev.map(row =>
      String(row.id) === String(rowId) ? { ...row, [field]: value } : row
    ));
    if (window.eel) {
      window.eel.update_row_field(tableId, rowId, field, value)((res: any) => {
        if (!res.success) {
          console.error("Failed to update row:", res.error);
        }
      });
    }
  };

  // 複数フィールドの一括更新（伝票表示名選択時など）
  const handleRowMultiUpdate = (rowId: any, updates: Record<string, any>) => {
    setTableData(prev => prev.map(row =>
      String(row.id) === String(rowId) ? { ...row, ...updates } : row
    ));
    if (window.eel) {
      window.eel.update_order_record(tableId, rowId, updates)((res: any) => {
        if (!res.success) {
          console.error("Failed to update row:", res.error);
        }
      });
    }
  };

  return (
    <DataViewContainer>
      <div className="relative">
        <ActionBar
          onSearch={setSearchWord}
          onCreate={() => setIsEditorOpen(true)}
          onImport={handleImport}
          onExport={handleExport}
          onSummaryClick={() => setViewMode('summary')}
          viewMode={viewMode}
          onViewChange={(v) => setViewMode(v as any)}
          onDateFilterChange={setDateFilter}
          onSettingsClick={() => setIsSettingsOpen(prev => !prev)}
        />

        {/* 出力日設定パネル */}
        {isSettingsOpen && (
          <div
            ref={settingsPanelRef}
            className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl w-80 animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <span className="font-bold text-sm text-slate-700 flex items-center gap-1.5">
                <Calendar size={14} /> さとふる 出力日設定
              </span>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {(Object.keys(DATE_MODE_LABELS) as DateMode[]).map((mode) => (
                <label key={mode} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="date_mode"
                    value={mode}
                    checked={dateMode === mode}
                    onChange={() => handleDateModeChange(mode)}
                    className="accent-blue-600 w-4 h-4 shrink-0"
                  />
                  <span className={`text-sm ${dateMode === mode ? 'text-blue-700 font-bold' : 'text-slate-600'} group-hover:text-slate-900`}>
                    {DATE_MODE_LABELS[mode]}
                  </span>
                </label>
              ))}

              {dateMode === 'custom' && (
                <div className="mt-1 ml-6">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {customDate && (
                    <p className="text-[11px] text-blue-600 font-bold mt-1.5 text-center">
                      {formatDateWithWeekday(customDate)}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-1.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                設定を保存して閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'summary' ? (
          <OrderSummaryView
            onBack={() => setViewMode('basic')}
            title="04.さとふる受注データ"
            tableId={tableId}
            data={tableData}
            masterProducts={masterProducts}
            draggable
            parentDateMode={dateMode}
            parentCustomDate={customDate || undefined}
            initialDateFilter={dateFilter}
          />
        ) : (
          <OrderTable
            type="satofuru"
            viewMode={viewMode}
            searchTerm={searchWord}
            data={displayData}
            masterProducts={masterProducts}
            masterData={masterData}
            tableId={tableId}
            onColumnOrderChange={setColumnOrder}
            onRowDataUpdate={handleRowDataUpdate}
            onRowMultiUpdate={handleRowMultiUpdate}
            onRowDetail={setDetailRow}
            onRefresh={loadData}
          />
        )}
      </div>

      <OrderEditorModal 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="04.さとふる受注データ"
        fields={SATOFURU_FIELDS}
        tableId={tableId}
        onSuccess={loadData}
      />
      <OrderDetailModal 
        isOpen={!!detailRow}
        onClose={() => setDetailRow(null)}
        rowData={detailRow}
        tableId={tableId}
        onSaveSuccess={() => {
          setDetailRow(null);
          loadData();
        }}
      />
    </DataViewContainer>
  )
}