'use client'
import React, { useState, useEffect } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { FieldConfig } from '../../../constants/orderFieldConfigs'
import SearchableSelect from './SearchableSelect'

interface OrderEditorModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  fields: FieldConfig[]
  tableId: string
  onSuccess?: () => void
}

export default function OrderEditorModal({ isOpen, onClose, title, fields, tableId, onSuccess }: OrderEditorModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [satofuruMaster, setSatofuruMaster] = useState<any[]>([])
  const [sinchoMaster, setSinchoMaster] = useState<any[]>([])

  const isSatofuru = tableId === 'satofuru_data'
  const isSincho = tableId === 'shincho_data'

  useEffect(() => {
    if (isSatofuru && window.eel) {
      window.eel.get_satohuru_master()((data: any[]) => setSatofuruMaster(data ?? []))
    }
    if (isSincho && window.eel) {
      window.eel.get_sincho_master()((data: any[]) => setSinchoMaster(data ?? []))
    }
  }, [isSatofuru, isSincho])

  if (!isOpen) return null

  // さとふる: 発注商品名選択 → お礼品ID・お礼品名を自動入力
  // 新朝: 発注商品名選択 → 商品コードを自動入力
  const handleChange = (field: FieldConfig, value: string) => {
    if (isSatofuru && field.id === 'gift_id') {
      const entry = satofuruMaster.find(
        r => (String(r['お礼ID'] || r['商品コード'] || '')).trim() === value.trim()
      )
      setFormData(prev => ({
        ...prev,
        gift_id: value,
        ...(entry
          ? { product_name: entry['発注商品名'] ?? '', slip_name: entry['お礼品名'] ?? '', slip_display_name: entry['お礼品名'] ?? '' }
          : { product_name: '', slip_name: '', slip_display_name: '' }),
      }))
    } else if (isSatofuru && field.id === 'product_name') {
      const entry = satofuruMaster.find(r => (r['発注商品名'] || '').trim() === value.trim())
      setFormData(prev => ({
        ...prev,
        product_name: value,
        slip_display_name: '', // 発注商品名が変わったら伝票表示名をリセット
        ...(entry ? {
          gift_id: String(entry['商品コード'] || entry['お礼ID'] || ''),
          slip_name: entry['お礼品名'] ?? '',
          original_gift_name: entry['お礼品名'] ?? '',
        } : {}),
      }))
    } else if (isSatofuru && field.id === 'slip_display_name') {
      // 伝票表示名選択 → マスタからお礼品IDを自動更新
      const entry = satofuruMaster.find(r => (r['お礼品名'] || '').trim() === value.trim())
      setFormData(prev => ({
        ...prev,
        slip_display_name: value,
        ...(entry ? {
          gift_id: String(entry['商品コード'] || entry['お礼ID'] || ''),
        } : {}),
      }))
    } else if (isSincho && field.id === 'item_code') {
      const entry = sinchoMaster.find(r => (r['商品コード'] || '').trim() === value.trim())
      setFormData(prev => ({
        ...prev,
        item_code: value,
        ...(entry ? { order_product_name: entry['発注商品名'] ?? '' } : {}),
      }))
    } else if (isSincho && (field.id === 'product_select' || field.id === 'order_product_name')) {
      const entry = sinchoMaster.find(r => (r['発注商品名'] || '').trim() === value.trim())
      setFormData(prev => ({
        ...prev,
        [field.id]: value,
        ...(entry ? { item_code: entry['商品コード'] ?? '' } : {}),
      }))
    } else {
      if (field.readonly) return
      setFormData(prev => ({ ...prev, [field.id]: value }))
    }
  }

  const handleRegister = () => {
    if (!tableId) { alert('保存先のテーブルが指定されていません。'); return }
    setIsSubmitting(true)
    const submissionData: Record<string, string> = {}
    fields.forEach(field => {
      submissionData[field.label] = formData[field.id] ?? field.defaultValue ?? ''
    })
    if (window.eel) {
      window.eel.add_new_order(tableId, submissionData)((res: any) => {
        setIsSubmitting(false)
        if (res.success) {
          alert('新規データを登録しました。')
          onSuccess?.()
          onClose()
        } else {
          alert('登録エラー: ' + res.error)
        }
      })
    }
  }

  // 発注商品名のオプションリスト（重複除去）
  const satofuruProductOptions = Array.from(new Set(
    satofuruMaster.map(r => (r['発注商品名'] || '').trim()).filter(Boolean)
  ))
  const sinchoProductOptions = Array.from(new Set(
    sinchoMaster.map(r => (r['発注商品名'] || '').trim()).filter(Boolean)
  ))
  // 商品コード / お礼品IDのオプションリスト（重複除去）
  const satofuruCodeOptions = Array.from(new Set(
    satofuruMaster.map(r => (r['商品コード'] || '').trim()).filter(Boolean)
  ))
  const sinchoCodeOptions = Array.from(new Set(
    sinchoMaster.map(r => (r['商品コード'] || '').trim()).filter(Boolean)
  ))

  // さとふる: 発注商品名 → 対応する伝票表示名（お礼品名）のリスト
  const satofuruProductToSlipNames: Map<string, string[]> = new Map()
  for (const row of satofuruMaster) {
    const pn = (row['発注商品名'] || '').trim()
    const sn = (row['お礼品名'] || '').trim()
    if (pn && sn) {
      if (!satofuruProductToSlipNames.has(pn)) satofuruProductToSlipNames.set(pn, [])
      const arr = satofuruProductToSlipNames.get(pn)!
      if (!arr.includes(sn)) arr.push(sn)
    }
  }
  const satofuruSlipNameOptions = Array.from(new Set(
    satofuruMaster.map(r => (r['お礼品名'] || '').trim()).filter(Boolean)
  ))

  const renderField = (field: FieldConfig) => {
    const val = formData[field.id] ?? field.defaultValue ?? ''

    // さとふる: お礼品ID → 商品コードのSearchableSelect（選択で発注商品名・伝票表示名を自動入力）
    if (isSatofuru && field.id === 'gift_id') {
      return (
        <SearchableSelect
          options={satofuruCodeOptions}
          value={val}
          onChange={v => handleChange(field, v)}
          disabled={isSubmitting}
        />
      )
    }

    // 新朝: 商品コード → SearchableSelect（選択で発注商品名を自動入力）
    if (isSincho && field.id === 'item_code') {
      return (
        <SearchableSelect
          options={sinchoCodeOptions}
          value={val}
          onChange={v => handleChange(field, v)}
          disabled={isSubmitting}
        />
      )
    }

    // さとふる: 発注商品名 → 検索付きプルダウン（選択でお礼品ID等を自動入力）
    if (isSatofuru && field.id === 'product_name') {
      return (
        <SearchableSelect
          options={satofuruProductOptions}
          value={val}
          onChange={v => handleChange(field, v)}
          disabled={isSubmitting}
        />
      )
    }

    // さとふる: 伝票表示名 → 発注商品名でフィルタした検索付きプルダウン
    if (isSatofuru && field.id === 'slip_display_name') {
      const currentPn = (formData['product_name'] || '').trim()
      const slipOptions = currentPn
        ? (satofuruProductToSlipNames.get(currentPn) ?? satofuruSlipNameOptions)
        : satofuruSlipNameOptions
      return (
        <SearchableSelect
          options={slipOptions}
          value={val}
          onChange={v => handleChange(field, v)}
          disabled={isSubmitting}
        />
      )
    }

    // 新朝: 発注商品名（単一選択・通常）→ 検索付きプルダウン
    if (isSincho && (field.id === 'product_select' || field.id === 'order_product_name')) {
      return (
        <SearchableSelect
          options={sinchoProductOptions}
          value={val}
          onChange={v => handleChange(field, v)}
          disabled={isSubmitting}
        />
      )
    }

    if (field.type === 'select') {
      return (
        <div className="relative">
          <select
            className="w-full border border-slate-300 p-2 text-[13px] outline-none appearance-none bg-white focus:border-blue-400"
            value={val}
            onChange={e => handleChange(field, e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">選択してください</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      )
    }

    return (
      <input
        type={field.type === 'datetime' ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'}
        className={`w-full border p-2 text-[13px] outline-none transition-colors ${
          field.readonly
            ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
            : 'border-slate-300 bg-white focus:border-blue-400'
        }`}
        placeholder={field.readonly ? '自動入力' : field.placeholder}
        value={formData[field.id] ?? ''}
        onChange={e => handleChange(field, e.target.value)}
        readOnly={field.readonly}
        disabled={isSubmitting}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[95%] max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">

        <div className="bg-[#0079bf] text-white px-4 py-2 flex justify-between items-center shrink-0">
          <span className="text-sm font-bold">{title}</span>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center">
          <button onClick={onClose} className="px-4 py-1 border border-slate-300 bg-white text-[12px] hover:bg-slate-100 rounded" disabled={isSubmitting}>戻る</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6">
            {fields.map(field => (
              <div key={field.id} className={`space-y-1.5 ${field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}>
                <div className="bg-[#e2e8f0] px-2 py-1 border-l-2 border-blue-400">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    {field.label}
                    {field.readonly && isSatofuru && field.id !== 'product_name' && (
                      <span className="ml-1 text-[10px] text-slate-400 font-normal">（自動入力）</span>
                    )}
                  </label>
                </div>
                <div className="relative">
                  {renderField(field)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center space-x-3 bg-slate-50">
          <button onClick={onClose} className="px-6 py-2 border border-slate-300 bg-white text-[13px] hover:bg-slate-100" disabled={isSubmitting}>
            キャンセル
          </button>
          <button
            onClick={handleRegister}
            disabled={isSubmitting}
            className="px-10 py-2 bg-[#2d8c3c] text-white font-bold text-[13px] hover:brightness-90 transition-all flex items-center"
          >
            {isSubmitting && <Loader2 size={14} className="mr-2 animate-spin" />}
            登録
          </button>
        </div>
      </div>
    </div>
  )
}
