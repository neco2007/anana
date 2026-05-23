'use client'
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search } from 'lucide-react'

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** テーブル内など overflow:hidden な親の中で使う場合は true にするとポータルで描画 */
  usePortal?: boolean
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '選択してください',
  disabled,
  className,
  usePortal = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const portalId = useRef(`ss-${Math.random().toString(36).slice(2)}`)

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const inWrapper = wrapperRef.current?.contains(target)
      const portalEl = document.getElementById(portalId.current)
      const inPortal = portalEl?.contains(target)
      if (!inWrapper && !inPortal) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (disabled) return
    if (!open && usePortal && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const dropdownMaxHeight = 220
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow < dropdownMaxHeight
        ? rect.top - dropdownMaxHeight
        : rect.bottom
      setDropPos({ top, left: rect.left, width: rect.width })
    }
    setOpen(o => !o)
  }

  const handleSelect = (opt: string) => {
    onChange(opt)
    setOpen(false)
    setQuery('')
  }

  const dropdown = (
    <div
      id={portalId.current}
      className="bg-white border border-slate-300 shadow-lg max-h-[220px] flex flex-col"
      style={
        usePortal
          ? { position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }
          : { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }
      }
    >
      {/* 検索入力 */}
      <div className="flex items-center px-2 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
        <Search size={12} className="text-slate-400 mr-1.5 shrink-0" />
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="検索..."
          className="flex-1 text-[12px] outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
        />
      </div>
      {/* 選択肢リスト */}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <div className="p-3 text-[12px] text-slate-400 text-center">該当なし</div>
        ) : (
          filtered.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={() => handleSelect(opt)}
              className={`w-full text-left px-3 py-1.5 text-[12px] transition-colors
                ${opt === value
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
            >
              {opt}
            </button>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between border p-2 text-[13px] bg-white outline-none text-left transition-colors
          ${disabled ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 hover:border-blue-400 focus:border-blue-400 cursor-pointer'}`}
      >
        <span className={`truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
      </button>
      {open && (
        usePortal && typeof document !== 'undefined'
          ? createPortal(dropdown, document.body)
          : dropdown
      )}
    </div>
  )
}
