'use client'
import React, { useMemo, useState, useEffect } from 'react'
import { BarChart3, Download, Printer, ChevronLeft, X, GripVertical } from 'lucide-react'
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

interface OrderSummaryViewProps {
  onBack: () => void
  title: string
  tableId: string
  data: any[]
  masterProducts?: string[]
  draggable?: boolean
}

function formatDateJP(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${y}年${m}月${d}日`
}

// ドラッグ可能な商品行コンポーネント
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

export default function OrderSummaryView({ onBack, title, tableId, data, masterProducts, draggable = false }: OrderSummaryViewProps) {

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [productOrder, setProductOrder] = useState<string[]>([])

  const { dates, pivotData } = useMemo(() => {
    const dateSet = new Set<string>()
    const pivot: { [product: string]: { [date: string]: number } } = {}

    data.forEach(row => {
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
  }, [data])

  // masterProducts が変わるたびに productOrder を初期化（ただしドラッグ後はユーザー順を維持）
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
    setShowExportDialog(false)
    window.eel.export_summary_excel_custom(tableId, selected)((res: any) => {
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
          {/* 総計行 */}
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
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
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
              <GripVertical size={12} /> 行をドラッグで並び替えできます
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openExportDialog}
            className="flex items-center px-3 py-1 text-[12px] border border-slate-300 rounded bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors gap-1"
          >
            <Download size={14} /> Excel出力
          </button>
          <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Printer size={18} /></button>
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
