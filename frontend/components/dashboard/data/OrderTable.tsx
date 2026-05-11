'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, ChevronDown, ListFilter, GripVertical, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';

// DnD Kit 関連のインポート
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ==========================================
// 1. カラム（列）ヘッダーコンポーネント (DnD対応)
// ==========================================
interface SortableHeaderProps {
  id: string;
  label: string;
}

function SortableHeader({ id, label }: SortableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th 
      ref={setNodeRef} 
      style={style} 
      className="p-2 border-r text-left font-bold text-slate-600 bg-slate-50 relative group min-w-[150px] whitespace-nowrap select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* ドラッグ用ハンドル */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 rounded">
            <GripVertical size={14} className="text-slate-400" />
          </div>
          <span>{label}</span>
        </div>
        <div className="flex flex-col opacity-20 group-hover:opacity-100 transition-opacity ml-2">
          <ChevronDown size={8} className="rotate-180" />
          <ChevronDown size={8} />
        </div>
      </div>
      <ListFilter size={10} className="absolute right-0.5 bottom-0.5 text-slate-300" />
    </th>
  );
}

// ==========================================
// 2. メインコンポーネント
// ==========================================
interface OrderTableProps {
  type: 'satofuru' | 'sincho';
  viewMode: 'basic' | 'all' | 'summary';
  searchTerm?: string;
  data: any[];
  onColumnOrderChange?: (newOrder: string[]) => void;
  onRowDataUpdate?: (rowId: string, field: string, value: any) => void;
  onRowDetail?: (row: any) => void;
}

