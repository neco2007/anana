'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import DataViewContainer from '../layout/DataViewContainer'
import ActionBar from '../data/ActionBar'
import OrderTable from '../data/OrderTable'
import OrderEditorModal from '../data/OrderEditorModal'
import OrderSummaryView from '../data/OrderSummaryView'
import { SHINCHO_FIELDS } from '../../../constants/orderFieldConfigs'
import OrderDetailModal from '../data/OrderDetailModal'

interface ShinchoDataViewProps {
  onNotify?: (message: string) => void;
}

export default function ShinchoDataView({ onNotify }: ShinchoDataViewProps) {
  const [searchWord, setSearchWord] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'basic' | 'all' | 'summary'>('basic')
  const [dateFilter, setDateFilter] = useState<number | null>(null)
  const [detailRow, setDetailRow] = useState<any | null>(null)
  
  const [tableData, setTableData] = useState<any[]>([])
  const [masterProducts, setMasterProducts] = useState<string[]>([])
  const [masterData, setMasterData] = useState<any[]>([])

  // テーブルの列順と、変更された行データ（のし・備考など）を保持するステート
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  const tableId = "shincho_data";

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

  // 新朝マスタの全行データと発注商品名リストを取得
  useEffect(() => {
    if (window.eel) {
      window.eel.get_sincho_master()((data: any[]) => {
        const rawData = data ?? [];
        setMasterData(rawData);
        const seen = new Set<string>();
        const names = rawData
          .map((r: any) => (r['発注商品名'] || '').trim())
          .filter((name: string) => name && !seen.has(name) && seen.add(name));
        setMasterProducts(names);
      });
    }
  }, []);

  // 行データの更新（のし・備考の編集をステートに反映し、バックエンドへ即時保存）
  const handleRowDataUpdate = (rowId: any, field: string, value: any) => {
    setTableData(prev => prev.map(row =>
      String(row.id) === String(rowId) ? { ...row, [field]: value } : row
    ));
    if (window.eel) {
      window.eel.update_row_field(tableId, rowId, field, value)((res: any) => {
        if (!res.success) {
          console.error("Failed to update row:", res.error);
        }
      });
    }
  };

  // 複数フィールドの一括更新（伝票表示名選択時など）
  const handleRowMultiUpdate = (rowId: any, updates: Record<string, any>) => {
    setTableData(prev => prev.map(row =>
      String(row.id) === String(rowId) ? { ...row, ...updates } : row
    ));
    if (window.eel) {
      window.eel.update_order_record(tableId, rowId, updates)((res: any) => {
        if (!res.success) {
          console.error("Failed to update row:", res.error);
        }
      });
    }
  };

  // 日付フィルター適用（_import_at の先頭10文字 YYYY-MM-DD で照合）
  const displayData = useMemo(() => {
    if (dateFilter === null) return tableData;
    const d = new Date();
    d.setDate(d.getDate() - dateFilter);
    const targetDate = d.toISOString().split('T')[0];
    return tableData.filter(row =>
      String(row['_import_at'] || '').slice(0, 10) === targetDate
    );
  }, [tableData, dateFilter]);

  const handleImport = () => {
    const expectedLabels = SHINCHO_FIELDS.map(f => f.label);
    if (window.eel) {
      window.eel.import_csv_to_table(tableId, expectedLabels)((res: any) => {
        if (res.success) {
          const msg = `03.新朝プレス受注データに ${res.count}件のデータが取り込まれました。`
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
            title="03.新朝プレス受注データ"
            tableId={tableId}
            data={tableData}
            masterProducts={masterProducts}
            draggable
          />
        ) : (
          <OrderTable
            type="sincho"
            viewMode={viewMode}
            searchTerm={searchWord}
            data={displayData}
            masterProducts={masterProducts}
            masterData={masterData}
            tableId={tableId}
            onColumnOrderChange={setColumnOrder}
            onRowDataUpdate={handleRowDataUpdate}
            onRowMultiUpdate={handleRowMultiUpdate}
            onRowDetail={setDetailRow}
            onRefresh={loadData}
          />
        )}
      </div>

      <OrderEditorModal 
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title="03.新朝プレス受注データ"
        fields={SHINCHO_FIELDS}
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