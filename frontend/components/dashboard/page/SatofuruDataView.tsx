'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [masterData, setMasterData] = useState<any[]>([])

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

  // さとふるマスタの全行データと発注商品名リストを取得
  useEffect(() => {
    if (window.eel) {
      window.eel.get_satohuru_master()((data: any[]) => {
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
      window.eel.export_table_csv(tableId, columnOrder, viewMode)((res: any) => {
        if (res.success) {
          alert("Excelを出力しました。");
        } else if (res.error) {
          alert("出力エラー: " + res.error);
        }
      });
    }
  };

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
            draggable
          />
        ) : (
          <OrderTable
            type="satofuru"
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