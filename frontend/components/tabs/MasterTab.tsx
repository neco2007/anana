'use client'
import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Search, RefreshCcw, FileSpreadsheet } from 'lucide-react'

// propsの型定義を正確に行い、page.tsxのエラーを解消します
interface MasterTabProps {
  eelReady: boolean;
  setDirty?: (val: boolean) => void;
}

export default function MasterTab({ eelReady, setDirty }: MasterTabProps) {
  const [rows, setRows] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadMaster = () => {
    setLoading(true)
    window.eel.fetch_master()((res: any[]) => {
      setRows(res)
      setIsDirty(false)
      if (setDirty) setDirty(false)
      setLoading(false)
    })
  }

  useEffect(() => {
    if (eelReady) loadMaster()
  }, [eelReady])

  const handleCellChange = (idx: number, key: string, val: string) => {
    const newRows = [...rows]
    newRows[idx][key] = val
    setRows(newRows)
    setIsDirty(true)
    if (setDirty) setDirty(true)
  }

  const addRow = () => {
    const newRow = rows.length > 0 
      ? Object.fromEntries(Object.keys(rows[0]).map(k => [k, ""]))
      : { "管理コード": "", "商品名": "", "検索キーワード1": "" }
    setRows([...rows, newRow])
    setIsDirty(true)
    if (setDirty) setDirty(true)
  }

  const deleteRow = (idx: number) => {
    if (!confirm("この行を削除しますか？")) return
    setRows(rows.filter((_, i) => i !== idx))
    setIsDirty(true)
    if (setDirty) setDirty(true)
  }

  const saveToExcel = () => {
    setLoading(true)
    window.eel.update_master(rows)((res: any) => {
      if (res.success) {
        alert("Excelファイルを更新しました！")
        setIsDirty(false)
        if (setDirty) setDirty(false)
      } else {
        alert("保存エラー: " + res.error)
      }
      setLoading(false)
    })
  }

  const filteredRows = rows.filter(row => 
    Object.values(row).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const headers = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex flex-col space-y-4 border-b-4 border-slate-900 pb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-4xl font-black uppercase tracking-tighter italic">Master Management</h1>
            <button onClick={loadMaster} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title="再読み込み">
              <RefreshCcw size={24} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="flex space-x-4">
            <button onClick={addRow} className="bg-slate-900 text-white px-6 py-3 font-black flex items-center space-x-2 shadow-[4px_4px_0px_0px_rgba(79,70,229,1)] hover:-translate-y-1 transition-all">
              <Plus size={20} /><span>追加</span>
            </button>
            <button 
              onClick={saveToExcel} 
              disabled={!isDirty}
              className={`px-8 py-3 font-black flex items-center space-x-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${isDirty ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              <Save size={20} /><span>EXCELに保存</span>
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="キーワード検索..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-4 border-slate-900 font-bold focus:outline-none shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]"
          />
        </div>
      </div>

      <div className="bg-white border-4 border-slate-900 overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-900 text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4 border border-slate-700 w-16 text-center">消去</th>
                {headers.map(h => (
                  <th key={h} className="px-6 py-4 border border-slate-700 text-left uppercase font-black">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-900 font-bold">
              {filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 border-b-2 border-slate-100">
                  <td className="text-center">
                    <button onClick={() => deleteRow(idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>
                  </td>
                  {headers.map(h => (
                    <td key={h} className="p-0">
                      <input 
                        type="text" 
                        value={row[h]} 
                        onChange={(e) => handleCellChange(idx, h, e.target.value)}
                        className="w-full h-full px-6 py-4 bg-transparent focus:bg-indigo-50 focus:outline-none transition-colors"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center space-x-2 text-slate-400 italic">
        <FileSpreadsheet size={16} />
        <span className="text-xs">エクセル(master.xlsx)と直接同期しています。</span>
      </div>
    </div>
  )
}