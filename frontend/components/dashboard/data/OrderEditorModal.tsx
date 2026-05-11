'use client'
import React, { useState, useEffect } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import { FieldConfig } from '../../../constants/orderFieldConfigs'

interface OrderEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FieldConfig[];
  tableId: string;
  onSuccess?: () => void;
}

export default function OrderEditorModal({ isOpen, onClose, title, fields, tableId, onSuccess }: OrderEditorModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [satofuruMaster, setSatofuruMaster] = useState<any[]>([]);

  const isSatofuru = tableId === 'satofuru_data';

  // さとふるマスタをロード
  useEffect(() => {
    if (isSatofuru && window.eel) {
      window.eel.get_satohuru_master()((data: any[]) => {
        setSatofuruMaster(data ?? []);
      });
    }
  }, [isSatofuru]);

  if (!isOpen) return null;

  const handleChange = (field: FieldConfig, value: string) => {
    if (field.readonly) return;

    // お礼品IDが変更されたときにマスタから発注商品名・伝票表示名を自動入力
    if (isSatofuru && field.id === 'gift_id') {
      const masterEntry = satofuruMaster.find(
        (row) => String(row['お礼ID']).trim() === value.trim()
      );
      setFormData((prev) => ({
        ...prev,
        gift_id: value,
        ...(masterEntry
          ? {
              product_name: masterEntry['発注商品名'] ?? '',
              slip_name: masterEntry['お礼品名'] ?? '',
            }
          : { product_name: '', slip_name: '' }),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field.id]: value }));
    }
  };

  const handleRegister = () => {
    if (!tableId) {
      alert("保存先のテーブルが指定されていません。");
      return;
    }
    setIsSubmitting(true);

    const submissionData: Record<string, string> = {};
    fields.forEach(field => {
      submissionData[field.label] = formData[field.id] ?? field.defaultValue ?? '';
    });

    if (window.eel) {
      window.eel.add_new_order(tableId, submissionData)((res: any) => {
        setIsSubmitting(false);
        if (res.success) {
          alert("新規データを登録しました。");
          onSuccess?.();
          onClose();
        } else {
          alert("登録エラー: " + res.error);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-[95%] max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">

        {/* ヘッダー */}
        <div className="bg-[#0079bf] text-white px-4 py-2 flex justify-between items-center shrink-0">
          <span className="text-sm font-bold">{title}</span>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        {/* 戻るエリア */}
        <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center">
          <button onClick={onClose} className="px-4 py-1 border border-slate-300 bg-white text-[12px] hover:bg-slate-100 rounded" disabled={isSubmitting}>戻る</button>
        </div>

        {/* フォーム */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6">
            {fields.map((field) => (
              <div key={field.id} className={`space-y-1.5 ${field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}>
                <div className="bg-[#e2e8f0] px-2 py-1 border-l-2 border-blue-400">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    {field.label}
                    {field.readonly && (
                      <span className="ml-1 text-[10px] text-slate-400 font-normal">（自動入力）</span>
                    )}
                  </label>
                </div>
                <div className="relative">
                  {field.type === 'select' ? (
                    <div className="relative">
                      <select
                        className="w-full border border-slate-300 p-2 text-[13px] outline-none appearance-none bg-white focus:border-blue-400"
                        value={formData[field.id] ?? field.defaultValue ?? ''}
                        onChange={(e) => handleChange(field, e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">選択してください</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type={field.type === 'datetime' ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'}
                      className={`w-full border p-2 text-[13px] outline-none transition-colors ${
                        field.readonly
                          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                          : 'border-slate-300 bg-white focus:border-blue-400'
                      }`}
                      placeholder={field.readonly ? 'お礼品ID入力で自動設定' : field.placeholder}
                      value={formData[field.id] ?? ''}
                      onChange={(e) => handleChange(field, e.target.value)}
                      readOnly={field.readonly}
                      disabled={isSubmitting}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
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
  );
}
