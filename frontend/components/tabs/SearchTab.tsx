'use client'
import { useState, useEffect } from 'react'
import { 
  Save, Trash2, XCircle, ChevronDown, Filter, 
  CheckSquare, Square, Search, Edit2, RefreshCcw, 
  Clock, Calendar, AlertTriangle, Layers, Copy, PlusCircle,
  User, ClipboardList, Info, Check, MapPin, Package, CreditCard,
  FileSpreadsheet
} from 'lucide-react'

export default function SearchTab({ eelReady }: { eelReady: boolean }) {
  const [tables, setTables] = useState<any[]>([])
  const [activeTableId, setActiveTableId] = useState<string | null>(null)
  const [localRows, setLocalRows] = useState<any[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleHeaders, setVisibleHeaders] = useState<string[]>([])
  const [tempHeaders, setTempHeaders] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const [dateType, setDateType] = useState<'all' | 'today' | 'yesterday' | 'range'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')

  const [duplicateModal, setDuplicateModal] = useState<{
    isOpen: boolean; importId: string; count: number; examples: any[]; tableName: string;
  }>({ isOpen: false, importId: '', count: 0, examples: [], tableName: '' });

  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = () => {
    window.eel.fetch_all_tables()((res: any) => {
      setTables(res)
      if (res.length > 0 && (!activeTableId || !res.find((t: any) => t.id === activeTableId))) {
        setActiveTableId(res[res.length - 1].id)
      }
    })
  }

  useEffect(() => { if (eelReady) loadData(); }, [eelReady])

  useEffect(() => {
    const table = tables.find(t => t.id === activeTableId)
    if (table) {
      setLocalRows(JSON.parse(JSON.stringify(table.rows)))
      const displayHeaders = table.headers.filter((h: string) => h !== '_import_at' && h !== 'インポート日')
      setVisibleHeaders(displayHeaders)
      setTempHeaders(displayHeaders)
      setIsDirty(false)
    }
  }, [activeTableId, tables])

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleImportCSV = () => {
    window.eel.process_and_navigate()((res: any) => {
      if (res.status === "confirm") {
        setDuplicateModal({
          isOpen: true, importId: res.import_id, count: res.duplicate_count,
          examples: res.duplicates, tableName: res.table_name
        });
      } else if (res.success) { alert("インポート完了"); loadData(); }
    });
  }

  // --- 【変更】全データ統合エクセルを出力して開く ---
  const handleOpenExcelFile = () => {
    window.eel.open_excel_folder()((res: any) => {
      if (!res.success) alert("エラー: " + res.error);
    });
  }

  const handleConfirmImport = (mode: 'overwrite' | 'new' | 'cancel') => {
    if (mode === 'cancel') { setDuplicateModal(prev => ({ ...prev, isOpen: false })); return; }
    window.eel.finalize_import(duplicateModal.importId, mode)((res: any) => {
      if (res.success) { setDuplicateModal(prev => ({ ...prev, isOpen: false })); loadData(); }
      else alert("エラー: " + res.error);
    });
  }

  const filteredRowsWithIndex = localRows.map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const matchesSearch = !searchQuery || Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      );
      const fullTimestamp = row._import_at || "";
      const importDateStr = fullTimestamp.split(' ')[0] || "";
      const importTimeStr = fullTimestamp.split(' ')[1] ? fullTimestamp.split(' ')[1].substring(0, 5) : "";
      const now = new Date();
      const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = new Date(yesterdayDate.getTime() - (yesterdayDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      let mD = true;
      if (dateType === 'today') mD = (importDateStr === today);
      else if (dateType === 'yesterday') mD = (importDateStr === yesterday);
      else if (dateType === 'range') {
        if (startDate && importDateStr < startDate) mD = false;
        if (endDate && importDateStr > endDate) mD = false;
      }
      let mT = true;
      if (mD && dateType !== 'all') {
          if (startTime && importTimeStr < startTime) mT = false;
          if (endTime && importTimeStr > endTime) mT = false;
      }
      return matchesSearch && mD && mT;
    })
    .sort((a, b) => (b.row._import_at || "").localeCompare(a.row._import_at || ""));

  const handleCellChange = (actualIdx: number, key: string, val: string) => {
    const newRows = [...localRows]; newRows[actualIdx][key] = val; setLocalRows(newRows); setIsDirty(true);
  }

  const handleDeleteRow = (actualIdx: number) => {
    if (!confirm("削除しますか？")) return;
    setLocalRows(localRows.filter((_, i) => i !== actualIdx)); setIsDirty(true);
  }

  const handleUpdate = () => {
    if (!activeTableId) return
    window.eel.save_table_changes(activeTableId, localRows)(() => {
      alert("データベースを更新しました"); setIsDirty(false); loadData();
    })
  }

  const handleDeleteTable = () => {
    if (!activeTableId || !confirm("完全に削除しますか？")) return
    window.eel.delete_table(activeTableId)(() => { setActiveTableId(null); loadData(); })
  }

  const handleRenameTable = () => {
    if (!activeTableId) return
    const newName = prompt("新しい名前を入力してください", activeTableId)
    if (newName && newName !== activeTableId) {
      window.eel.rename_item(activeTableId, newName)((res: any) => {
        if (res.success) { setActiveTableId(null); loadData(); }
        else alert("エラー: " + res.error);
      })
    }
  }

  const getIconForKey = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('名') || k.includes('氏')) return <User size={14} />;
    if (k.includes('コード') || k.includes('id') || k.includes('番号')) return <CreditCard size={14} />;
    if (k.includes('住所') || k.includes('宛先') || k.includes('県')) return <MapPin size={14} />;
    if (k.includes('品') || k.includes('商品')) return <Package size={14} />;
    return <ClipboardList size={14} />;
  };

  const activeTable = tables.find(t => t.id === activeTableId)

  return (
    <div className="relative space-y-4 animate-in fade-in pb-10">

      {/* 全画面詳細パネル */}
      {selectedRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 md:p-10 animate-in fade-in duration-300 text-slate-900">
          <div className="bg-white border-[6px] border-slate-900 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-[30px_30px_0px_0px_rgba(79,70,229,0.4)] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b-[6px] border-slate-900 bg-indigo-600 text-white flex justify-between items-start">
              <div>
                <p className="text-indigo-200 font-black tracking-[0.3em] uppercase text-xs mb-2">Record Overview</p>
                <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{selectedRow.正規化名 || "NO NAME"}</h2>
              </div>
              <button onClick={() => setSelectedRow(null)} className="bg-slate-900 p-3 hover:bg-rose-600 transition-colors shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                <XCircle size={40} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {Object.entries(selectedRow).map(([key, value]) => {
                  if (key.startsWith('_')) return null;
                  const valStr = String(value || "");
                  return (
                    <div key={key} className="relative group border-b-2 border-slate-100 pb-4 hover:border-indigo-500 transition-all text-slate-900">
                      <div className="flex items-center space-x-2 text-slate-400 group-hover:text-indigo-600 transition-colors mb-2">
                        {getIconForKey(key)}
                        <label className="text-[10px] font-black uppercase tracking-[0.2em]">{key}</label>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-xl font-bold break-all leading-tight">{valStr || "No entry"}</span>
                        {valStr && (
                          <button onClick={() => handleCopy(valStr, key)} className={`ml-4 p-2 ${copiedKey === key ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-600'}`}>
                            {copiedKey === key ? <Check size={20} /> : <Copy size={20} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t-4 border-slate-900 flex justify-between items-center text-slate-900">
              <div className="flex space-x-12">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Import Date</span>
                  <span className="font-mono font-bold text-slate-700 text-lg">{selectedRow.インポート日}</span>
                </div>
                <div className="flex flex-col border-l-4 border-indigo-200 pl-8">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Timestamp</span>
                  <span className="font-mono font-bold text-slate-500">{selectedRow._import_at}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重複確認パネル */}
      {duplicateModal.isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white border-8 border-slate-900 max-w-2xl w-full p-10 shadow-[30px_30px_0px_0px_rgba(225,29,72,0.3)] animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center space-x-6 text-rose-600 mb-8">
              <AlertTriangle size={64} strokeWidth={3} />
              <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">重複を検知しました</h2>
            </div>
            <p className="text-xl font-bold mb-6 text-slate-700">
              既存テーブル <span className="underline decoration-indigo-500 decoration-[6px]">"{duplicateModal.tableName}"</span> 内に、
              <span className="text-rose-600 text-3xl mx-1">{duplicateModal.count}件</span> の同一データがあります。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
              <button onClick={() => handleConfirmImport('overwrite')} className="bg-indigo-600 text-white p-6 font-black flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                <RefreshCcw size={28} className="mb-2" /><span>上書き登録</span>
              </button>
              <button onClick={() => handleConfirmImport('new')} className="bg-emerald-600 text-white p-6 font-black flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                <PlusCircle size={28} className="mb-2" /><span>新規登録</span>
              </button>
              <button onClick={() => handleConfirmImport('cancel')} className="bg-slate-200 text-slate-900 p-6 font-black flex flex-col items-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                <XCircle size={28} className="mb-2" /><span>キャンセル</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メインツールバー */}
      <div className="flex flex-col space-y-4 border-b-4 border-slate-900 pb-6 text-slate-900">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">Order Records</h1>
            <button onClick={loadData} className="p-3 hover:bg-slate-100 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><RefreshCcw size={20} /></button>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleOpenExcelFile} className="bg-emerald-600 text-white px-6 py-5 font-black flex items-center space-x-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
              <FileSpreadsheet size={24} /><span>VIEW ALL EXCEL</span>
            </button>
            <button onClick={handleImportCSV} className="bg-indigo-600 text-white px-8 py-5 font-black flex items-center space-x-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all">
              <Layers size={24} /><span>IMPORT CSV</span>
            </button>
            {isDirty && (
              <button onClick={handleUpdate} className="bg-amber-500 text-white px-8 py-5 font-black flex items-center space-x-3 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                <Save size={24} /><span>SAVE UPDATES</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-6 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-center gap-1">
            {['all', 'today', 'yesterday', 'range'].map(id => (
              <button key={id} onClick={() => setDateType(id as any)} className={`px-6 py-3 font-black border-2 border-slate-900 ${dateType === id ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}>
                {id === 'all' ? '全期間' : id === 'today' ? '本日' : id === 'yesterday' ? '昨日' : '指定'}
              </button>
            ))}
          </div>
          {dateType !== 'all' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 bg-slate-100 p-2 border-2 border-slate-900">
                <Clock size={18} className="text-slate-500" />
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-transparent font-bold outline-none" />
                <span className="font-black">~</span>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-transparent font-bold outline-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-900" size={24} />
            <input type="text" placeholder="キーワード検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-14 pr-4 py-5 bg-white border-4 border-slate-900 font-bold text-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] focus:outline-none" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative w-72">
              <select value={activeTableId || ''} onChange={(e) => setActiveTableId(e.target.value)} className="w-full pl-5 pr-12 py-5 bg-white border-4 border-slate-900 font-black text-lg appearance-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {tables.map(t => <option key={t.id} value={t.id}>{t.id.toUpperCase()}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 pointer-events-none" size={24} />
            </div>
            <button onClick={handleRenameTable} className="p-5 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-400 transition-all"><Edit2 size={24} /></button>
            <button onClick={() => setShowFilter(!showFilter)} className={`flex items-center space-x-3 px-8 py-5 font-black border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${showFilter ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
              <Filter size={24} /><span>COLUMNS</span>
            </button>
            <button onClick={handleDeleteTable} className="p-5 border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={24} /></button>
          </div>
        </div>
      </div>

      {showFilter && activeTable && (
        <div className="bg-slate-100 border-4 border-slate-900 p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {activeTable.headers.map(h => (h !== '_import_at' && h !== 'インポート日') && (
              <label key={h} className={`flex items-center space-x-3 p-4 border-2 cursor-pointer transition-all ${tempHeaders.includes(h) ? 'bg-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <input type="checkbox" className="hidden" checked={tempHeaders.includes(h)} onChange={() => setTempHeaders(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])} />
                {tempHeaders.includes(h) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                <span className="text-xs font-black truncate uppercase">{h}</span>
              </label>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t-2 border-slate-300 flex justify-end">
            <button onClick={() => { setVisibleHeaders(tempHeaders); setShowFilter(false); }} className="bg-slate-900 text-white px-12 py-4 font-black shadow-[6px_6px_0px_0px_rgba(79,70,229,1)] hover:bg-indigo-600 transition-all">APPLY VIEW CONFIG</button>
          </div>
        </div>
      )}

      {activeTable ? (
        <div className="bg-white border-[6px] border-slate-900 overflow-hidden shadow-[20px_20px_0px_0px_rgba(0,0,0,0.1)]">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full border-collapse text-[11px] min-w-max">
              <thead className="bg-slate-900 text-white sticky top-0 z-20">
                <tr>
                  <th className="border border-slate-700 w-16 text-center text-slate-500 font-mono bg-slate-900">#</th>
                  <th className="border border-slate-700 w-16 text-center bg-slate-900">DEL</th>
                  <th className="border border-slate-700 w-16 text-center bg-slate-900 uppercase text-[9px]">View</th>
                  {visibleHeaders.map((h: string) => (
                    <th key={h} className="border border-slate-700 px-8 py-6 font-black text-left min-w-[220px] uppercase bg-slate-900 text-xs">{h}</th>
                  ))}
                  <th className="border border-slate-700 px-8 py-6 font-black text-left min-w-[180px] bg-slate-900 text-slate-400 font-mono italic">IMPORT TIME</th>
                </tr>
              </thead>
              <tbody className="bg-white text-slate-900">
                {filteredRowsWithIndex.map(({ row, index }) => (
                  <tr key={index} className="hover:bg-indigo-50/50 transition-colors group cursor-default">
                    <td className="border border-slate-300 text-center text-slate-400 bg-slate-50 font-mono text-xs">{index + 1}</td>
                    <td className="border border-slate-300 text-center">
                      <button onClick={() => handleDeleteRow(index)} className="text-slate-200 hover:text-rose-600 transition-colors"><XCircle size={18}/></button>
                    </td>
                    <td className="border border-slate-300 text-center">
                      <button onClick={() => setSelectedRow(row)} className="bg-slate-100 p-2 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <ClipboardList size={20}/>
                      </button>
                    </td>
                    {visibleHeaders.map((h: string) => (
                      <td key={h} className="border border-slate-300 p-0 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                        <input type="text" value={row[h] || ''} onChange={(e) => handleCellChange(index, h, e.target.value)} className="w-full h-full px-7 py-4 border-none focus:outline-none bg-transparent font-bold text-xs" />
                      </td>
                    ))}
                    <td className="border border-slate-300 px-7 py-4 text-slate-400 bg-slate-50 font-mono italic text-[10px]">{row._import_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-40 text-center text-slate-400 border-[6px] border-dashed border-slate-200 font-black italic text-2xl uppercase tracking-[0.2em]">SELECT A TABLE TO BEGIN</div>
      )}
    </div>
  )
}