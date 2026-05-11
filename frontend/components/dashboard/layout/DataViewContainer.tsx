'use client'
import React from 'react'

interface DataViewContainerProps {
  children: React.ReactNode
}

/**
 * データ一覧画面専用のレイアウトコンテナ
 * 画面の残りスペースを100%使い切り、内部のスクロールを制御します。
 */
export default function DataViewContainer({ children }: DataViewContainerProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-white overflow-hidden animate-in fade-in duration-300">
      {children}
    </div>
  )
}