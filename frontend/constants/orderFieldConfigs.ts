export type FieldType = 'text' | 'select' | 'datetime' | 'date' | 'textarea';

export interface FieldConfig {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  colSpan?: number;
  readonly?: boolean; // trueなら自動入力専用（編集不可）
}

export const SATOFURU_FIELDS: FieldConfig[] = [
  { id: 'shipping_no', label: '配送情報番号', type: 'text' },
  { id: 'postal_code', label: '配送先郵便番号', type: 'text' },
  { id: 'order_no', label: '寄附受付番号', type: 'text' },
  { id: 'original_gift_name', label: 'お礼品名', type: 'text' },
  { id: 'slip_display_name', label: '伝票表示名', type: 'text' },
  { id: 'product_name', label: '発注商品名', type: 'text', readonly: true },
  { id: 'city', label: '配送先市区町村', type: 'text' },
  { id: 'pref', label: '配送先都道府県', type: 'text' },
  { id: 'town', label: '配送先町名', type: 'text' },
  { id: 'tax_type', label: '課税対象外', type: 'text' },
  { id: 'gift_id', label: 'お礼品ID', type: 'text' },
  { id: 'price_tax_in_plan', label: '提供価格（税込）※予定', type: 'text' },
  { id: 'price_tax_ex', label: '提供価格（税抜）', type: 'text' },
  { id: 'price_tax_in', label: '提供価格（税込）', type: 'text' },
  { id: 'slip_no', label: '送り状No.', type: 'text' },
  { id: 'order_date', label: '発注日', type: 'date' },
  { id: 'pickup_plan_date', label: '集荷予定日', type: 'date' },
  { id: 'pickup_result_date', label: '集荷実績日', type: 'date' },
];

export const SHINCHO_FIELDS: FieldConfig[] = [
  { id: 'reg_date', label: '登録日時', type: 'datetime' },
  { id: 'gift_item', label: '返礼品', type: 'text' },
  { id: 'product_select', label: '発注商品名_（単一選択）', type: 'select', options: ['スーパードライ 350ml', 'マルエフ 350ml', '生ジョッキ缶 340ml'] },
  { id: 'shipping_id', label: '配送管理ID', type: 'text' },
  { id: 'donor_name', label: '寄付者', type: 'text' },
  { id: 'donor_pref', label: '寄付者住所(都道府県)', type: 'text' },
  { id: 'donor_zip', label: '寄付者住所(〒)', type: 'text' },
  { id: 'donor_addr1', label: '寄付者住所(住所１)', type: 'text' },
  { id: 'donor_addr2', label: '寄付者住所（住所２）', type: 'text' },
  { id: 'donor_tel', label: '寄付者電話番号', type: 'text' },
  { id: 'donor_tel_sub', label: '寄付者電話番号枝番', type: 'text' },
  { id: 'donor_email', label: '寄付者メールアドレス', type: 'text' },
  { id: 'cancel_request', label: '取消し依頼', type: 'text', placeholder: 'いつ：だれから：ご要望：' },
  { id: 'dest_name', label: 'お届け先名', type: 'text' },
  { id: 'dest_kana', label: '届け先名称カナ', type: 'text' },
  { id: 'dest_pref', label: '届け先都道府県', type: 'text' },
  { id: 'dest_addr1', label: '届け先住所１', type: 'text' },
  { id: 'dest_addr2', label: '届け先住所２', type: 'text' },
  { id: 'dest_tel', label: '届け先電話番号', type: 'text' },
  { id: 'dest_dept1', label: 'お届け先会社・部門１', type: 'text' },
  { id: 'dest_dept2', label: 'お届け先会社・部門２', type: 'text' },
  { id: 'payment_date', label: '入金日', type: 'date' },
  { id: 'method', label: '寄付方法', type: 'text' },
  { id: 'apply_date', label: '申込日', type: 'date' },
  { id: 'delivery_date', label: 'お届け指定日', type: 'date' },
  { id: 'shipping_plan_date', label: '出荷予定日', type: 'date' },
  { id: 'slip_no', label: '伝票番号', type: 'text' },
  { id: 'delivery_time', label: 'お届け指定時間帯', type: 'text' },
  { id: 'memo', label: '備考', type: 'textarea', colSpan: 2 },
  { id: 'shipping_memo', label: '配送伝票備考', type: 'textarea', colSpan: 2 },
  { id: 'client_code', label: 'ご依頼主コード', type: 'text' },
  { id: 'client_name', label: '依頼主名', type: 'text' },
  { id: 'client_kana', label: '依頼主名(カナ)', type: 'text' },
  { id: 'item_code', label: '商品コード', type: 'text' },
  { id: 'item_name', label: '商品名称', type: 'text' },
  { id: 'date_fixed_item', label: '★日付指定品', type: 'text' },
  { id: 'order_product_name', label: '発注商品名', type: 'text' },
];