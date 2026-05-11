"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    eel: any;
  }
}

export default function App() {
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eelReady, setEelReady] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigateToDashboard = () => {
    window.location.href = '/'; 
  };

  useEffect(() => {
    const connectToEel = () => {
      if (
        window.eel &&
        typeof window.eel.check_init_status === 'function' &&
        typeof window.eel.signup === 'function' &&
        typeof window.eel.login === 'function'
      ) {
        window.eel.check_init_status()((res: any) => {
          setIsFirstUser(res.is_first_user);
          setEelReady(true);
          setLoading(false);
        });
      } else {
        setTimeout(connectToEel, 500);
      }
    };
    connectToEel();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eelReady) return;

    if (isFirstUser) {
      window.eel.signup(username, password)((res: any) => {
        if (res.success) {
          alert("登録完了！ログインしてください。");
          window.location.reload();
        } else {
          setError(res.error);
        }
      });
    } else {
      window.eel.login(username, password)((res: any) => {
        if (res.success) {
          navigateToDashboard();
        } else {
          setError("ログインIDまたはパスワードが正しくありません。");
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="animate-spin text-zinc-800" size={48} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-sans antialiased">
      <div className="w-full max-w-sm p-6">
        {/* パネル：角は尖った四角、枠線なし、影あり */}
        <div className="bg-white rounded-none shadow-2xl p-10">
          
          {/* ロゴエリア：frontend/public/ログインアイコン.png を参照 */}
          <div className="flex justify-center mb-6">
            <img 
              src="/ログインアイコン.png" 
              alt="Logo" 
              className="w-78 h-auto object-contain"
                onError={(e) => {
                // publicフォルダにない場合、相対パスも試行
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('public')) {
                  target.src = 'ログインアイコン.png';
                }
              }}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              {/* ユーザーID：ラベルは黒文字、入力欄は青背景・黒縁 */}
              <div className="space-y-2">
                <label className="block text-black font-bold text-sm tracking-tighter">
                  ユーザーID：
                </label>
                <input
                  type="text"
                  required
                  name="username"
                  autoComplete="username"
                  className="block w-full rounded-none border-2 border-black py-3 px-4 text-white focus:outline-none transition-all text-sm font-bold"
                  style={{ backgroundColor: '#e8f0fe', WebkitBoxShadow: '0 0 0 100px #e8f0fe inset', WebkitTextFillColor: 'black' }}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              {/* パスワード：ラベルは黒文字、入力欄は青背景・黒縁 */}
              <div className="space-y-2">
                <label className="block text-black font-bold text-sm tracking-tighter">
                  パスワード：
                </label>
                <input
                  type="password"
                  required
                  name="password"
                  autoComplete={isFirstUser ? "new-password" : "current-password"}
                  className="block w-full rounded-none border-2 border-black py-3 px-2 text-white focus:outline-none transition-all text-sm font-bold"
                  style={{ backgroundColor: '#e8f0fe', WebkitBoxShadow: '0 0 0 100px #e8f0fe inset', WebkitTextFillColor: 'black' }}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-[11px] text-red-600 font-bold text-center">
                {error}
              </div>
            )}

            {/* ログインボタン：青背景、白文字、日本語、角は尖った四角 */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!eelReady}
                className="w-full rounded-none border-2 border-none px-6 py-4 font-black text-white hover:opacity-90 active:scale-[0.98] transition-all disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-base"
                style={{ backgroundColor: '#2563eb' }}
              >
                {isFirstUser ? "新規登録" : "ログイン"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}