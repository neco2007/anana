'use client'
import NoticeBoxPanel from '../dashboard/NoticeBoxPanel'
import SatofuruPanel from '../dashboard/SatofuruPanel'
import ShinchoPressPanel from '../dashboard/ShinchoPressPanel'
import SatofuruSummaryPanel from '../dashboard/SatofuruSummaryPanel'
import ShinchoSummaryPanel from '../dashboard/ShinchoSummaryPanel'

interface AppNotification {
  id: number;
  message: string;
  time: string;
  read: boolean;
}

interface DashboardTabProps {
  onSelectSatofuru: () => void;
  onSelectShincho: () => void;
  onSelectMaster: (type: 'satofuru' | 'sincho') => void;
  notifications: AppNotification[];
}

export default function DashboardTab({
  onSelectSatofuru,
  onSelectShincho,
  onSelectMaster,
  notifications
}: DashboardTabProps) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in pb-10">
      {/* 上段: お知らせ（全幅） */}
      <NoticeBoxPanel notifications={notifications} />

      {/* 中段: 操作パネル */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SatofuruPanel
          onSelectData={onSelectSatofuru}
          onShowMaster={onSelectMaster}
        />
        <ShinchoPressPanel
          onSelectData={onSelectShincho}
          onShowMaster={onSelectMaster}
        />
      </div>

      {/* 下段: 発注集計 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SatofuruSummaryPanel />
        <ShinchoSummaryPanel />
      </div>
    </div>
  )
}