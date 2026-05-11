'use client'
import React, { useState, useEffect } from 'react';
import { Filter, ArrowUpDown, Edit3, FileText, ArrowLeft, Tag, Check, RefreshCcw, Plus, Trash2 } from 'lucide-react';

// eelの型定義
declare global {
    interface Window {
        eel: any;
    }
}

interface MastaProps {
    type: 'satofuru' | 'sincho';
}

export const Masta: React.FC<MastaProps> = ({ type }) => {
    const [products, setProducts] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'new' | 'edit' | 'detail'>('list');
    const [loading, setLoading] = useState(true);
    
    // 選択された項目の「インデックス(行番号)」を管理する配列（ID依存を排除して確実に単一選択させる）
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
    
    // 編集・詳細の対象となるデータとそのインデックス
    const [targetProduct, setTargetProduct] = useState<any>(null);
    const [editIndex, setEditIndex] = useState<number | null>(null);

    const title = type === 'satofuru' ? 'さとふる商品マスタ' : '新朝プレス商品マスタ';

    useEffect(() => {
        loadData();
    }, [type]);

    const loadData = () => {
        setLoading(true);
        setSelectedIndexes([]); // 再読込時は選択状態をリセット
        const method = type === 'satofuru' ? window.eel?.get_satohuru_master : window.eel?.get_sincho_master;
        if (method) {
            method()((res: any[]) => {
                setProducts(res || []);
                setLoading(false);
            });
        } else {
            // デモ用ダミーデータ
            setProducts([
                { 商品コード: '1499439', お礼品名: '(直貼)サイダーW', 発注商品名: '●485ml 三ツ矢サイダー', 定期便: '無', 登録日時: '2025/03/04 (火) 06:37', ギフト商品: false },
                { 商品コード: '1512946', お礼品名: '(直貼)スタバラ シャルドネ', 発注商品名: 'スタバラ_シャルドネ (ノ', 定期便: '無', 登録日時: '2025/03/04 (火) 06:37', ギフト商品: false },
                { 商品コード: '1504919', お礼品名: '(直貼)ドライ350ml×24本', 発注商品名: 'スーパードライ 350ml', 定期便: '無', 登録日時: '2025/03/04 (火) 06:38', ギフト商品: false },
                { 商品コード: '1506304', お礼品名: '(直貼)クリスタル 350ml', 発注商品名: 'クリスタル_ドライ 350', 定期便: '有', 登録日時: '2025/03/04 (火) 06:38', ギフト商品: true },
            ]);
            setLoading(false);
        }
    };

    // --- チェックボックスの操作 (インデックスベース) ---
    const toggleSelection = (idx: number) => {
        setSelectedIndexes(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    };

    const toggleAll = () => {
        if (selectedIndexes.length === products.length) {
            setSelectedIndexes([]);
        } else {
            setSelectedIndexes(products.map((_, idx) => idx));
        }
    };

    // --- 各種アクション ---
    const handleCreateNew = () => {
        setTargetProduct({
            商品コード: '',
            お礼品名: '',
            発注商品名: '',
            定期便: '無',
            ギフト商品: false,
            登録日時: new Date().toLocaleString('ja-JP', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', weekday: 'short'
            })
        });
        setEditIndex(null);
        setViewMode('new');
    };

    const handleEdit = (product: any, idx: number) => {
        setTargetProduct({ ...product }); // コピーを作成してセット
        setEditIndex(idx);
        setViewMode('edit');
    };

    const handleDetail = (product: any) => {
        setTargetProduct(product);
        setViewMode('detail');
    };

    // --- 削除処理 (インデックスベース) ---
    const handleDelete = () => {
        if (selectedIndexes.length === 0) return;
        if (!confirm(`選択した ${selectedIndexes.length} 件のデータを削除しますか？\nこの操作は取り消せません。`)) return;

        // 選択されていないインデックスの要素だけを残す
        const remaining = products.filter((_, idx) => !selectedIndexes.includes(idx));
        const method = type === 'satofuru' ? window.eel?.save_satohuru_master : window.eel?.save_sincho_master;
        
        if (method) {
            method(remaining)((res: any) => {
                if (res.success) {
                    setProducts(remaining);
                    setSelectedIndexes([]);
                } else {
                    alert('削除に失敗しました: ' + res.error);
                }
            });
        } else {
            setProducts(remaining);
            setSelectedIndexes([]);
        }
    };

    // --- 保存処理 (新規・編集) ---
    const handleSave = () => {
        if (!targetProduct.商品コード || !targetProduct.お礼品名 || !targetProduct.発注商品名) {
            alert('必須項目（*）をすべて入力してください');
            return;
        }

        let updatedList;
        if (viewMode === 'new') {
            updatedList = [targetProduct, ...products];
        } else if (viewMode === 'edit' && editIndex !== null) {
            // 編集時は元のインデックスのデータを置換
            updatedList = [...products];
            updatedList[editIndex] = targetProduct;
        } else {
            return;
        }

        const method = type === 'satofuru' ? window.eel?.save_satohuru_master : window.eel?.save_sincho_master;
        
        if (method) {
            method(updatedList)((res: any) => {
                if (res.success) {
                    setProducts(updatedList);
                    setViewMode('list');
                } else {
                    alert('保存に失敗しました: ' + res.error);
                }
            });
        } else {
            setProducts(updatedList);
            setViewMode('list');
        }
    };

    // ==========================================
    // ビューのレンダリング
    // ==========================================

    // --- 一覧ビュー ---
    if (viewMode === 'list') {
        const isAllSelected = products.length > 0 && selectedIndexes.length === products.length;

        return (
            <div className="flex flex-col h-full bg-white animate-in fade-in duration-300">
                {/* ヘッダーツールバー */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-xl font-medium text-slate-800">{title}</h2>
                        {selectedIndexes.length > 0 && (
                            <div className="flex items-center animate-in zoom-in-95 duration-200">
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full mr-3">
                                    {selectedIndexes.length}件 選択中
                                </span>
                                <button 
                                    onClick={handleDelete} 
                                    className="flex items-center px-3 py-1.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors"
                                >
                                    <Trash2 size={16} className="mr-1.5" /> 選択項目を削除
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex space-x-3 text-[13px]">
                        <button 
                            onClick={handleCreateNew} 
                            className="flex items-center px-4 py-2 text-slate-600 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded transition-all"
                        >
                            <Plus size={16} className="mr-1.5 text-slate-400" /> 新規追加
                        </button>
                        <button 
                            onClick={loadData} 
                            className="flex items-center px-4 py-2 text-slate-600 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded transition-all"
                        >
                            <RefreshCcw size={16} className="mr-1.5 text-slate-400" /> 再読込
                        </button>
                    </div>
                </div>

                {/* テーブルエリア */}
                <div className="flex-1 overflow-auto bg-white">
                    <table className="w-full text-left border-collapse text-[13px] text-slate-700 whitespace-nowrap min-w-max">
                        <thead className="sticky top-0 bg-white border-b-2 border-slate-100 z-10">
                            <tr>
                                <th className="py-3 px-4 w-12 text-center font-normal">
                                    <input 
                                        type="checkbox" 
                                        checked={isAllSelected}
                                        onChange={toggleAll}
                                        className="w-4 h-4 cursor-pointer accent-blue-600 border-slate-300" 
                                    />
                                </th>
                                <th className="py-3 px-2 w-20 font-normal text-center text-slate-400 text-xs">操作</th>
                                <th className="py-3 px-4 font-normal min-w-[120px]">
                                    <div className="flex items-center space-x-2 text-slate-700">
                                        <Filter size={14} className="text-slate-400" />
                                        <span>商品コード</span>
                                        <ArrowUpDown size={14} className="text-slate-400 ml-auto" />
                                    </div>
                                </th>
                                <th className="py-3 px-4 font-normal min-w-[250px]">
                                    <div className="flex items-center space-x-2 text-slate-700">
                                        <Filter size={14} className="text-slate-400" />
                                        <span>お礼品名</span>
                                        <ArrowUpDown size={14} className="text-slate-400 ml-auto" />
                                    </div>
                                </th>
                                <th className="py-3 px-4 font-normal min-w-[300px]">
                                    <div className="flex items-center space-x-2 text-slate-700">
                                        <Filter size={14} className="text-slate-400" />
                                        <span>発注商品名</span>
                                        <ArrowUpDown size={14} className="text-slate-400 ml-auto" />
                                    </div>
                                </th>
                                <th className="py-3 px-4 font-normal w-32">
                                    <div className="flex items-center space-x-2 text-slate-700">
                                        <Filter size={14} className="text-slate-400" />
                                        <span>定期便</span>
                                        <ArrowUpDown size={14} className="text-slate-400 ml-auto" />
                                    </div>
                                </th>
                                <th className="py-3 px-4 font-normal w-48">
                                    <div className="flex items-center space-x-2 text-slate-700">
                                        <span>登録日時</span>
                                        <ArrowUpDown size={14} className="text-slate-400 ml-auto" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 text-slate-400 italic">
                                        データがありません
                                    </td>
                                </tr>
                            ) : products.map((product, idx) => {
                                const isSelected = selectedIndexes.includes(idx);
                                return (
                                    <tr 
                                        key={idx} 
                                        className={`border-b border-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : 'odd:bg-white even:bg-[#f9fafb] hover:bg-slate-50'}`}
                                    >
                                        <td className="py-2.5 px-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={() => toggleSelection(idx)}
                                                className="w-4 h-4 cursor-pointer accent-blue-600 border-slate-300" 
                                            />
                                        </td>
                                        <td className="py-2.5 px-2">
                                            <div className="flex justify-center gap-4 text-slate-400">
                                                <button 
                                                    type="button" 
                                                    title="編集" 
                                                    onClick={() => handleEdit(product, idx)} 
                                                    className="hover:text-emerald-600 transition-colors"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button 
                                                    type="button" 
                                                    title="詳細" 
                                                    onClick={() => handleDetail(product)} 
                                                    className="hover:text-blue-600 transition-colors"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-slate-700 font-medium">{product.商品コード}</td>
                                        <td className="py-2.5 px-4 text-slate-700">{product.お礼品名}</td>
                                        <td className="py-2.5 px-4 text-slate-700">{product.発注商品名}</td>
                                        <td className="py-2.5 px-4 text-slate-700 text-center">{product.定期便}</td>
                                        <td className="py-2.5 px-4 text-slate-500 text-xs">{product.登録日時}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // --- 詳細ビュー (リードオンリー) ---
    if (viewMode === 'detail' && targetProduct) {
        return (
            <div className="p-6 bg-[#f8f9fa] min-h-screen animate-in fade-in">
                <div className="mb-6 flex items-center max-w-3xl mx-auto">
                    <button onClick={() => setViewMode('list')} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mr-6">
                        <ArrowLeft size={18} className="mr-2" /> 戻る
                    </button>
                    <h2 className="text-xl font-bold text-slate-700">商品マスタ 詳細情報</h2>
                </div>

                <div className="bg-white p-8 rounded shadow-sm border border-slate-200 max-w-3xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12 text-[14px]">
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-xs font-bold text-slate-400 mb-1 tracking-widest uppercase">商品コード</p>
                            <p className="text-lg font-bold text-slate-800">{targetProduct.商品コード}</p>
                        </div>
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-xs font-bold text-slate-400 mb-1 tracking-widest uppercase">自動生成日時</p>
                            <p className="text-slate-700 font-mono">{targetProduct.登録日時}</p>
                        </div>
                        <div className="col-span-1 md:col-span-2 border-b border-slate-100 pb-4">
                            <p className="text-xs font-bold text-slate-400 mb-1 tracking-widest uppercase">お礼品名 (変換前)</p>
                            <p className="text-slate-800 break-all">{targetProduct.お礼品名}</p>
                        </div>
                        <div className="col-span-1 md:col-span-2 border-b border-slate-100 pb-4">
                            <p className="text-xs font-bold text-slate-400 mb-1 tracking-widest uppercase">発注商品名 (正規名)</p>
                            <div className="flex items-center space-x-2 text-slate-800">
                                <Tag size={16} className="text-blue-500" />
                                <span className="font-medium break-all">{targetProduct.発注商品名}</span>
                            </div>
                        </div>
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-xs font-bold text-slate-400 mb-1 tracking-widest uppercase">定期便フラグ</p>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${targetProduct.定期便 === '有' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {targetProduct.定期便}
                            </span>
                        </div>
                        <div className="border-b border-slate-100 pb-4">
                            <p className="text-xs font-bold text-slate-400 mb-1 tracking-widest uppercase">ギフト設定</p>
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${targetProduct.ギフト商品 ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
                                {targetProduct.ギフト商品 ? 'ギフト対象' : '通常商品'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={() => setViewMode('list')} className="px-6 py-2 text-[13px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded transition-colors">
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- 新規登録 & 編集ビュー (フォーム) ---
    if ((viewMode === 'new' || viewMode === 'edit') && targetProduct) {
        return (
            <div className="p-6 bg-[#f8f9fa] min-h-screen animate-in fade-in">
                <div className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
                    <button onClick={() => setViewMode('list')} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={18} className="mr-2" /> キャンセルして戻る
                    </button>
                    <h2 className="text-xl font-bold text-slate-700">
                        {viewMode === 'new' ? '商品マスタ 新規登録' : '商品マスタ データ編集'}
                    </h2>
                </div>

                <div className="bg-white p-10 rounded shadow-sm border border-slate-200 max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[13px]">
                        {/* 左カラム */}
                        <div className="space-y-6">
                            <div>
                                <label className="block font-bold text-slate-600 mb-2">商品コード <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={targetProduct.商品コード}
                                    onChange={(e) => setTargetProduct({...targetProduct, 商品コード: e.target.value})}
                                    className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 bg-white"
                                    placeholder="例: 49378-40007949"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-600 mb-2">お礼品名 (変換前) <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={targetProduct.お礼品名} 
                                    onChange={(e) => setTargetProduct({...targetProduct, お礼品名: e.target.value})} 
                                    className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 bg-white" 
                                    placeholder="(直貼)スタバラ シャルドネ 等" 
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-slate-600 mb-2">発注商品名 (正規名) <span className="text-red-500">*</span></label>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 border border-r-0 border-slate-300 bg-slate-50 text-slate-500 rounded-l">
                                        <Tag size={14} />
                                    </span>
                                    <input 
                                        type="text" 
                                        value={targetProduct.発注商品名} 
                                        onChange={(e) => setTargetProduct({...targetProduct, 発注商品名: e.target.value})} 
                                        className="flex-1 border border-slate-300 rounded-r px-3 py-2 outline-none focus:border-blue-500 bg-white" 
                                        placeholder="スタバラ_シャルドネ(ノ 等" 
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* 右カラム */}
                        <div className="space-y-6">
                            <div>
                                <label className="block font-bold text-slate-600 mb-2">定期便フラグ</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="teiki" 
                                            value="有" 
                                            checked={targetProduct.定期便 === '有'} 
                                            onChange={(e) => setTargetProduct({...targetProduct, 定期便: e.target.value})}
                                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-slate-700">有</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="teiki" 
                                            value="無" 
                                            checked={targetProduct.定期便 === '無'} 
                                            onChange={(e) => setTargetProduct({...targetProduct, 定期便: e.target.value})}
                                            className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-slate-700">無</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-2">ギフト設定</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={targetProduct.ギフト商品} 
                                        onChange={(e) => setTargetProduct({...targetProduct, ギフト商品: e.target.checked})}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    <span className="ml-3 text-slate-700 text-xs">ギフト対象にする</span>
                                </label>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-600 mb-2">最終更新日時</label>
                                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-500 font-mono">
                                    {targetProduct.登録日時}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button 
                            onClick={() => setViewMode('list')}
                            className="px-6 py-2 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                            キャンセル
                        </button>
                        <button 
                            onClick={handleSave}
                            className="flex items-center px-6 py-2 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-colors"
                        >
                            <Check size={16} className="mr-2" />
                            {viewMode === 'new' ? '登録を完了する' : '編集を保存する'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};