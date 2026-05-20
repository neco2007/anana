'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  LogOut,
  Loader2,
  Bell,
  X,
  Pencil,
  LayoutGrid,
  Home,
  Type
} from 'lucide-react'

type FontSize = 'small' | 'medium' | 'large'
const FONT_SIZE_ZOOM: Record<FontSize, number> = { small: 0.85, medium: 1, large: 1.15 }
const FONT_SIZE_LABELS: Record<FontSize, string> = { small: '小', medium: '中', large: '大' }
import DashboardTab from '../components/tabs/DashboardTab'
import SatofuruDataView from '../components/dashboard/page/SatofuruDataView'
import ShinchoDataView from '../components/dashboard/page/ShinchoDataView'
import { Masta } from '../components/dashboard/data/masta'
import { Button } from 'primereact/button'

declare global { interface Window { eel: any } }

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('home') // 初期タブをホームに
  const [eelReady, setEelReady] = useState(false)
  const [debugMsg, setDebugMsg] = useState('Initializing...')

  // サイドバーの開閉状態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const [masterType, setMasterType] = useState<'satofuru' | 'sincho'>('satofuru')

  // 文字サイズ設定
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('app_font_size') as FontSize) || 'medium'
    }
    return 'medium'
  })

  // プロフィールパネル用の状態
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileImage, setProfileImage] = useState('/icon1.png')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // パネル外クリック検知用のRefを追加
  const profilePanelRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const profileTextRef = useRef<HTMLSpanElement>(null)

  interface AppNotification {
    id: number;
    message: string;
    time: string;
    read: boolean;
  }

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const notifPanelRef = useRef<HTMLDivElement>(null)
  const bellButtonRef = useRef<HTMLButtonElement>(null)

  const addNotification = useCallback((message: string) => {
    const now = new Date()
    const timeStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    const newNotif = { id: Date.now(), message, time: timeStr, read: false }
    setNotifications(prev => [newNotif, ...prev])
    setIsNotifOpen(true)
    window.eel.save_notification(message, timeStr)(() => {})
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  // パンくずリスト用のタブ名マッピング
  const tabNames: Record<string, string> = {
    home: 'ホーム',
    satofuru_data: 'さとふる受注データ',
    shincho_data: '新朝プレス受注データ'
  }

  useEffect(() => {
    document.documentElement.style.zoom = String(FONT_SIZE_ZOOM[fontSize])
  }, [fontSize])

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size)
    localStorage.setItem('app_font_size', size)
  }

  useEffect(() => {
    const checkEel = () => {
      if (!window.eel) {
        setDebugMsg('window.eel not found (layout.tsx check needed)')
        setTimeout(checkEel, 500)
        return
      }

      // Python側の関数が公開されるのを待つ
      if (typeof window.eel.fetch_all_tables === 'function') {
        console.log("--- [FRONT] Eel Connected Successfully ---")
        setEelReady(true)
        window.eel.get_notifications()((saved: AppNotification[]) => {
          if (Array.isArray(saved) && saved.length > 0) {
            setNotifications(saved)
          }
        })
      } else {
        setDebugMsg('Waiting for fetch_all_tables function from Python...')
        setTimeout(checkEel, 300)
      }
    }
    checkEel()
  }, [])

  // パネル外クリックを検知するuseEffectを追加
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isProfileOpen &&
        profilePanelRef.current &&
        !profilePanelRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node) &&
        profileTextRef.current &&
        !profileTextRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false)
      }
      if (
        isNotifOpen &&
        notifPanelRef.current &&
        !notifPanelRef.current.contains(event.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false)
      }
    }

    // イベントリスナーを登録
    document.addEventListener('mousedown', handleClickOutside)
    
    // クリーンアップ関数でイベントリスナーを削除
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProfileOpen, isNotifOpen])

  // 画像アップロードのシミュレート
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfileImage(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // 接続待ち画面（システム起動時）
  if (!eelReady) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-10">
        <Loader2 className="animate-spin text-indigo-500 mb-6" size={64} />
        <h2 className="text-2xl font-black italic tracking-tighter mb-2">SYSTEM CONNECTING...</h2>
        <p className="text-slate-400 font-mono text-xs bg-slate-800 p-4 rounded-xl border border-slate-700">
          Status: {debugMsg}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 text-xs text-slate-500 underline hover:text-white"
        >
          画面を再読み込みする
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans antialiased overflow-hidden">
      
      {/* 左サイドバー（固定・開閉式） */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-[72px]'} flex flex-col z-40 shrink-0 shadow-2xl`}>
        {/* トグルボタン（9つの四角） */}
        <div className="h-[88px] flex items-center justify-center border-b border-slate-800 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            title="メニューを開閉"
          >
            <LayoutGrid size={28} />
          </button>
        </div>
        
        {/* ナビゲーションメニュー */}
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto overflow-x-hidden">
          <SidebarBtn id="home" icon={<Home size={26}/>} label="ホーム" active={activeTab} onClick={setActiveTab} isOpen={isSidebarOpen} />
        </nav>
      </aside>

      {/* 右側メインエリア（全体がスクロール対象） */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        
        {/* トップヘッダー（太め） */}
        <header 
          className="flex items-center justify-between px-8 py-4 shrink-0 shadow-sm relative z-20" 
          style={{ backgroundColor: '#0079bf' }}
        >
          {/* ヘッダー左側: ロゴ */}
          <div className="flex items-center">
            <img 
              src="/ログインアイコン.png" 
              alt="OrderONE Logo" 
              className="h-14 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity" 
              onClick={() => setActiveTab('home')}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('public')) target.src = 'ログインアイコン.png';
              }}
            />
          </div>

          {/* ヘッダー右側: ツール群（大きめ） */}
          <div className="flex items-center space-x-6 text-white relative">
            
            {/* 通知ベル */}
            <button
              ref={bellButtonRef}
              className="relative p-2 hover:opacity-80 transition-opacity"
              onClick={() => {
                setIsNotifOpen(prev => !prev)
                if (!isNotifOpen) {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                }
              }}
            >
              <Bell size={28} fill="white" className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-[#0079bf]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* 通知パネル */}
            {isNotifOpen && (
              <div ref={notifPanelRef} className="absolute top-full right-52 mt-4 bg-white shadow-2xl rounded-lg w-80 text-slate-900 z-50 border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center bg-slate-100 px-4 py-3 border-b border-slate-200">
                  <span className="font-bold text-sm text-slate-600">通知</span>
                  <div className="flex items-center gap-3">
                    {notifications.length > 0 && (
                      <button onClick={() => { setNotifications([]); window.eel.clear_notifications()(() => {}) }} className="text-[11px] text-slate-400 hover:text-red-500">すべて削除</button>
                    )}
                    <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={18}/></button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-8">通知はありません</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 border-b border-slate-100 text-xs hover:bg-slate-50">
                        <p className="text-slate-700 leading-relaxed">{n.message}</p>
                        <p className="text-slate-400 mt-1">{n.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 管理者アイコン */}
            <button 
              ref={profileButtonRef}
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src={profileImage} 
                alt="Admin Icon" 
                className="w-12 h-12 rounded-full border border-white object-cover bg-white shadow-sm"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('public')) target.src = 'icon1.png';
                }}
              />
            </button>

            {/* 管理者テキスト */}
            <span 
              ref={profileTextRef}
              className="text-base font-bold tracking-wider cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
            >
              設定管理者
            </span>

            {/* ログアウト（ツールチップ付き） */}
            <div className="relative group flex items-center ml-2">
              <button 
                onClick={() => window.location.href = './login/index.html'} 
                className="p-2 hover:opacity-80 transition-opacity"
              >
                <LogOut size={28} className="text-white" />
              </button>
              {/* ツールチップ */}
              <div className="absolute top-full right-0 mt-3 whitespace-nowrap bg-black text-white text-xs font-bold px-3 py-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                ログアウトボタン
                <div className="absolute -top-1 right-3 w-2 h-2 bg-black rotate-45"></div>
              </div>
            </div>

            {/* プロフィールパネル (ヘッダー内部に絶対配置) */}
            {isProfileOpen && (
              <div ref={profilePanelRef} className="absolute top-full right-24 mt-4 bg-white shadow-2xl rounded-lg w-64 text-slate-900 z-50 border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center bg-slate-100 px-4 py-3 border-b border-slate-200">
                  <span className="font-bold text-sm text-slate-600">プロフィール</span>
                  <button 
                    onClick={() => setIsProfileOpen(false)} 
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={20}/>
                  </button>
                </div>
                
                <div className="relative p-6 flex flex-col items-center">
                  <button 
                    className="absolute top-3 right-3 p-2 bg-slate-50 rounded-full text-slate-400 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="プロフィール画像を変更"
                  >
                    <Pencil size={14} />
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />

                  <img 
                    src={profileImage} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full border border-white object-cover mb-4 shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('public')) target.src = 'icon1.png';
                    }}
                  />

                  <div className="text-center">
                    <h3 className="font-black text-xl text-slate-800">設定管理者</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 tracking-widest">
                      せっていかんりしゃ
                    </p>
                  </div>
                </div>

                {/* 文字サイズ設定 */}
                <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                    <Type size={13} /> 文字サイズ
                  </p>
                  <div className="flex gap-2">
                    {(['small', 'medium', 'large'] as FontSize[]).map(size => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        className={`flex-1 py-1.5 rounded-lg border font-bold transition-colors ${
                          fontSize === size
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                        style={{ fontSize: size === 'small' ? '11px' : size === 'medium' ? '13px' : '15px' }}
                      >
                        {FONT_SIZE_LABELS[size]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* パンくずリスト (Sticky: スクロールすると画面上部に固定される) */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-8 py-3 shadow-sm flex items-center text-xs md:text-sm font-bold text-slate-600">
          <span className="tracking-widest">OrderONE</span> 
          <span className="mx-3 text-slate-300 font-normal">&gt;</span> 
          <span className="text-indigo-600">({tabNames[activeTab] || 'デフォルト'})</span>
        </div>

        {/* メインコンテンツ */}
        <main className={`flex-1 min-h-0 ${activeTab === 'home' ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <div className={`mx-auto flex flex-col ${activeTab !== 'home' ? 'h-full min-h-0' : 'px-6 py-4'}`}>
            
{activeTab === 'home' && (
              <DashboardTab
                onSelectSatofuru={() => setActiveTab('satofuru_data')}
                onSelectShincho={() => setActiveTab('shincho_data')}
                onSelectMaster={(type) => {
                  setMasterType(type);
                  setActiveTab('masta');
                }}
                notifications={notifications}
              />
            )}

            {activeTab === 'satofuru_data' && <SatofuruDataView onNotify={addNotification} />}
            {activeTab === 'shincho_data' && <ShinchoDataView onNotify={addNotification} />}

            {/* 商品マスタ画面の表示ロジック */}
            {activeTab === 'masta' && (
              <div className="animate-in fade-in flex-1 flex flex-col overflow-hidden bg-white">
                <div className="p-3 border-b bg-slate-50 flex items-center">
                  <Button 
                    label="ダッシュボードへ戻る" 
                    icon="pi pi-arrow-left" 
                    className="p-button-text p-button-secondary text-sm" 
                    onClick={() => setActiveTab('home')} 
                  />
                </div>
                <div className="flex-1 overflow-auto">
                  <Masta type={masterType} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * サイドバーのタブボタンコンポーネント (ホバーツールチップ付き)
 */
function SidebarBtn({ id, icon, label, active, onClick, isOpen }: any) {
  const isActive = active === id
  return (
    <button 
      onClick={() => onClick(id)} 
      className={`
        relative flex items-center p-3 my-1 rounded-xl transition-all group
        ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
        ${isOpen ? 'justify-start px-4 w-full' : 'justify-center w-12 h-12 mx-auto'}
      `}
    >
      <div className="shrink-0">{icon}</div>
      
      {/* 開いている時は横にテキストを表示 */}
      {isOpen && (
        <span className="ml-4 font-bold text-base whitespace-nowrap animate-in fade-in">
          {label}
        </span>
      )}

      {/* 閉じている時はホバーでツールチップを表示 */}
      {!isOpen && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl flex items-center">
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
          {label}
        </div>
      )}
    </button>
  )
}