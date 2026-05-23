'use client'
import { Database, Briefcase, Package, Settings, RefreshCcw, Clock } from 'lucide-react'

// 型定義の追加
interface ShinchoPressPanelProps {
  onSelectData?: () => void;
  onShowMaster?: (type: 'satofuru' | 'sincho') => void;
}

export default function ShinchoPressPanel({ onSelectData, onShowMaster }: ShinchoPressPanelProps) {
  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col h-full overflow-hidden">
      {/* ヘッダー部分は維持 (指定色: ffe699) */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#ffe699] text-slate-800">
        <div className="flex items-center space-x-2">
          <Database size={18} className="fill-[#fcd34d] text-amber-500" />
          <h2 className="font-bold text-sm">03.新朝プレス分</h2>
        </div>
        <div className="flex items-center space-x-2 opacity-70">
           <Settings size={16} className="cursor-pointer hover:rotate-90 transition-transform" />
           <RefreshCcw size={16} className="cursor-pointer hover:rotate-180 transition-transform" />
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-center">
        {/* 受注データ */}
        <div 
          onClick={onSelectData}
          className="flex items-center justify-between text-slate-800 font-bold text-sm pb-2 cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded group"
        >
           <div className="flex items-center space-x-2">
             <Briefcase className="text-amber-700 fill-amber-700 group-hover:scale-105 transition-transform" size={18} />
             <span className="group-hover:text-blue-600 transition-colors">03.新朝プレス 受注データ</span>
           </div>
           <Settings size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* 商品マスタ: onClickを追加し、hoverスタイルを適用 */}
        <div 
          onClick={() => onShowMaster?.('sincho')} // ここで引数を渡して実行
      className="flex items-center justify-between text-slate-800 font-bold text-sm pb-2 cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded group"
        >
           <div className="flex items-center space-x-2">
             <Package className="text-amber-300 fill-amber-300 group-hover:scale-105 transition-transform" size={18} />
             <span className="group-hover:text-blue-600 transition-colors">03.新朝プレス 商品マスタ</span>
           </div>
           <Settings size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* フッター */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center space-x-1 text-slate-500 text-[11px] bg-white">
        <Clock size={12} /><span>2026/04/06 (月) 10:06:02</span>
      </div>
    </div>
  )
}