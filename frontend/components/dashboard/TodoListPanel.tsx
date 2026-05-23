'use client'
import { ListTodo, Settings, RefreshCcw, Clock, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Filter } from 'lucide-react'

export default function TodoListPanel() {
  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
      {/* ヘッダー (指定色: d99795) */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#d99795] text-slate-800">
        <div className="flex items-center space-x-2">
          <ListTodo size={18} />
          <h2 className="font-bold text-sm">TODOリスト</h2>
        </div>
        <div className="flex items-center space-x-2">
           <div className="flex space-x-0.5 border-r border-slate-800/30 pr-2">
             <div className="w-0.5 h-3 bg-slate-700"></div><div className="w-0.5 h-3 bg-slate-700"></div>
           </div>
           <Settings size={16} className="cursor-pointer hover:rotate-90 transition-transform opacity-80" />
           <RefreshCcw size={16} className="cursor-pointer hover:rotate-180 transition-transform opacity-80" />
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 flex flex-col text-xs text-slate-600">
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 p-2 font-bold text-center">
          <div className="flex items-center justify-center space-x-1 cursor-pointer hover:text-slate-900"><span>状態</span><Filter size={12} className="text-slate-300"/></div>
          <div className="flex items-center justify-center space-x-1 cursor-pointer hover:text-slate-900"><span>タイトル</span><Filter size={12} className="text-slate-300"/></div>
          <div className="flex items-center justify-center space-x-1 cursor-pointer hover:text-slate-900"><span>期限</span><Filter size={12} className="text-slate-300"/></div>
        </div>
        <div className="flex-1 flex items-center justify-center text-slate-300 font-bold italic p-6">
          No Data
        </div>
      </div>

      {/* フッター */}
      <div className="px-4 py-2 border-t border-slate-100 flex justify-between items-center bg-white">
        <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
          <Clock size={12} /><span>2026/04/06 (月) 10:06:02</span>
        </div>
        <div className="flex space-x-1">
          {[ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight].map((Icon, idx) => (
            <button key={idx} className="p-0.5 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 text-slate-400">
              <Icon size={12} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}