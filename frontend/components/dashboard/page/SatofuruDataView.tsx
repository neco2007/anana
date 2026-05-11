'use client'
import { useState, useEffect, useCallback } from 'react'
import DataViewContainer from '../layout/DataViewContainer'
import ActionBar from '../data/ActionBar'
import OrderTable from '../data/OrderTable'
import OrderEditorModal from '../data/OrderEditorModal'
import OrderSummaryView from '../data/OrderSummaryView'
import { SATOFURU_FIELDS } from '../../../constants/orderFieldConfigs'
import OrderDetailModal from '../data/OrderDetailModal'

interface SatofuruDataViewProps {
  onNotify?: (message: string) => void;
}

export default function SatofuruDataView({ onNotify }: SatofuruDataViewProps) {
  const [searchWord, setSearchWord] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'basic' | 'all' | 'summary'>('basic')
  const [dateFilter, setDateFilter] = useState<number | null>(null)
  const [detailRow, setDetailRow] = useState<any | null>(null)

  const [tableData, setTableData] = useState<any[]>([])
  const [masterProducts, setMasterProducts] = useState<string[]>([])

  // テーブルの列順を保持するステート
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  const tableId = "satofuru_data";

  const loadData = useCallback(() => {
    if (window.eel) {
      window.eel.fetch_table_rows(tableId)((res: any) => {
        if (res.success) {
          setTableData(res.rows);
        } else {
          console.error("Data Load Error:", res.error);
        }
      });
    }
  }, [tableId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // さとふるマスタの発注商品名リストを取得（重複除去・マスタ順を維持）
  useEffect(() => {
    if (window.eel) {
      window.eel.get_satohuru_master()((data: any[]) => {
        const seen = new Set<string>();
        const names = (data ?? [])
          .map((r: any) => (r['発注商品名'] || '').trim())
          .filter(name => name && !seen.has(name) && seen.add(name));
        setMasterProducts(names);
      });
    }
  }, []);

  const handleImport = () => {
    const expectedLabels = SATOFURU_FIELDS.map(f => f.label);
    if (window.eel) {
      window.eel.import_csv_to_table(tableId, expectedLabels)((res: any) => {
        if (res.success) {
          const msg = `04.さとふる受注データに ${res.count}件のデータが取り込まれました。`
          onNotify?.(msg)
          loadData();
        } else {
          alert("取り込みエラー: " + res.error);
        }
      });
    }
  };

  const handleExport = () => {
    if (window.eel) {
      // 画面上で並び替えられた順番と、ビューモード（出力モード）をバックエンドへ送る
      window.eel.export_table_csv(tableId, columnOrder, viewMode)((res: any) => {
        if (res.success) {
          alert("CSVを出力しました。");
        } else if (res.error) {
          alert("出力エラー: " + res.error);
        }
      });
    }
  };

  return (
    <DataViewContainer>
      <ActionBar 
        onSearch={setSearchWord} 
        onCreate={() => setIsEditorOpen(true)} 
        onImport={handleImport}
        onExport={handleExport}
        onSummaryClick={() => setViewMode('summary')}
        viewMode={viewMode}
        onViewChange={(v) => setViewMode(v as any)}
        onDateFilterChange={setDateFilter}
      />
      
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'summary' ? (
          <OrderSummaryView
            onBack={() => setViewMode('basic')}
            title="04.さとふる受注データ"
            tableId={tableId}
            data={tableData}
            masterProducts={masterProducts}
          />
        ) : (
          <OrderTable 
            type="satofuru"
            viewMode={viewMode}
            searchTerm={searchWord} 
            data={tableData}
            onColumnOrderChange={setColumnOrder}
            onRowDetail={setDetailRow}
          />
        )}
      </div>

      <OrderEditorModal 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="04.さとふる受注データ"
        fields={SATOFURU_FIELDS}
        tableId={tableId}
        onSuccess={loadData}
      />
      <OrderDetailModal 
        isOpen={!!detailRow}
        onClose={() => setDetailRow(null)}
        rowData={detailRow}
        tableId={tableId}
        onSaveSuccess={() => {
          setDetailRow(null);
          loadData();
        }}
      />
    </DataViewContainer>
  )
}