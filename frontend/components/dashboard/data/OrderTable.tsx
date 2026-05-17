'use client'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  FileText, ChevronDown, ListFilter, GripVertical,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Trash2,
} from 'lucide-react'
import SearchableSelect from './SearchableSelect'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ==========================================
// 1. 列ヘッダー（ドラッグ + リサイズ対応）
// ==========================================
interface SortableHeaderProps {
  id: string
  label: string
  width?: number
  onResizeStart: (e: React.MouseEvent) => void
}

function SortableHeader({ id, label, width, onResizeStart }: SortableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : undefined,
    opacity: isDragging ? 0.5 : 1,
    width: width ? `${width}px` : undefined,
    minWidth: width ? `${width}px` : '120px',
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="p-2 border-r text-left font-bold text-slate-600 bg-slate-50 relative group whitespace-nowrap select-none"
    >
      <div className="flex items-center justify-between pr-2">
        <div className="flex items-center gap-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 rounded">
            <GripVertical size={13} className="text-slate-400" />
          </div>
          <span>{label}</span>
        </div>
        <div className="flex flex-col opacity-20 group-hover:opacity-100 transition-opacity">
          <ChevronDown size={8} className="rotate-180" />
          <ChevronDown size={8} />
        </div>
      </div>
      <ListFilter size={10} className="absolute left-0.5 bottom-0.5 text-slate-300" />
      {/* リサイズハンドル */}
      <div
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400 bg-transparent z-20"
        onMouseDown={onResizeStart}
        onClick={e => e.stopPropagation()}
      />
    </th>
  )
}

// ==========================================
// 2. 行（縦ドラッグ対応）
// ==========================================
interface SortableRowProps {
  rowId: string
  row: any
  index: number
  activeColumns: { id: string }[]
  colWidths: Record<string, number>
  isSelected: boolean
  onToggle: (id: string) => void
  onDetail: (row: any) => void
  renderCell: (row: any, colId: string) => React.ReactNode
}

