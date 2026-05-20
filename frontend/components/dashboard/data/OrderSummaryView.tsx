'use client'
import React, { useMemo, useState, useEffect } from 'react'
import { BarChart3, Download, Printer, ChevronLeft, X, GripVertical, Filter, Settings, Calendar } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SummaryDateMode = 'today' | 'today_weekday' | 'next_day' | 'next_weekday' | 'custom' | 'same_as_data'

const SUMMARY_DATE_MODE_LABELS: Record<SummaryDateMode, string> = {
  today:         '本日の日付（土日祝含む）',
  today_weekday: '本日の日付（土日祝含まない）',
  next_day:      '翌日の日付（土日祝含む）',
  next_weekday:  '翌営業日の日付（土日祝含まない）',
  custom:        'カレンダーで日付を指定',
  same_as_data:  '受注データと同一の日付',
}

interface OrderSummaryViewProps {
  onBack: () => void
  title: string
  tableId: string
  data: any[]
  masterProducts?: string[]
  draggable?: boolean
  parentDateMode?: string
  parentCustomDate?: string
  initialDateFilter?: number | null
}

const WEEKDAYS_JP = ['日', '月', '火', '水', '木', '金', '土']

function formatDateJP(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d)
  return `${y}年${m}月${d}日（${WEEKDAYS_JP[date.getDay()]}）`
}

function formatDateWithWeekday(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return ''
  const [y, m, d] = parts
  const date = new Date(y, m - 1, d)
  return `${y}年${m}月${d}日（${WEEKDAYS_JP[date.getDay()]}）`
}

