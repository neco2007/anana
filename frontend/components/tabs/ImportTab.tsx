'use client'
import { Upload, Loader2, AlertTriangle, RefreshCcw, PlusCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

interface ImportTabProps {
  eelReady: boolean;
  onComplete: () => void;
}

export default function ImportTab({ eelReady, onComplete }: ImportTabProps) {
  const [loading, setLoading] = useState(false)

  // --- 重複確認モーダル用ステート ---
  const [dupModal, setDupModal] = useState<{
    isOpen: boolean;
    importId: string;
    count: number;
    examples: any[];
    tableName: string;
  }>({ isOpen: false, importId: '', count: 0, examples: [], tableName: '' });

  const handleImport = () => {
    if (!eelReady) return; 
    setLoading(true)
    
    window.eel.process_and_navigate()((res: any) => {
      console.log("Import Response:", res);

      if (res.status === "confirm") {
        // 重複が見つかった場合、パネルを表示
        setDupModal({
          isOpen: true,
          importId: res.import_id,
          count: res.duplicate_count,
          examples: res.duplicates,
          tableName: res.table_name
        });
        setLoading(false);
      } else if (res.success) {
        setLoading(false);
        onComplete(); 
      } else {
        alert("取り込みに失敗しました。ファイル形式を確認してください。");
        setLoading(false);
      }
    })
  }

  // --- 重複確定処理 ---
  const handleConfirmImport = (mode: 'overwrite' | 'new' | 'cancel') => {
    if (mode === 'cancel') {
      setDupModal(prev => ({ ...prev, isOpen: false }));
      return;
    }
    
    setLoading(true);
    window.eel.finalize_import(dupModal.importId, mode)((res: any) => {
      if (res.success) {
        setDupModal(prev => ({ ...prev, isOpen: false }));
        onComplete(); 
      } else {
        alert("エラー: " + res.error);
      }
      setLoading(false);
    });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in">
      
      {/* --- 重複検知パネル (日本語・黒文字・ Neo-Brutalism スタイル) --- */}
      {dupModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white border-8 border-slate-900 max-w-2xl w-full p-8 shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center space-x-4 text-rose-600 mb-6">
              <AlertTriangle size={48} strokeWidth={3} />
              <h2 className="text-4xl font-black italic uppercase tracking-tighter">重複を検知しました</h2>
            </div>
            
            <p className="text-lg font-bold mb-4">
              既存テーブル <span className="underline decoration-indigo-500 decoration-4">"{dupModal.tableName}"</span> 内に、
              <span className="text-rose-600 text-2xl px-2 font-black">{dupModal.count}件</span> の同一データが見つかりました。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <button onClick={() => handleConfirmImport('overwrite')} className="bg-indigo-600 text-white p-4 font-black flex flex-col items-center hover:bg-indigo-700 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                <RefreshCcw size={24} className="mb-1" />
                <span>上書き登録</span>
              </button>
              <button onClick={() => handleConfirmImport('new')} className="bg-emerald-600 text-white p-4 font-black flex flex-col items-center hover:bg-emerald-700 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                <PlusCircle size={24} className="mb-1" />
                <span>新規として登録</span>
              </button>
              <button onClick={() => handleConfirmImport('cancel')} className="bg-slate-200 text-slate-900 p-4 font-black flex flex-col items-center hover:bg-slate-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none">
                <XCircle size={24} className="mb-1" />
                <span>キャンセル</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-4xl font-black text-slate-800">データ取り込み</h1>
      
      <div 
        onClick={!loading ? handleImport : undefined}
        className={`w-full max-w-xl border-4 border-dashed rounded-[3rem] p-20 text-center transition-all bg-slate-50/50 
          ${eelReady && !loading ? 'border-slate-200 hover:bg-white hover:border-indigo-400 cursor-pointer group' : 'border-slate-100 opacity-50 cursor-not-allowed'}
        `}
      >
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-indigo-500" size={64} />
        ) : (
          <>
            <Upload size={64} className={`mx-auto mb-6 transition-transform ${eelReady ? 'text-slate-300 group-hover:scale-110' : 'text-slate-200'}`} />
            <p className="text-2xl font-bold text-slate-600">
              {eelReady ? "CSV / Excelを選択して開始" : "システム準備中..."}
            </p>
          </>
        )}
      </div>
      <p className="text-slate-400 text-sm italic">
        ※ 取り込み後、自動で検索（item1）画面へ移動します
      </p>
    </div>
  )
}