export default function OrderTable({ 
  type, 
  viewMode, 
  searchTerm = '', 
  data = [],
  onColumnOrderChange,
  onRowDataUpdate,
  onRowDetail
}: OrderTableProps) {
  
  // --- 1. カラム定義の初期設定 ---
  const initialColumns = useMemo(() => {
    if (type === 'satofuru') {
      return [
        { id: "配送情報番号", label: "配送情報番号" },
        { id: "お礼品ID",     label: "お礼品ID" },
        { id: "お礼品名",     label: "お礼品名" },
        { id: "発注商品名",   label: "発注商品名" },
        { id: "伝票番号",     label: "伝票番号" },
        { id: "発注日",       label: "発注日" },
        { id: "集荷予定日",   label: "集荷予定日" },
        { id: "インポート日", label: "登録日" },
      ];
    } else {
      return [
        { id: "配送管理ID",           label: "配送管理ID" },
        { id: "商品コード",           label: "商品コード" },
        { id: "返礼品",               label: "返礼品" },
        { id: "発注商品名",           label: "発注商品名" },
        { id: "配送伝票備考",         label: "配送伝票備考" },
        { id: "備考",                 label: "備考" },
        { id: "お届け指定時間帯",     label: "お届け指定時間帯" },
        { id: "寄付者",               label: "寄付者" },
        { id: "届け先名称カナ",       label: "届け先名称カナ" },
        { id: "寄付者住所(都道府県)", label: "寄付者住所(都道府県)" },
        { id: "登録日時",             label: "登録日時" },
        { id: "お届け先名",           label: "お届け先名" },
        { id: "届け先都道府県",       label: "届け先都道府県" },
      ];
    }
  }, [type]);

  const [columns, setColumns] = useState(initialColumns);

  // 全項目モードの場合、不足しているカラムをDBデータから抽出して追加
  const activeColumns = useMemo(() => {
    if (viewMode === 'all' && data.length > 0) {
      const allKeys = Object.keys(data[0]).filter(k => !k.startsWith('_') && k !== 'id');
      const currentKeys = columns.map(c => c.id);
      const extraKeys = allKeys.filter(k => !currentKeys.includes(k));
      const extraColumns = extraKeys.map(k => ({ id: k, label: k }));
      return [...columns, ...extraColumns];
    }
    return columns;
  }, [viewMode, columns, data]);

  // --- 2. DnD センサー設定 ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        onColumnOrderChange?.(newOrder.map(c => c.id));
        return newOrder;
      });
    }
  };

  // --- 3. データ変換ロジック (新朝プレス用) ---
  const renderCell = (row: any, colId: string) => {
    if (type === 'sincho') {
      switch (colId) {
        case "のし":
          return (
            <select
              value={row["のし"] || "なし"}
              onChange={(e) => onRowDataUpdate?.(row.id, "のし", e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:ring-0 cursor-pointer"
            >
              <option value="なし">なし</option>
              <option value="あり">あり</option>
              <option value="御祝">御祝</option>
              <option value="御中元">御中元</option>
              <option value="御歳暮">御歳暮</option>
            </select>
          );
        case "備考":
          return (
            <input
              type="text"
              value={row["備考"] || ""}
              onChange={(e) => onRowDataUpdate?.(row.id, "備考", e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:ring-0 placeholder:text-slate-300"
              placeholder="メモを入力..."
            />
          );
        case "配送伝票備考":
          return (
            <input
              type="text"
              value={row["配送伝票備考"] || ""}
              onChange={(e) => onRowDataUpdate?.(row.id, "配送伝票備考", e.target.value)}
              className="w-full bg-transparent border-none text-xs focus:ring-0 placeholder:text-slate-300"
              placeholder="配送伝票備考を入力..."
            />
          );
      }
    }

    // 伝票番号が空欄の場合は「伝票発行中」を表示
    if (colId === '伝票番号') {
      const val = row['伝票番号'];
      return (!val || String(val).trim() === '')
        ? <span className="text-slate-400 italic text-xs">伝票発行中</span>
        : String(val);
    }

    // 通常の表示
    const value = row[colId];
    return value === undefined || value === null ? "" : String(value);
  };

  // --- 4. 検索フィルタリング ---
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const lower = searchTerm.toLowerCase();
    return data.filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(lower))
    );
  }, [data, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-auto border-t border-slate-200">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
          <table className="w-full text-[12px] border-collapse min-w-max">
            <thead className="sticky top-0 bg-slate-50 border-b-2 border-slate-300 z-10 shadow-sm">
              <SortableContext items={activeColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                <tr>
                  <th className="p-2 border-r w-10 text-center bg-slate-50"><input type="checkbox" className="rounded-none border-slate-400" /></th>
                  <th className="p-2 border-r w-10 bg-slate-50"></th>
                  {activeColumns.map((col) => (
                    <SortableHeader key={col.id} id={col.id} label={col.label} />
                  ))}
                  <th className="w-4 bg-slate-50"></th>
                </tr>
              </SortableContext>
            </thead>
            
            <tbody className="divide-y divide-slate-200">
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr 
                    key={row.id || index} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f8fafc]'} hover:bg-indigo-50 transition-colors group`}
                  >
                    <td className="p-2 border-r text-center align-middle"><input type="checkbox" /></td>
                    <td className="p-2 border-r text-center align-middle">
                    <button 
                      onClick={() => onRowDetail?.(row)} 
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                    <FileText size={15} />
                        </button>
                      </td>
                    {activeColumns.map((col) => (
                      <td key={col.id} className="p-2 border-r align-middle text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">
                        {renderCell(row, col.id)}
                      </td>
                    ))}
                    <td></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeColumns.length + 2} className="p-20 text-center text-slate-400 italic bg-white">
                    表示するデータがありません。CSVを読み込んでください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>

      {/* ページネーション風フッター */}
      <div className="flex items-center justify-between p-2 px-6 bg-slate-900 border-t border-slate-700 text-[11px] text-slate-400 shrink-0">
        <div className="font-mono uppercase tracking-widest">
          {type.toUpperCase()} / {viewMode.toUpperCase()} VIEW
        </div>
        <div className="flex items-center space-x-6 py-1">
          <span className="font-bold text-white">{filteredData.length} 件のレコード</span>
          <div className="flex items-center border border-slate-700 rounded bg-slate-800 overflow-hidden">
            <button className="px-2 py-1 border-r border-slate-700 hover:bg-slate-700 text-slate-500"><ChevronsLeft size={14}/></button>
            <button className="px-2 py-1 border-r border-slate-700 hover:bg-slate-700 text-slate-500"><ChevronLeft size={14}/></button>
            <button className="px-3 py-1 border-r border-slate-700 bg-indigo-600 text-white font-bold">1</button>
            <button className="px-2 py-1 border-r border-slate-700 hover:bg-slate-700 text-slate-400"><ChevronRight size={14}/></button>
            <button className="px-2 py-1 hover:bg-slate-700 text-slate-400"><ChevronsRight size={14}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}