function SortableProductRow({
  product,
  dates,
  pivotData,
  rowIdx,
  draggable,
}: {
  product: string
  dates: string[]
  pivotData: { [p: string]: { [d: string]: number } }
  rowIdx: number
  draggable: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: product,
    disabled: !draggable,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group hover:bg-blue-50/50 transition-colors ${rowIdx % 2 === 1 ? 'bg-[#f9f9fb]' : 'bg-white'}`}
    >
      <td className="p-3 font-bold text-slate-700 border-r border-slate-300 sticky left-0 z-10 bg-inherit group-hover:bg-blue-50">
        <div className="flex items-center gap-2">
          {draggable && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0">
              <GripVertical size={14} />
            </div>
          )}
          <span>{product}</span>
        </div>
      </td>
      {dates.map(date => {
        const count = pivotData[product]?.[date] || 0
        return (
          <td
            key={date}
            className={`p-3 text-center border-r border-slate-300 font-medium ${count > 0 ? 'text-blue-600 font-bold' : 'text-slate-300'}`}
          >
            {count}ケース
          </td>
        )
      })}
    </tr>
  )
}

export default function OrderSummaryView({
  onBack, title, tableId, data, masterProducts, draggable = false,
  parentDateMode = 'today', parentCustomDate = '',
  initialDateFilter = null,
}: OrderSummaryViewProps) {

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [productOrder, setProductOrder] = useState<string[]>([])

  // 表示フィルター（取込日絞り込み）— 親ビューの日付フィルターを初期値として引き継ぐ
  const [dateFilter, setDateFilter] = useState<number | null>(initialDateFilter)

  // 集計専用 出力日設定
  const [showSettings, setShowSettings] = useState(false)
  const [summaryDateMode, setSummaryDateMode] = useState<SummaryDateMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(`summary_output_date_mode_${tableId}`) as SummaryDateMode) || 'today'
    }
    return 'today'
  })
  const [summaryCustomDate, setSummaryCustomDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`summary_output_custom_date_${tableId}`) || ''
    }
    return ''
  })

  // 表示データをローカル日付でフィルタリング
  const filteredData = useMemo(() => {
    if (dateFilter === null) return data
    const d = new Date()
    d.setDate(d.getDate() - dateFilter)
    const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return data.filter(row => String(row['_import_at'] || '').slice(0, 10) === targetDate)
  }, [data, dateFilter])

  const { dates, pivotData } = useMemo(() => {
    const dateSet = new Set<string>()
    const pivot: { [product: string]: { [date: string]: number } } = {}

    filteredData.forEach(row => {
      const rawDate =
        row['インポート日'] ||
        (row['_import_at'] ? String(row['_import_at']).split(' ')[0] : '') ||
        ''
      const date = rawDate.replace(/\//g, '-').split('T')[0]
      const product = (row['発注商品名'] || '').trim()
      const count = parseInt(row['ケース数']) || 0

      if (date && product) {
        dateSet.add(date)
        if (!pivot[product]) pivot[product] = {}
        pivot[product][date] = (pivot[product][date] || 0) + count
      }
    })

    const sortedDates = Array.from(dateSet).sort()
    return { dates: sortedDates, pivotData: pivot }
  }, [filteredData])

  const baseProducts = useMemo(() => {
    if (masterProducts && masterProducts.length > 0) {
      return masterProducts.filter(p => p.trim() !== '')
    }
    return Object.keys(pivotData).filter(p => p).sort()
  }, [masterProducts, pivotData])

  useEffect(() => {
    setProductOrder(baseProducts)
  }, [baseProducts])

  const products = productOrder.length > 0 ? productOrder : baseProducts

  const totals = useMemo(() => {
    const result: { [date: string]: number } = {}
    dates.forEach(date => {
      result[date] = products.reduce((sum, product) => sum + (pivotData[product]?.[date] || 0), 0)
    })
    return result
  }, [dates, pivotData, products])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setProductOrder(prev => {
        const oldIdx = prev.indexOf(String(active.id))
        const newIdx = prev.indexOf(String(over.id))
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  const handleDateModeChange = (mode: SummaryDateMode) => {
    setSummaryDateMode(mode)
    localStorage.setItem(`summary_output_date_mode_${tableId}`, mode)
  }

  const handleCustomDateChange = (val: string) => {
    setSummaryCustomDate(val)
    localStorage.setItem(`summary_output_custom_date_${tableId}`, val)
  }

  const openExportDialog = () => {
    setSelectedDates(new Set(dates))
    setShowExportDialog(true)
  }

  const toggleDate = (date: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const handleExport = () => {
    if (!window.eel) return
    const selected = dates.filter(d => selectedDates.has(d))
    if (selected.length === 0) { alert('出力する日付を1つ以上選択してください'); return }

    if (summaryDateMode === 'custom' && !summaryCustomDate) {
      alert('カレンダーで日付を選択してください。')
      return
    }

    // same_as_data の場合は受注データビューの設定を使用
    const effectiveDateMode = summaryDateMode === 'same_as_data'
      ? (parentDateMode || 'today')
      : summaryDateMode
    const effectiveCustomDate = summaryDateMode === 'same_as_data'
      ? (parentCustomDate || null)
      : (summaryDateMode === 'custom' ? summaryCustomDate : null)

    setShowExportDialog(false)
    window.eel.export_summary_excel_custom(tableId, selected, effectiveDateMode, effectiveCustomDate)((res: any) => {
      if (!res.success) alert('出力エラー: ' + res.error)
    })
  }

  const tableContent = (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <table className="w-full border-collapse text-[11px] min-w-max bg-white">
        <thead className="sticky top-0 z-20 shadow-sm">
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-3 text-left font-bold text-slate-500 bg-slate-50 border-r border-slate-300 w-[280px] sticky left-0 z-30">
              商品名
            </th>
            {dates.map(date => (
              <th key={date} className="p-0 border-r border-slate-300 min-w-[110px]">
                <div className="py-2 px-3 text-center font-bold text-slate-700 bg-slate-50 border-b border-slate-200">
                  {formatDateJP(date)}
                </div>
                <div className="py-1 text-[10px] text-slate-400 text-center bg-white border-b border-slate-100">個数</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          <SortableContext items={products} strategy={verticalListSortingStrategy}>
            {products.map((product, rowIdx) => (
              <SortableProductRow
                key={product}
                product={product}
                dates={dates}
                pivotData={pivotData}
                rowIdx={rowIdx}
                draggable={draggable}
              />
            ))}
          </SortableContext>
          <tr className="bg-amber-50 border-t-2 border-amber-300 sticky bottom-0 z-10">
            <td className="p-3 text-right font-black text-slate-700 border-r border-slate-300 sticky left-0 z-20 bg-amber-50">
              総計
            </td>
            {dates.map(date => {
              const total = totals[date] || 0
              return (
                <td
                  key={date}
                  className={`p-3 text-center border-r border-slate-300 font-black ${total > 0 ? 'text-blue-600' : 'text-slate-300'}`}
                >
                  {total}ケース
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </DndContext>
  )

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-300">

      {/* 日付選択ダイアログ */}
      {showExportDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow-2xl w-80 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-[13px] font-bold text-slate-700">出力する日付を選択</span>
              <button onClick={() => setShowExportDialog(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-slate-100 flex gap-3">
              <button onClick={() => setSelectedDates(new Set(dates))} className="text-[11px] text-blue-600 hover:underline">すべて選択</button>
              <button onClick={() => setSelectedDates(new Set())} className="text-[11px] text-slate-500 hover:underline">すべて解除</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-2 space-y-1">
              {dates.length === 0 && (
                <p className="text-[12px] text-slate-400 py-4 text-center">データがありません</p>
              )}
              {dates.map(date => (
                <label key={date} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-slate-50 rounded px-1">
                  <input
                    type="checkbox"
                    checked={selectedDates.has(date)}
                    onChange={() => toggleDate(date)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-[12px] text-slate-700">{formatDateJP(date)}</span>
                </label>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setShowExportDialog(false)} className="px-3 py-1.5 text-[12px] border border-slate-300 rounded hover:bg-slate-50">キャンセル</button>
              <button onClick={handleExport} className="px-4 py-1.5 text-[12px] bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                <Download size={13} /> 出力
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ツールバー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0 shadow-sm gap-3">

        {/* 左側 */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center px-3 py-1 text-[12px] border border-slate-300 rounded bg-white hover:bg-slate-50 transition-all font-bold text-slate-600"
          >
            <ChevronLeft size={16} className="mr-1" /> 戻る
          </button>
          <div className="flex items-center text-slate-700">
            <BarChart3 size={18} className="mr-2 text-blue-500" />
            <h2 className="text-[14px] font-black tracking-tight">{title} 集計結果</h2>
          </div>
          {draggable && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <GripVertical size={12} /> 行をドラッグで並び替え
            </span>
          )}
        </div>

        {/* 中央: 取込日フィルター */}
        <div className="flex items-center border border-slate-300 rounded bg-white shadow-sm overflow-hidden">
          <div className="p-1.5 border-r border-slate-300 bg-white">
            <Filter size={13} className="text-slate-500" />
          </div>
          <select
            className="px-2 py-1 text-[12px] bg-white outline-none cursor-pointer hover:bg-slate-50 appearance-none pr-7 relative text-slate-700"
            value={dateFilter === null ? '' : String(dateFilter)}
            onChange={(e) => {
              const val = e.target.value
              setDateFilter(val === '' ? null : parseInt(val))
            }}
            style={{
              backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%230079bf\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")',
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '13px'
            }}
          >
            <option value="">全期間</option>
            <option value="0">取込分が本日</option>
            <option value="1">1日前（昨日）の取込</option>
            <option value="2">2日前（おととい）の取込</option>
            <option value="3">3日前の取込</option>
            <option value="4">4日前の取込</option>
            <option value="5">5日前の取込</option>
            <option value="6">6日前の取込</option>
          </select>
        </div>

        {/* 右側 */}
        <div className="flex items-center gap-2 shrink-0">

          {/* 出力日設定ギア */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(prev => !prev)}
              title="集計 出力日設定"
              className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
            >
              <Settings size={18} />
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl w-80 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                  <span className="font-bold text-sm text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} /> 集計 出力日設定
                  </span>
                  <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-700">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 flex flex-col gap-3">
                  {(Object.keys(SUMMARY_DATE_MODE_LABELS) as SummaryDateMode[]).map((mode) => (
                    <label key={mode} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name={`summary_date_mode_${tableId}`}
                        value={mode}
                        checked={summaryDateMode === mode}
                        onChange={() => handleDateModeChange(mode)}
                        className="accent-blue-600 w-4 h-4 shrink-0"
                      />
                      <span className={`text-sm ${summaryDateMode === mode ? 'text-blue-700 font-bold' : 'text-slate-600'} group-hover:text-slate-900`}>
                        {SUMMARY_DATE_MODE_LABELS[mode]}
                      </span>
                    </label>
                  ))}

                  {summaryDateMode === 'custom' && (
                    <div className="mt-1 ml-6">
                      <input
                        type="date"
                        value={summaryCustomDate}
                        onChange={(e) => handleCustomDateChange(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      {summaryCustomDate && (
                        <p className="text-[11px] text-blue-600 font-bold mt-1.5 text-center">
                          {formatDateWithWeekday(summaryCustomDate)}
                        </p>
                      )}
                    </div>
                  )}

                  {summaryDateMode === 'same_as_data' && (
                    <p className="ml-6 text-[11px] text-slate-400">
                      受注データビューで設定中: <span className="font-bold text-slate-600">{parentDateMode}</span>
                      {parentDateMode === 'custom' && parentCustomDate && (
                        <span>（{parentCustomDate}）</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full py-1.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    設定を保存して閉じる
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={openExportDialog}
            className="flex items-center px-3 py-1 text-[12px] border border-slate-300 rounded bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors gap-1"
          >
            <Download size={14} /> Excel出力
          </button>
          <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
            <Printer size={18} />
          </button>
        </div>
      </div>

      {products.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          集計対象のデータがありません
        </div>
      )}

      {products.length > 0 && (
        <div className="flex-1 overflow-auto bg-[#f8f9fa]">
          {tableContent}
        </div>
      )}
    </div>
  )
}
