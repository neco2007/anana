'use client'
import React, { useState, useEffect } from 'react'
import { Pencil, Copy, Trash2, X, Save, Loader2 } from 'lucide-react'

const SATOFURU_HIDDEN_FIELDS = new Set([
  '発注商品名１ 連携項目',
  '寄附者住所(都道府県)',
  '寄附者住所２',
  '登録日時',
  '伝票表示名',
]);

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: any;
  tableId: string;
  onSaveSuccess: () => void;
}

export default function OrderDetailModal({ isOpen, onClose, rowData, tableId, onSaveSuccess }: OrderDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [satofuruMaster, setSatofuruMaster] = useState<any[]>([]);
  const [sinchoMaster, setSinchoMaster] = useState<any[]>([]);

  const isSatofuru = tableId === 'satofuru_data';
  const isSincho = tableId === 'shincho_data';

  // さとふるマスタをロード
  useEffect(() => {
    if (isSatofuru && window.eel) {
      window.eel.get_satohuru_master()((data: any[]) => {
        setSatofuruMaster(data ?? []);
      });
    }
  }, [isSatofuru]);

  // 新朝マスタをロード
  useEffect(() => {
    if (isSincho && window.eel) {
      window.eel.get_sincho_master()((data: any[]) => {
        setSinchoMaster(data ?? []);
      });
    }
  }, [isSincho]);

  // モーダルが開くたびにデータを初期化
  useEffect(() => {
    if (isOpen && rowData) {
      setEditData({ ...rowData });
      setIsEditing(false);
    }
  }, [isOpen, rowData]);

  if (!isOpen || !rowData) return null;

  const handleChange = (key: string, value: string) => {
    // さとふるでお礼品IDが変更されたとき、マスタから発注商品名・伝票表示名を自動更新
    if (isSatofuru && key === 'お礼品ID') {
      const masterEntry = satofuruMaster.find(
        (row) => String(row['お礼ID']).trim() === value.trim()
      );
      setEditData((prev: any) => ({
        ...prev,
        [key]: value,
        ...(masterEntry
          ? {
              '発注商品名': masterEntry['発注商品名'] ?? prev['発注商品名'],
              '伝票表示名': masterEntry['お礼品名'] ?? prev['伝票表示名'],
            }
          : {}),
      }));
    } else if (isSincho && key === '商品コード') {
      const masterEntry = sinchoMaster.find(
        (row) => String(row['商品コード']).trim() === value.trim()
      );
      setEditData((prev: any) => ({
        ...prev,
        [key]: value,
        ...(masterEntry
          ? { '発注商品名': masterEntry['発注商品名'] ?? prev['発注商品名'] }
          : {}),
      }));
    } else {
      setEditData((prev: any) => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = () => {
    setIsSubmitting(true);
    if (window.eel) {
      window.eel.update_order_record(tableId, rowData.id, editData)((res: any) => {
        setIsSubmitting(false);
        if (res.success) {
          setIsEditing(false);

          // コードが変わった場合、同じ返礼品名の全行に伝播してから画面更新
          let didPropagate = false;

          if (isSincho) {
            const newCode = String(editData['商品コード'] ?? '').trim();
            const oldCode = String(rowData['商品コード'] ?? '').trim();
            const matchValue = String(rowData['返礼品'] ?? '').trim();
            if (newCode !== oldCode && matchValue && window.eel) {
              didPropagate = true;
              window.eel.propagate_code_update(tableId, '返礼品', matchValue, '商品コード', newCode)(() => {
                onSaveSuccess();
              });
            }
          } else if (isSatofuru) {
            const newCode = String(editData['お礼品ID'] ?? '').trim();
            const oldCode = String(rowData['お礼品ID'] ?? '').trim();
            const matchValue = String(rowData['お礼品名'] ?? '').trim();
            if (newCode !== oldCode && matchValue && window.eel) {
              didPropagate = true;
              window.eel.propagate_code_update(tableId, 'お礼品名', matchValue, 'お礼品ID', newCode)(() => {
                onSaveSuccess();
              });
            }
          }

          if (!didPropagate) onSaveSuccess();
        } else {
          alert("更新エラー: " + res.error);
        }
      });
    }
  };

  const shouldHide = (key: string): boolean => {
    if (key === 'id' || key.startsWith('_')) return true;
    if (isSatofuru && SATOFURU_HIDDEN_FIELDS.has(key)) return true;
    return false;
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4 md:p-8">
      <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-2xl rounded-sm overflow-hidden">

        {/* ツールバー */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 text-slate-700 text-[13px] hover:bg-slate-50 transition-colors rounded-sm"
          >
            戻る
          </button>

          <div className="flex items-center space-x-4 text-slate-500">
            {isEditing ? (
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center px-4 py-1.5 bg-blue-600 text-white text-[13px] font-bold rounded-sm hover:bg-blue-700 transition-colors"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <Save size={16} className="mr-1.5" />}
                保存する
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="編集">
                <Pencil size={20} />
              </button>
            )}
            <button className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors" title="複製">
              <Copy size={20} />
            </button>
            <button className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="削除">
              <Trash2 size={20} />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
            <button onClick={onClose} className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6">
            {Object.entries(editData).map(([key, value]) => {
              if (shouldHide(key)) return null;

              const colSpanClass = (key.includes('商品名') || key.includes('お礼品名') || key.includes('住所') || key.includes('備考'))
                ? 'md:col-span-2 lg:col-span-2'
                : 'col-span-1';

              return (
                <div key={key} className={`flex flex-col ${colSpanClass}`}>
                  <div className="bg-[#e2e8f0] px-3 py-1.5 text-[12px] font-bold text-slate-700 border-l-[3px] border-blue-400">
                    {key}
                  </div>
                  <div className="bg-[#f8f9fa] border-t-0 border border-transparent min-h-[40px] flex">
                    {isEditing ? (
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full h-full px-3 py-2 bg-white border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px] text-slate-800 transition-all shadow-sm"
                      />
                    ) : (
                      <div className="w-full h-full px-3 py-2 text-[13px] text-slate-800 flex items-center break-all">
                        {value ? String(value) : <span className="text-slate-300 italic">空欄</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
