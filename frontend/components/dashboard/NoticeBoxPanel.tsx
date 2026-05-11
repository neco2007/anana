'use client'
import { Megaphone, RefreshCcw, Clock } from 'lucide-react'

interface AppNotification {
  id: number;
  message: string;
  time: string;
  read: boolean;
}

interface NoticeBoxPanelProps {
  notifications?: AppNotification[];
}

export default function NoticeBoxPanel({ notifications = [] }: NoticeBoxPanelProps) {
  const now = new Date()
  const timeStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} (${['日','月','火','水','木','金','土'][now.getDay()]}) ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`

  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden min-h-[200px]">
      {/* ヘッダー */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-2 text-slate-800">
          <Megaphone className="text-amber-400 fill-amber-400" size={18} />
          <h2 className="font-bold text-sm">お知らせBOX</h2>
        </div>
        <button className="text-slate-500 hover:text-slate-800"><RefreshCcw size={16} /></button>
      </div>

      {/* コンテンツ */}
      <div className="p-4 flex-1 overflow-y-auto text-slate-700">
        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">お知らせはありません</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map(n => (
              <li key={n.id} className="flex items-start space-x-2 text-xs py-2 border-b border-slate-100 last:border-0">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <div>
                  <p className="text-slate-700">{n.message}</p>
                  <p className="text-slate-400 text-[10px] mt-0.5">{n.time}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* フッター */}
      <div className="px-4 py-2 border-t border-slate-100 flex items-center space-x-1 text-slate-500 text-[11px]">
        <Clock size={12} /><span>{timeStr}</span>
      </div>
    </div>
  )
}