function SortableRow({
  rowId, row, index, activeColumns, colWidths,
  isSelected, onToggle, onDetail, renderCell,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowId })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: isDragging ? 'relative' : undefined,
    zIndex: isDragging ? 999 : undefined,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} hover:bg-indigo-50 transition-colors`}
    >
      <td className="p-2 border-r text-center align-middle w-10">
        <input
          type="checkbox"
          className="cursor-pointer"
          checked={isSelected}
          onChange={() => onToggle(rowId)}
        />
      </td>
      <td className="p-2 border-r text-center align-middle w-14">
        <div className="flex items-center justify-center gap-0.5">
          {/* 行ドラッグハンドル */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 rounded"
            title="ドラッグで並び替え"
          >
            <GripVertical size={13} />
          </div>
          <button
            onClick={() => onDetail(row)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <FileText size={14} />
          </button>
        </div>
      </td>
      {activeColumns.map(col => (
        <td
          key={col.id}
          className="p-2 border-r align-middle text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ maxWidth: colWidths[col.id] ? `${colWidths[col.id]}px` : '300px' }}
        >
          {renderCell(row, col.id)}
        </td>
      ))}
      <td />
    </tr>
  )
}

// ==========================================
// 3. メインコンポーネント
// ==========================================
interface OrderTableProps {
  type: 'satofuru' | 'sincho'
  viewMode: 'basic' | 'all' | 'summary'
  searchTerm?: string
  data: any[]
  masterProducts?: string[]
  masterData?: any[]
  tableId?: string
  onColumnOrderChange?: (newOrder: string[]) => void
  onRowDataUpdate?: (rowId: string, field: string, value: any) => void
  onRowMultiUpdate?: (rowId: string, updates: Record<string, any>) => void
  onRowDetail?: (row: any) => void
  onRefresh?: () => void
}

export default function OrderTable({
  type,
  viewMode,
  searchTerm = '',
  data = [],
  masterProducts = [],
  masterData = [],
  tableId,
  onColumnOrderChange,
  onRowDataUpdate,
  onRowMultiUpdate,
  onRowDetail,
  onRefresh,
}: OrderTableProps) {

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [rowOrder, setRowOrder] = useState<string[]>([])
  const [colWidths, setColWidths] = useState<Record<string, number>>({})
  const resizeState = useRef<{ colId: string; startX: number; startWidth: number } | null>(null)

  // --- 列定義 ---
  const initialColumns = useMemo(() => {
    if (type === 'satofuru') {
      return [
        { id: '配送情報番号', label: '配送情報番号' },
        { id: 'お礼品ID',     label: 'お礼品ID' },
        { id: 'お礼品名',     label: 'お礼品名' },
        { id: '伝票表示名',   label: '伝票表示名' },
        { id: '発注商品名',   label: '発注商品名' },
        { id: '伝票番号',     label: '伝票番号' },
        { id: '発注日',       label: '発注日' },
        { id: '集荷予定日',   label: '集荷予定日' },
        { id: '_import_at',   label: '登録日' },
      ]
    }
    return [
      { id: '配送管理ID',           label: '配送管理ID' },
      { id: '商品コード',           label: '商品コード' },
      { id: '返礼品',               label: '返礼品' },
      { id: '発注商品名',           label: '発注商品名' },
      { id: '配送伝票備考',         label: '配送伝票備考' },
      { id: '備考',                 label: '備考' },
      { id: 'お届け指定時間帯',     label: 'お届け指定時間帯' },
      { id: '寄付者',               label: '寄付者' },
      { id: '届け先名称カナ',       label: '届け先名称カナ' },
      { id: '寄付者住所(都道府県)', label: '寄付者住所(都道府県)' },
      { id: '登録日時',             label: '登録日時' },
      { id: 'お届け先名',           label: 'お届け先名' },
      { id: '届け先都道府県',       label: '届け先都道府県' },
    ]
  }, [type])

  const [columns, setColumns] = useState(initialColumns)

  const activeColumns = useMemo(() => {
    if (viewMode === 'all' && data.length > 0) {
      const allKeys = Object.keys(data[0]).filter(k => !k.startsWith('_') && k !== 'id')
      const currentKeys = columns.map(c => c.id)
      let extra = allKeys.filter(k => !currentKeys.includes(k)).map(k => ({ id: k, label: k }))
      if (type === 'satofuru') {
        const seikiIdx = extra.findIndex(c => c.id === '正規化名')
        if (seikiIdx > -1) {
          const [seikiCol] = extra.splice(seikiIdx, 1)
          const mergedCols = [...columns]
          const densyoIdx = mergedCols.findIndex(c => c.id === '伝票表示名')
          if (densyoIdx > -1) {
            mergedCols.splice(densyoIdx + 1, 0, seikiCol)
            return [...mergedCols, ...extra]
          }
        }
      }
      return [...columns, ...extra]
    }
    return columns
  }, [viewMode, columns, data, type])

  // お礼品名（伝票表示名）→ マスタレコード（最初の一致）
  const slipNameToRecord = useMemo(() => {
    const map = new Map<string, any>()
    for (const row of masterData) {
      const sn = (row['お礼品名'] || '').trim()
      if (sn && !map.has(sn)) map.set(sn, row)
    }
    return map
  }, [masterData])

  // 伝票表示名（マスタ お礼品名）の選択肢（マスタ順・重複除去）
  const slipNameOptions = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const row of masterData) {
      const sn = (row['お礼品名'] || '').trim()
      if (sn && !seen.has(sn)) { seen.add(sn); result.push(sn) }
    }
    return result
  }, [masterData])

  // 発注商品名 → 対応する伝票表示名（お礼品名）のリスト（フィルタ用）
  const productToSlipNames = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const row of masterData) {
      const pn = (row['発注商品名'] || '').trim()
      const sn = (row['お礼品名'] || '').trim()
      if (pn && sn) {
        if (!map.has(pn)) map.set(pn, [])
        const arr = map.get(pn)!
        if (!arr.includes(sn)) arr.push(sn)
      }
    }
    return map
  }, [masterData])

  // 発注商品名の選択肢（マスタ順の 発注商品名 のみ・データ内未登録値も追加）
  const productOptions = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const pn of masterProducts) {
      if (!seen.has(pn)) { seen.add(pn); result.push(pn) }
    }
    for (const row of data) {
      const pn = (row['発注商品名'] || '').trim()
      if (pn && !seen.has(pn)) { seen.add(pn); result.push(pn) }
    }
    return result
  }, [masterProducts, data])

  // --- 検索フィルタリング ---
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    const lower = searchTerm.toLowerCase()
    return data.filter(row =>
      Object.values(row).some(val => String(val).toLowerCase().includes(lower))
    )
  }, [data, searchTerm])

  // --- 行順序を filteredData に同期 ---
  useEffect(() => {
    const newIds = filteredData.map(r => String(r.id))
    setRowOrder(prev => {
      const prevSet = new Set(prev)
      const newSet = new Set(newIds)
      const kept = prev.filter(id => newSet.has(id))
      const added = newIds.filter(id => !prevSet.has(id))
      return [...kept, ...added]
    })
  }, [filteredData])

  // rowOrder 順に並べた表示データ
  const orderedData = useMemo(() => {
    const map = new Map(filteredData.map(r => [String(r.id), r]))
    return rowOrder.map(id => map.get(id)).filter(Boolean) as any[]
  }, [filteredData, rowOrder])

  // --- 全選択 ---
  const allIds = filteredData.map(r => String(r.id))
  const allSelected = allIds.length > 0 && allIds.every(id => selectedRows.has(id))
  const someSelected = allIds.some(id => selectedRows.has(id)) && !allSelected

  const toggleAll = () => setSelectedRows(allSelected ? new Set() : new Set(allIds))
  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // --- 選択行削除 ---
  const handleDeleteSelected = () => {
    if (selectedRows.size === 0 || !tableId || !window.eel) return
    if (!window.confirm(`選択中の ${selectedRows.size} 件を削除しますか？\nこの操作は元に戻せません。`)) return
    window.eel.delete_rows(tableId, Array.from(selectedRows))((res: any) => {
      if (res.success) { setSelectedRows(new Set()); onRefresh?.() }
      else alert('削除エラー: ' + res.error)
    })
  }

  // --- 列幅リサイズ ---
  const handleResizeStart = (colId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeState.current = { colId, startX: e.clientX, startWidth: colWidths[colId] ?? 150 }

    const onMove = (ev: MouseEvent) => {
      if (!resizeState.current) return
      // コールバックが非同期実行される前に値をローカルに取り出す（null参照クラッシュ防止）
      const { colId: currentColId, startWidth, startX } = resizeState.current
      const newW = Math.max(60, startWidth + (ev.clientX - startX))
      setColWidths(prev => ({ ...prev, [currentColId]: newW }))
    }
    const onUp = () => {
      resizeState.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // --- DnD センサー（列用・行用を分ける） ---
  const colSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const rowSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleColDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setColumns(prev => {
        const oldIdx = prev.findIndex(c => c.id === active.id)
        const newIdx = prev.findIndex(c => c.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return prev
        const next = arrayMove(prev, oldIdx, newIdx)
        onColumnOrderChange?.(next.map(c => c.id))
        return next
      })
    }
  }

  const handleRowDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setRowOrder(prev => {
        const oldIdx = prev.indexOf(String(active.id))
        const newIdx = prev.indexOf(String(over.id))
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  // 伝票表示名選択ハンドラ: 選択値を伝票表示名フィールドに保存し関連フィールドを一括更新
  const handleSlipSelect = (rowId: any, val: string) => {
    const slipRecord = slipNameToRecord.get(val)
    if (slipRecord) {
      const pn = (slipRecord['発注商品名'] || '').trim()
      const code = (slipRecord['商品コード'] || '').trim()
      if (type === 'satofuru') {
        // さとふる: 伝票表示名・発注商品名・お礼品ID を一括更新
        onRowMultiUpdate?.(rowId, { '伝票表示名': val, '発注商品名': pn, 'お礼品ID': code })
      } else {
        // sincho: 返礼品（伝票表示名）・発注商品名・商品コード を一括更新
        onRowMultiUpdate?.(rowId, { '返礼品': val, '発注商品名': pn, '商品コード': code })
      }
    } else {
      const field = type === 'satofuru' ? '伝票表示名' : '返礼品'
      onRowDataUpdate?.(rowId, field, val)
    }
  }

  // --- セルレンダリング ---
  const renderCell = (row: any, colId: string): React.ReactNode => {
    // さとふる / 新朝 共通: 発注商品名 → SearchableSelect（発注商品名のみ）
    if (colId === '発注商品名') {
      return (
        <SearchableSelect
          options={productOptions}
          value={row['発注商品名'] || ''}
          onChange={val => onRowDataUpdate?.(row.id, '発注商品名', val)}
          placeholder="商品を選択..."
          usePortal
          className="min-w-[180px]"
        />
      )
    }

    // さとふる: 伝票表示名 → 現在の発注商品名でフィルタしたSearchableSelect
    if (colId === '伝票表示名' && type === 'satofuru') {
      const currentPn = (row['発注商品名'] || '').trim()
      const filteredOptions = currentPn
        ? (productToSlipNames.get(currentPn) ?? slipNameOptions)
        : slipNameOptions
      return (
        <SearchableSelect
          options={filteredOptions}
          value={row['伝票表示名'] || ''}
          onChange={val => handleSlipSelect(row.id, val)}
          placeholder="伝票表示名を選択..."
          usePortal
          className="min-w-[180px]"
        />
      )
    }

    // 新朝専用インライン編集
    if (type === 'sincho') {
      switch (colId) {
        case 'のし':
          return (
            <select
              value={row['のし'] || 'なし'}
              onChange={e => onRowDataUpdate?.(row.id, 'のし', e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:ring-0 cursor-pointer"
            >
              {['なし', 'あり', '御祝', '御中元', '御歳暮'].map(o => <option key={o}>{o}</option>)}
            </select>
          )
        case '備考':
          return (
            <input
              type="text"
              value={row['備考'] || ''}
              onChange={e => onRowDataUpdate?.(row.id, '備考', e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:ring-0 placeholder:text-slate-300"
              placeholder="メモを入力..."
            />
          )
        case '配送伝票備考':
          return (
            <input
              type="text"
              value={row['配送伝票備考'] || ''}
              onChange={e => onRowDataUpdate?.(row.id, '配送伝票備考', e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:ring-0 placeholder:text-slate-300"
              placeholder="配送伝票備考を入力..."
            />
          )
      }
    }

    if (colId === '伝票番号') {
      const val = row['伝票番号']
      return (!val || String(val).trim() === '')
        ? <span className="text-slate-400 italic text-xs">伝票発行中</span>
        : String(val)
    }

    if (colId === '_import_at') {
      const val = row['_import_at']
      return val ? String(val).slice(0, 10) : ''
    }

    const value = row[colId]
    return value === undefined || value === null ? '' : String(value)
  }

  return (
    <div className="flex flex-col h-full bg-white">

      {/* 選択中バー */}
      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-blue-50 border-b border-blue-200 shrink-0">
          <span className="text-[12px] text-blue-700 font-bold">{selectedRows.size} 件選択中</span>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 px-3 py-1 text-[12px] bg-rose-600 text-white rounded hover:bg-rose-700 transition-colors font-bold"
          >
            <Trash2 size={13} /> 削除
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto border-t border-slate-200">
        {/* 列 DnD コンテキスト */}
        <DndContext sensors={colSensors} collisionDetection={closestCenter} onDragEnd={handleColDragEnd}>
          <table className="w-full text-[12px] border-collapse min-w-max">

            <thead className="sticky top-0 bg-slate-50 border-b-2 border-slate-300 z-10 shadow-sm">
              <SortableContext items={activeColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                <tr>
                  <th className="p-2 border-r w-10 text-center bg-slate-50">
                    <input
                      type="checkbox"
                      className="rounded-none border-slate-400 cursor-pointer"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleAll}
                      title="全選択 / 全解除"
                    />
                  </th>
                  <th className="p-2 border-r w-14 bg-slate-50 text-center text-slate-400 text-[10px]">操作</th>
                  {activeColumns.map(col => (
                    <SortableHeader
                      key={col.id}
                      id={col.id}
                      label={col.label}
                      width={colWidths[col.id]}
                      onResizeStart={e => handleResizeStart(col.id, e)}
                    />
                  ))}
                  <th className="w-4 bg-slate-50" />
                </tr>
              </SortableContext>
            </thead>

            {/* 行 DnD コンテキスト（tbody 内に閉じる） */}
            <DndContext sensors={rowSensors} collisionDetection={closestCenter} onDragEnd={handleRowDragEnd}>
              <tbody className="divide-y divide-slate-200">
                <SortableContext items={rowOrder} strategy={verticalListSortingStrategy}>
                  {orderedData.length > 0 ? (
                    orderedData.map((row, index) => (
                      <SortableRow
                        key={String(row.id)}
                        rowId={String(row.id)}
                        row={row}
                        index={index}
                        activeColumns={activeColumns}
                        colWidths={colWidths}
                        isSelected={selectedRows.has(String(row.id))}
                        onToggle={toggleRow}
                        onDetail={r => onRowDetail?.(r)}
                        renderCell={renderCell}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={activeColumns.length + 3} className="p-20 text-center text-slate-400 italic bg-white">
                        表示するデータがありません。CSVを読み込んでください。
                      </td>
                    </tr>
                  )}
                </SortableContext>
              </tbody>
            </DndContext>

          </table>
        </DndContext>
      </div>

      {/* フッター */}
      <div className="flex items-center justify-between p-2 px-6 bg-slate-900 border-t border-slate-700 text-[11px] text-slate-400 shrink-0">
        <div className="font-mono uppercase tracking-widest">
          {type.toUpperCase()} / {viewMode.toUpperCase()} VIEW
        </div>
        <div className="flex items-center space-x-6 py-1">
          <span className="font-bold text-white">{filteredData.length} 件のレコード</span>
          <div className="flex items-center border border-slate-700 rounded bg-slate-800 overflow-hidden">
            <button className="px-2 py-1 border-r border-slate-700 hover:bg-slate-700 text-slate-500"><ChevronsLeft size={14} /></button>
            <button className="px-2 py-1 border-r border-slate-700 hover:bg-slate-700 text-slate-500"><ChevronLeft size={14} /></button>
            <button className="px-3 py-1 border-r border-slate-700 bg-indigo-600 text-white font-bold">1</button>
            <button className="px-2 py-1 border-r border-slate-700 hover:bg-slate-700 text-slate-400"><ChevronRight size={14} /></button>
            <button className="px-2 py-1 hover:bg-slate-700 text-slate-400"><ChevronsRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
