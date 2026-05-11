'use client'
import { useState, useEffect } from 'react'
import { 
  BarChart3, ChevronDown, Calendar, Clock, 
  CheckCircle2, Download, FolderSearch, FileText, CheckSquare, Square
} from 'lucide-react'

export default function SummaryTab({ eelReady }: { eelReady: boolean }) {
  const [tables, setTables] = useState<any[]>([])
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]) // 複数DB選択用
  const [summaryData, setSummaryData] = useState<any[]>([])
  
  // フィルタ設定
  const [dateType, setDateType] = useState<'all' | 'today' | 'yesterday' | 'range'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')

  // 全テーブル一覧を取得
  const loadTables = () => {
    window.eel.fetch_all_tables()((res: any[]) => {
      setTables(res)
      // 初回のみ、一番新しいテーブルを自動選択
      if (res.length > 0 && selectedTableIds.length === 0) {
        setSelectedTableIds([res[res.length - 1].id])
      }
    })
  }

  // 画面上のプレビュー計算表を更新
  const runAggregation = () => {
    if (selectedTableIds.length === 0) {
      setSummaryData([]);
      return;
    }
    // 選択された全てのテーブルIDとフィルタ条件をPythonへ送る
    window.eel.fetch_summary(
      selectedTableIds, 
      dateType, 
      startDate, 
      endDate, 
      startTime, 
      endTime
    )((res: any[]) => {
      setSummaryData(res);
    })
  }

  useEffect(() => { if (eelReady) loadTables(); }, [eelReady])
  
  // 選択DB、期間、時間が変わるたびに再計算
  useEffect(() => { 
    runAggregation(); 
  }, [selectedTableIds, dateType, startDate, endDate, startTime, endTime])

  // DBの選択切り替え
  const toggleTable = (id: string) => {
    setSelectedTableIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  // --- 出力実行（複数DB ＋ フィルタ条件を一括送信） ---
  const handleBulkExport = (mode: "all" | "csv_only") => {
    if (selectedTableIds.length === 0) {
      alert("集計対象のデータを1つ以上選択してください");
      return;
    }

    window.eel.pick_folder()((dir: string) => {
      if (!dir) return;

      window.eel.export_files_combined(
        selectedTableIds, 
        dir, 
        dateType, 
        startDate, 
        endDate, 
        startTime, 
        endTime, 
        mode
      )((res: any) => {
        if (res.success) {
          alert(mode === "all" ? "統合出荷セット（3点セット）を保存しました。" : "統合送付用CSVを保存しました。");
        } else {
          alert("エラー: " + res.error);
        }
      });
    });
  }

  const totalCount = summaryData.reduce((sum, item) => sum + item.個数, 0)

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      
      {/* ツールバー */}
      <div className="flex flex-col space-y-4 border-b-4 border-slate-900 pb-6 text-slate-900">
        <div className="flex justify-between items-center text-slate-900">
          <div className="flex items-center space-x-4">
            <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none text-slate-900">集計指示書</h1>
            <BarChart3 size={40} className="text-indigo-600" />
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => handleBulkExport('all')} 
              className="bg-emerald-600 text-white px-8 py-5 font-black flex items-center space-x-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Download size={24} />
              <span>統合出荷セット出力</span>
            </button>
            <button 
              onClick={() => handleBulkExport('csv_only')} 
              className="bg-slate-900 text-white px-8 py-5 font-black flex items-center space-x-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
            >
              <FileText size={24} />
              <span>統合CSVのみ出力</span>
            </button>
          </div>
        </div>

        {/* フィルタエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-6 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] space-y-4">
            <p className="font-black uppercase text-xs tracking-widest text-slate-400">1. 集計対象データを選択 (複数選択可)</p>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {tables.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => toggleTable(t.id)}
                  className={`flex items-center space-x-2 px-5 py-3 border-2 font-black transition-all ${
                    selectedTableIds.includes(t.id) 
                    ? 'bg-indigo-600 text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' 
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {selectedTableIds.includes(t.id) ? <CheckSquare size={20}/> : <Square size={20}/>}
                  <span>{t.id.toUpperCase()}</span>
                </button>
              ))}
              {tables.length === 0 && <p className="text-slate-400 italic text-sm">登録済みのデータがありません</p>}
            </div>
          </div>

          <div className="bg-white p-6 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] space-y-4 text-slate-900">
            <p className="font-black uppercase text-xs tracking-widest text-slate-400">2. 期間・時刻絞り込み</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: '全期間' },
                { id: 'today', label: '今日' },
                { id: 'yesterday', label: '昨日' },
                { id: 'range', label: '指定' }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setDateType(t.id as any)} 
                  className={`px-6 py-2 font-black border-2 border-slate-900 transition-all ${dateType === t.id ? 'bg-slate-900 text-white' : 'bg-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {dateType === 'range' && (
                <div className="flex items-center space-x-2 bg-slate-100 p-2 border-2 border-slate-900 animate-in slide-in-from-left-2">
                  <Calendar size={18} className="text-slate-500" />
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent font-bold outline-none" />
                  <span className="font-black">~</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent font-bold outline-none" />
                </div>
              )}
              {dateType !== 'all' && (
                <div className="flex items-center space-x-2 bg-slate-100 p-2 border-2 border-slate-900 animate-in slide-in-from-left-2">
                  <Clock size={18} className="text-slate-500" />
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-transparent font-bold outline-none" />
                  <span className="font-black">~</span>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-transparent font-bold outline-none" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 集計プレビュー表 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border-[6px] border-slate-900 shadow-[15px_15px_0px_0px_rgba(79,70,229,0.1)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-6 font-black uppercase tracking-widest border-r border-slate-700">商品名 (選択データ合算)</th>
                <th className="p-6 font-black uppercase tracking-widest text-right w-40">合計個数</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-900 text-lg">
              {summaryData.map((item, idx) => (
                <tr key={idx} className="border-b-2 border-slate-100 hover:bg-indigo-50 transition-colors">
                  <td className="p-5 border-r border-slate-100">{item.正規化名}</td>
                  <td className="p-5 text-3xl font-black text-right text-indigo-600 font-mono">{item.個数}</td>
                </tr>
              ))}
              {summaryData.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-20 text-center text-slate-300 italic font-black text-xl">
                    条件に合うデータがありません
                  </td>
                </tr>
              )}
              <tr className="bg-slate-50 border-t-4 border-slate-900">
                <td className="p-6 text-2xl font-black italic uppercase">合算合計</td>
                <td className="p-6 text-5xl font-black text-right text-rose-600 font-mono">{totalCount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 border-[6px] border-slate-900 p-8 text-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3 mb-4">
               <CheckCircle2 size={32} />
               <h3 className="text-xl font-black uppercase italic">出荷指示ステータス</h3>
            </div>
            <p className="text-4xl font-black leading-tight tracking-tighter mb-4 text-white">準備完了</p>
            <div className="pt-4 border-t-2 border-indigo-400 space-y-3">
               <p className="text-xs font-bold opacity-80 uppercase tracking-widest">選択中のデータ数</p>
               <p className="text-2xl font-black">{selectedTableIds.length} 個のDBを統合中</p>
            </div>
          </div>
          
          <div className="bg-slate-900 p-6 text-white border-4 border-slate-900 flex items-start space-x-4">
             <FolderSearch size={48} className="text-emerald-400 shrink-0" />
             <div className="space-y-2 text-[11px] font-bold text-slate-300 leading-relaxed">
               <p className="text-emerald-400 text-sm font-black italic underline decoration-2">統合出力の仕様:</p>
               <p>選択した全てのDB（さとふる/do等）を一つにまとめ、「管理コード」と「ギフト」を除外して保存します。</p>
               <p className="text-rose-400 mt-2">※画面のフィルタ（今日/昨日/指定）がそのまま出力ファイルに適用されます。</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}