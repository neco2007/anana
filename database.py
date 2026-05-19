import sqlite3
import pandas as pd
import os
import sys
import shutil
import hashlib
import bcrypt
import re
from datetime import datetime, timedelta, date as date_type
import holidays as jp_holidays_lib
import check_item
import platform
import subprocess
import tkinter as tk
from tkinter import filedialog

def get_data_dir() -> str:
    """OSに応じた永続的な書き込み可能ディレクトリを返す。"""
    if getattr(sys, 'frozen', False):
        if platform.system() == 'Darwin':
            d = os.path.expanduser('~/Library/Application Support/OrderONE')
        else:
            d = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'OrderONE')
    else:
        d = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(d, exist_ok=True)
    return d

_DATA_DIR = get_data_dir()

def _get_bundle_dir() -> str:
    """バンドル内の読み取り専用アセットのディレクトリを返す。"""
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

def _seed_master_files():
    """初回起動時のみ、バンドル内のマスタCSVをデータディレクトリにコピーする。"""
    seed_dir = os.path.join(_get_bundle_dir(), 'seed')
    for fname in ('satohuru_masta.csv', 'sincho.csv'):
        dest = os.path.join(_DATA_DIR, fname)
        src  = os.path.join(seed_dir, fname)
        if not os.path.exists(dest) and os.path.exists(src):
            shutil.copy2(src, dest)

_seed_master_files()

DB_FILE           = os.path.join(_DATA_DIR, "local_database.db")
MASTER_FILE       = os.path.join(_DATA_DIR, "master.xlsx")
SYNC_DIR          = os.path.join(_DATA_DIR, "synced_excel")
UPLOAD_DIR        = os.path.join(_DATA_DIR, "upload")
MASTA_FILE        = os.path.join(_DATA_DIR, "satohuru_masta.csv")
SINCHO_MASTA_FILE = os.path.join(_DATA_DIR, "sincho.csv")

pending_import_data = {}

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# --- フォルダ選択ダイアログ (Mac/Windows対応) ---
def select_directory():
    if platform.system() == 'Darwin':
        script = 'POSIX path of (choose folder with prompt "フォルダを選択してください")'
        result = subprocess.run(['osascript', '-e', script], capture_output=True, text=True)
        return result.stdout.strip() if result.returncode == 0 else None
    else:
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        root.lift()
        root.focus_force()
        root.update()
        path = filedialog.askdirectory()
        root.destroy()
        return path


def _calc_output_date(mode: str, custom_date: str | None = None) -> date_type:
    """
    出力日付モードに応じて使用する日付を返す。
    mode: 'today' | 'today_weekday' | 'next_day' | 'next_weekday' | 'custom'
    custom_date: 'YYYY-MM-DD' 文字列（mode=='custom' のときのみ使用）
    """
    today = datetime.now().date()
    jp = jp_holidays_lib.Japan()
    if mode == 'today_weekday':
        d = today
        while d.weekday() >= 5 or d in jp:  # 今日が土日祝なら翌営業日へ
            d += timedelta(days=1)
        return d
    if mode == 'next_day':
        return today + timedelta(days=1)
    if mode == 'next_weekday':
        d = today + timedelta(days=1)
        while d.weekday() >= 5 or d in jp:
            d += timedelta(days=1)
        return d
    if mode == 'custom' and custom_date:
        try:
            return datetime.strptime(custom_date, '%Y-%m-%d').date()
        except ValueError:
            pass
    return today  # 'today' またはフォールバック


def _make_filename(table_id, count, suffix, ext, output_date=None):
    """YYYY.MM.DD（曜）N件　さと/新P {suffix}.{ext} 形式のファイル名を生成する"""
    weekdays = ['月', '火', '水', '木', '金', '土', '日']
    d = output_date if output_date else datetime.now().date()
    date_str = d.strftime('%Y.%m.%d') + f'（{weekdays[d.weekday()]}）'
    prefix = 'さと' if 'satofuru' in table_id.lower() else '新P'
    base = f"{prefix} {suffix}".rstrip() if suffix else prefix
    return f"{date_str}{count}件　{base}.{ext}"


def _save_excel_yugothic(df, filepath, header=True):
    """DataFrame を游ゴシック 12pt の Excel ファイルとして保存するヘルパー。"""
    from openpyxl import Workbook
    from openpyxl.styles import Font
    wb = Workbook()
    ws = wb.active
    font = Font(name='Yu Gothic', size=12)
    start_row = 1
    if header:
        for col_idx, col_name in enumerate(df.columns, 1):
            cell = ws.cell(row=1, column=col_idx, value=col_name)
            cell.font = font
        start_row = 2
    for row_idx, row_data in enumerate(df.itertuples(index=False), start_row):
        for col_idx, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=value)
            cell.font = font
    wb.save(filepath)

# --- フォルダを開く命令 (Mac/Windows対応) ---
def open_folder(path):
    if platform.system() == "Windows":
        os.startfile(path)
    elif platform.system() == "Darwin": # Mac
        subprocess.run(["open", path])
    else:
        subprocess.run(["xdg-open", path])

# --- 【最重要】出荷データ一括出力ロジック（引き算方式） ---
def export_combined_files(table_ids, target_dir, date_type, s_date, e_date, s_time, e_time, mode="all"):
    """
    1. 各DBごとに、フィルタ条件に合った全項目を一度抽出
    2. そこから「管理コード」「ギフト」の列だけを削除
    3. 各DBごとにファイルを分けて保存（不自然なカンマは出ません）
    """
    if not target_dir or not table_ids:
        return {"success": False, "error": "保存先または対象データが選択されていません"}

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    folder_name = f"{timestamp}_出荷セット"
    output_path = os.path.join(target_dir, folder_name)
    if not os.path.exists(output_path): os.makedirs(output_path)

    try:
        with get_connection() as conn:
            for table_id in table_ids:
                # DBから条件に合うデータを全取得
                query = f'SELECT * FROM "{table_id}" WHERE 1=1'
                params = []
                now = datetime.now()
                today = now.strftime('%Y-%m-%d')
                yesterday = (now - timedelta(days=1)).strftime('%Y-%m-%d')

                if date_type == 'today':
                    query += " AND substr(_import_at, 1, 10) = ?"; params.append(today)
                elif date_type == 'yesterday':
                    query += " AND substr(_import_at, 1, 10) = ?"; params.append(yesterday)
                elif date_type == 'range':
                    if s_date: query += " AND substr(_import_at, 1, 10) >= ?"; params.append(s_date)
                    if e_date: query += " AND substr(_import_at, 1, 10) <= ?"; params.append(e_date)
                
                if date_type != 'all':
                    if s_time: query += " AND substr(_import_at, 12, 5) >= ?"; params.append(s_time)
                    if e_time: query += " AND substr(_import_at, 12, 5) <= ?"; params.append(e_time)

                df = pd.read_sql_query(query, conn, params=params).fillna("")
                
                if df.empty: continue

                drop_list = ["管理コード", "ギフト", "_import_at"]
                actual_drop = [c for c in drop_list if c in df.columns]
                df_send = df.drop(columns=actual_drop)

                # CSV出力
                csv_file = os.path.join(output_path, f"{table_id}_送付用データ.csv")
                df_send.to_csv(csv_file, index=False, encoding='utf-8-sig')

                if mode == "all":
                    # 詳細エクセル出力（游ゴシック 12pt）
                    excel_detail = os.path.join(output_path, f"{table_id}_送付用詳細.xlsx")
                    _save_excel_yugothic(df_send, excel_detail)

                    # 集計指示書エクセル（計算表、游ゴシック 12pt）
                    summary_file = os.path.join(output_path, f"{table_id}_集計指示書.xlsx")
                    agg_df = df.groupby("正規化名")["ケース数"].sum().reset_index()
                    agg_df.columns = ["商品名", "個数"]
                    output_list = [
                        ["", "", f"{datetime.now().strftime('%Y年%m月%d日')}"],
                        ["商品名", "", "個数"],
                    ]
                    total_val = 0
                    for _, row in agg_df.iterrows():
                        output_list.append([row["商品名"], "", row["個数"]])
                        total_val += int(row["個数"])
                    output_list.append(["", "合計", total_val])
                    _save_excel_yugothic(pd.DataFrame(output_list), summary_file, header=False)

        open_folder(output_path)
        return {"success": True, "path": output_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- プレビュー用集計 ---
def get_aggregated_data_multi(table_ids, date_type, start_date, end_date, start_time, end_time):
    all_dfs = []
    with get_connection() as conn:
        for table_id in table_ids:
            query = f'SELECT "正規化名", "ケース数" FROM "{table_id}" WHERE 1=1'
            params = []
            now = datetime.now()
            today = now.strftime('%Y-%m-%d')
            yesterday = (now - timedelta(days=1)).strftime('%Y-%m-%d')
            if date_type == 'today':
                query += " AND substr(_import_at, 1, 10) = ?"; params.append(today)
            elif date_type == 'yesterday':
                query += " AND substr(_import_at, 1, 10) = ?"; params.append(yesterday)
            elif date_type == 'range':
                if start_date: query += " AND substr(_import_at, 1, 10) >= ?"; params.append(start_date)
                if end_date: query += " AND substr(_import_at, 1, 10) <= ?"; params.append(end_date)
            if date_type != 'all':
                if start_time: query += " AND substr(_import_at, 12, 5) >= ?"; params.append(start_time)
                if end_time: query += " AND substr(_import_at, 12, 5) <= ?"; params.append(end_time)
            
            df = pd.read_sql_query(query, conn, params=params)
            all_dfs.append(df)
            
    if not all_dfs: return []
    combined = pd.concat(all_dfs, ignore_index=True)
    if combined.empty: return []
    final_agg = combined.groupby("正規化名")["ケース数"].sum().reset_index()
    final_agg.columns = ["正規化名", "個数"]
    return final_agg.to_dict(orient='records')

# --- マスタ管理機能 ---
def get_master_rows():
    if not os.path.exists(MASTER_FILE):
        df = pd.DataFrame(columns=["管理コード", "商品名", "検索キーワード1", "検索キーワード2"])
        df.to_excel(MASTER_FILE, index=False)
    try:
        df = pd.read_excel(MASTER_FILE).fillna("")
        return df.to_dict(orient='records')
    except:
        return []

def save_master_to_excel(rows):
    try:
        df = pd.DataFrame(rows)
        df.to_excel(MASTER_FILE, index=False)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# --- その他 DB基盤・インポート・同期ロジック ---
def init_db():
    if not os.path.exists(SYNC_DIR): os.makedirs(SYNC_DIR)
    with get_connection() as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)")
        conn.execute("CREATE TABLE IF NOT EXISTS table_mapping (pattern_hash TEXT, table_name TEXT PRIMARY KEY, headers TEXT)")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message TEXT NOT NULL,
                time TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            )
        """)
        conn.commit()

def _delete_old_notifications(conn):
    """24時間より古い通知を削除する。"""
    conn.execute("DELETE FROM notifications WHERE created_at < datetime('now', '-1 day', 'localtime')")
    conn.commit()

def get_notifications():
    init_db()
    try:
        with get_connection() as conn:
            _delete_old_notifications(conn)
            rows = conn.execute("SELECT id, message, time FROM notifications ORDER BY id DESC").fetchall()
            return [{"id": r["id"], "message": r["message"], "time": r["time"], "read": True} for r in rows]
    except Exception as e:
        return []

def add_notification(message, time):
    init_db()
    try:
        with get_connection() as conn:
            _delete_old_notifications(conn)
            cur = conn.execute("INSERT INTO notifications (message, time) VALUES (?, ?)", (message, time))
            conn.commit()
            return {"success": True, "id": cur.lastrowid}
    except Exception as e:
        return {"success": False, "error": str(e)}

def clear_notifications():
    try:
        with get_connection() as conn:
            conn.execute("DELETE FROM notifications")
            conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def is_first_run():
    init_db()
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        res = cur.fetchone()
        return res[0] == 0 if res else True

def register_user(u, p):
    hashed = bcrypt.hashpw(p.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    try:
        with get_connection() as conn:
            conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (u, hashed))
            conn.commit()
        return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}

def authenticate_user(u, p):
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ?", (u,))
        user = cur.fetchone()
        if user and bcrypt.checkpw(p.encode('utf-8'), user['password'].encode('utf-8')):
            return {"success": True}
    return {"success": False}

def load_master_map():
    df = None
    if os.path.exists(MASTER_FILE):
        try: df = pd.read_excel(MASTER_FILE)
        except: pass
    if df is None: return {}
    code_col_idx = 0
    for i, col in enumerate(df.columns):
        if "管理コード" in str(col): code_col_idx = i; break
    mapping = {}
    for _, row in df.iterrows():
        code = str(row.iloc[code_col_idx]).strip()
        if not code or code.lower() == 'nan': continue
        for i in range(len(row)):
            if i == code_col_idx: continue
            val = str(row.iloc[i]).strip()
            if val and val.lower() != 'nan': mapping[val] = code
    return mapping

def is_numeric_column(series):
    sample = series.dropna().head(3)
    if sample.empty: return True
    for val in sample:
        if re.search(r'[ぁ-んァ-ヶ亜-熙]', str(val)): return False
    return True

def rename_table_name(old_name, new_name):
    if old_name == new_name: return {"success": True}
    try:
        safe_new_name = re.sub(r'[^a-zA-Z0-9ぁ-んァ-ヶ亜-熙_]', '', new_name)
        with get_connection() as conn:
            conn.execute(f'ALTER TABLE "{old_name}" RENAME TO "{safe_new_name}"')
            conn.execute("UPDATE table_mapping SET table_name = ? WHERE table_name = ?", (safe_new_name, old_name))
            conn.commit()
        reorganize_item_numbers()
        return {"success": True}
    except: return {"success": False}

def reorganize_item_numbers():
    with get_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM table_mapping")
        all_tables = [row['table_name'] for row in cur.fetchall()]
        item_tables = [t for t in all_tables if re.match(r'^item\d+$', t)]
        item_tables.sort(key=lambda x: int(re.search(r'\d+', x).group()))
        for i, old_name in enumerate(item_tables, start=1):
            new_name = f"item{i}"
            if old_name != new_name:
                try:
                    conn.execute(f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"')
                    conn.execute("UPDATE table_mapping SET table_name = ? WHERE table_name = ?", (new_name, old_name))
                except: pass
        conn.commit()

def save_to_dynamic_item(file_path):
    global pending_import_data
    import os
    import shutil
    import hashlib
    import pandas as pd
    from datetime import datetime

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    dest_path = os.path.join(UPLOAD_DIR, os.path.basename(file_path))
    shutil.copy2(file_path, dest_path)

    import check_item # ← 【重要】新しいSSoTロジックを読み込み

    try:
        ext = os.path.splitext(dest_path)[1].lower()
        if ext in ('.xlsx', '.xls'):
            df = pd.read_excel(dest_path, sheet_name=0).fillna("")
        else:
            import check
            check.fix_encoding(dest_path)
            df = pd.read_csv(dest_path).fillna("")
        master_map = load_master_map()
        # ※master_names は check_item 側で処理するため不要になりました
        
        priority_cols = ["返礼品", "サイト元商品名", "お礼品名", "商品名", "内容"]
        target_col = next((p for p in priority_cols if p in df.columns and not is_numeric_column(df[p])), None)
        if not target_col:
            target_col = next((c for c in df.columns if any(k in c for k in ["商品", "品名", "アイテム"])), None)

        if target_col:
            normalized_names, management_codes, case_counts, gift_flags = [], [], [], []
            for i, row in df.iterrows():
                raw = str(row[target_col]).strip()
                
                # =========================================================
                # 【変更点】全ての正規化処理を check_item.py (SSoT) に委譲
                # =========================================================
                normalized_name = check_item.get_normalized_name(raw)
                
                # check_itemから返ってきた「完全な正規化名」から属性を判定
                is_g = True if "【ギフト】" in normalized_name else False
                count = 2 if "【２ケース】" in normalized_name else 1
                
                # 完成した正規名を使ってマスタから管理コードを取得
                code = master_map.get(normalized_name, "未登録")
                
                normalized_names.append(normalized_name)
                management_codes.append(code)
                case_counts.append(count)
                gift_flags.append("あり" if is_g else "なし")
                # =========================================================
        
            df['正規化名'] = normalized_names
            df['管理コード'] = management_codes
            df['ケース数'] = case_counts
            df['ギフト'] = gift_flags

        now = datetime.now()
        df['インポート日'] = now.strftime('%Y-%m-%d')
        df['_import_at'] = now.strftime('%Y-%m-%d %H:%M:%S')
        cols = ['管理コード', '正規化名', 'ケース数', 'ギフト', 'インポート日'] + [c for c in df.columns if c not in ['管理コード', '正規化名', 'ケース数', 'ギフト', 'インポート日']]
        df = df[cols]
        headers_str = ",".join(df.columns)
        pattern_hash = hashlib.md5(headers_str.encode()).hexdigest()
        key_col = next((c for c in df.columns if any(k in c for k in ["受付番号", "管理ID", "No", "コード"])), None)
        
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT table_name FROM table_mapping WHERE pattern_hash = ?", (pattern_hash,))
            row = cur.fetchone()
            if row:
                table_name = row['table_name']
                existing_df = pd.read_sql_query(f'SELECT * FROM "{table_name}"', conn).fillna("")
                if key_col:
                    duplicate_mask = df[key_col].astype(str).isin(existing_df[key_col].astype(str))
                    duplicates = df[duplicate_mask].to_dict(orient='records')
                else:
                    compare_cols = [c for c in df.columns if c not in ['_import_at', 'インポート日']]
                    merged = df.merge(existing_df[compare_cols], on=compare_cols, how='inner')
                    duplicates = merged.to_dict(orient='records')
                if len(duplicates) > 0:
                    import_id = hashlib.md5(f"{datetime.now()}".encode()).hexdigest()
                    pending_import_data[import_id] = {"df": df, "table_name": table_name, "key_col": key_col}
                    return {"status": "confirm", "import_id": import_id, "duplicates": duplicates[:10], "duplicate_count": len(duplicates), "table_name": table_name}
                else:
                    df.to_sql(table_name, conn, if_exists='append', index=False)
            else:
                cur.execute("SELECT COUNT(*) FROM table_mapping")
                count = cur.fetchone()[0]
                table_name = f"item{count + 1}"
                conn.execute("INSERT INTO table_mapping VALUES (?, ?, ?)", (pattern_hash, table_name, headers_str))
                df.to_sql(table_name, conn, if_exists='replace', index=False)
            conn.commit()
        reorganize_item_numbers()
        return {"success": True, "table_name": table_name}
    except Exception as e: 
        return {"success": False, "error": str(e)}

def finalize_import(import_id, mode):
    global pending_import_data
    if import_id not in pending_import_data: return {"success": False, "error": "セッション切れ"}
    data = pending_import_data.pop(import_id)
    df, table_name, key_col = data["df"], data["table_name"], data["key_col"]
    try:
        with get_connection() as conn:
            if mode == "overwrite":
                if key_col:
                    keys_to_del = df[key_col].astype(str).tolist()
                    placeholders = ','.join(['?'] * len(keys_to_del))
                    conn.execute(f'DELETE FROM "{table_name}" WHERE "{key_col}" IN ({placeholders})', keys_to_del)
                else: conn.execute(f'DELETE FROM "{table_name}"')
            df.to_sql(table_name, conn, if_exists='append', index=False)
            conn.commit()
        return {"success": True, "table_name": table_name}
    except Exception as e: return {"success": False, "error": str(e)}

def get_all_tables_data():
    results = []
    with get_connection() as conn:
        try:
            mappings = conn.execute("SELECT * FROM table_mapping").fetchall()
            for m in mappings:
                try:
                    df = pd.read_sql_query(f'SELECT * FROM "{m["table_name"]}"', conn).fillna("")
                    results.append({"id": m['table_name'], "headers": m['headers'].split(','), "rows": df.to_dict(orient='records')})
                except: pass
        except: pass
    return results

def delete_item_table(t):
    with get_connection() as conn:
        conn.execute(f'DROP TABLE IF EXISTS "{t}"')
        conn.execute("DELETE FROM table_mapping WHERE table_name = ?", (t,))
        conn.commit()
    reorganize_item_numbers()
    return True

def delete_rows(table_id, row_ids):
    """指定されたテーブルから rowid のリストに一致する行を削除する。"""
    try:
        if not row_ids:
            return {"success": True, "deleted": 0}
        with get_connection() as conn:
            placeholders = ",".join("?" * len(row_ids))
            cur = conn.execute(
                f'DELETE FROM "{table_id}" WHERE rowid IN ({placeholders})',
                [int(r) for r in row_ids]
            )
            conn.commit()
        return {"success": True, "deleted": cur.rowcount}
    except Exception as e:
        return {"success": False, "error": str(e)}

def update_table_data(t, rows):
    try:
        df = pd.DataFrame(rows).fillna("")
        with get_connection() as conn:
            df.to_sql(t, conn, if_exists='replace', index=False)
        return True
    except: return False
    
# database.py に追加
def insert_single_row(table_id, row_data):
    """
    手入力された1行のデータを指定されたテーブルに保存する
    """
    try:
        # システム用の日時カラムを自動付与
        now = datetime.now()
        row_data['_import_at'] = now.strftime('%Y-%m-%d %H:%M:%S')
        row_data['インポート日'] = now.strftime('%Y-%m-%d')

        # SQLの組み立て
        columns = ', '.join([f'"{k}"' for k in row_data.keys()])
        placeholders = ', '.join(['?' for _ in row_data])
        sql = f'INSERT INTO "{table_id}" ({columns}) VALUES ({placeholders})'

        with get_connection() as conn:
            conn.execute(sql, list(row_data.values()))
            conn.commit()
        return {"success": True}
    except Exception as e:
        print(f"Insert Error: {e}")
        return {"success": False, "error": str(e)}
    
def import_to_specific_table(file_path, table_id, expected_labels):
    """
    指定されたCSVを読み込み、必要なカラムのみを抽出・補完して保存します。
    文字化け対策と、テーブルの自動作成/追加ロジックを強化。
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    dest_path = os.path.join(UPLOAD_DIR, os.path.basename(file_path))
    shutil.copy2(file_path, dest_path)

    try:
        ext = os.path.splitext(dest_path)[1].lower()
        if ext in ('.xlsx', '.xls'):
            # 1a. Excel読み込み（先頭シート）
            df = pd.read_excel(dest_path, sheet_name=0).fillna("")
        else:
            # 1b. 強力なエンコード指定でCSV読み込み
            import check
            check.fix_encoding(dest_path)
            try:
                df = pd.read_csv(dest_path, encoding='utf-8-sig').fillna("")
            except:
                df = pd.read_csv(dest_path, encoding='cp932').fillna("")

        # 2. 列名の文字化けを防ぐため、全角・半角や不要な文字をクリーンアップ
        df.columns = [str(c).strip() for c in df.columns]

        # 2-b. sincho CSVは「寄附者」表記なので「寄付者」表記へ統一
        if 'shincho' in table_id.lower():
            sincho_col_map = {
                '寄附者':             '寄付者',
                '寄附者住所（〒）':   '寄付者住所(〒)',
                '寄附者住所（都道府県）': '寄付者住所(都道府県)',
                '寄附者住所（住所１）': '寄付者住所(住所１)',
                '寄附者住所（住所２）': '寄付者住所（住所２）',
                '寄附者電話番号':     '寄付者電話番号',
                '寄附者メールアドレス': '寄付者メールアドレス',
                '寄附方法':           '寄付方法',
                '配送用伝票備考':     '配送伝票備考',
            }
            df.rename(columns=sincho_col_map, inplace=True)

            # 伝票番号が科学表記の数値（例: 3.89493E+11）で読み込まれる場合に整数文字列へ変換
            if '伝票番号' in df.columns:
                def _parse_slip_no(x):
                    if x == '' or (isinstance(x, float) and pd.isna(x)):
                        return ''
                    try:
                        return str(int(float(str(x))))
                    except (ValueError, TypeError):
                        return str(x)
                df['伝票番号'] = df['伝票番号'].apply(_parse_slip_no)

        # 3. 期待されるカラムが不足していれば空欄で作成
        for label in expected_labels:
            if label not in df.columns:
                df[label] = ""

# 4. システム用カラムの自動計算
        master_map = load_master_map()
        
        # ID列の候補（さとふる、新朝プレスそれぞれのCSVヘッダーを想定）
        id_cols = ["お礼品ID", "お礼ID", "商品コード", "寄附受付番号", "配送管理ID"]
        target_id_col = next((c for c in id_cols if c in df.columns), None)
        
        # 商品名列の候補（さとふる→お礼品名, 新朝→返礼品 を優先）
        priority_cols = ["お礼品名", "返礼品", "商品名"]
        target_name_col = next((p for p in priority_cols if p in df.columns), None)

        source_type = 'sincho' if 'shincho' in table_id.lower() else 'satofuru'

        if target_name_col:
            normalized_names, management_codes, case_counts, gift_flags = [], [], [], []
            cleaned_names, order_names, slip_names = [], [], []

            for i, row in df.iterrows():
                raw_name_original = str(row[target_name_col]).strip()
                # float変換対策: CSVに空欄があると "4809357.0" になるため int 経由で正規化
                if target_id_col:
                    _raw = row[target_id_col]
                    if _raw == '' or (isinstance(_raw, float) and str(_raw) == 'nan'):
                        raw_id = None
                    else:
                        try:
                            raw_id = str(int(float(str(_raw)))).strip()
                        except (ValueError, TypeError):
                            raw_id = str(_raw).strip()
                else:
                    raw_id = None

                # お礼品名クリーン処理: 先頭の「数字+アンダースコア」パターンを除去
                clean_name = re.sub(r'^\d+_', '', raw_name_original)
                cleaned_names.append(clean_name)

                # マスタから伝票表示名・発注商品名を取得
                master_fields = check_item.get_master_fields(raw_id, source_type)
                if master_fields:
                    order_name = master_fields['発注商品名']
                    slip_name  = master_fields['伝票表示名']
                else:
                    order_name = ''
                    slip_name  = ''
                order_names.append(order_name)
                slip_names.append(slip_name)

                # 属性判定・管理コードはマスタの発注商品名ベース（未登録時はクリーン済み名）
                normalized_name = order_name if order_name else clean_name
                is_g  = "【ギフト】" in normalized_name
                count = 2 if "【２ケース】" in normalized_name else 1
                code  = master_map.get(normalized_name, "未登録")

                normalized_names.append(normalized_name)
                management_codes.append(code)
                case_counts.append(count)
                gift_flags.append("あり" if is_g else "なし")

            df[target_name_col] = cleaned_names   # クリーン済みのお礼品名で上書き
            df['正規化名']   = normalized_names
            df['発注商品名'] = order_names
            df['伝票表示名'] = slip_names
            df['管理コード'] = management_codes
            df['ケース数']   = case_counts
            df['ギフト']     = gift_flags

        df['インポート日'] = datetime.now().strftime('%Y-%m-%d')
        df['_import_at']   = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 5. 保存対象の列を限定（ゴミ列を排除・重複防止）
        system_cols = ['管理コード', '正規化名', '発注商品名', '伝票表示名', 'ケース数', 'ギフト', 'インポート日', '_import_at']
        seen = set()
        save_target_cols = [c for c in expected_labels + system_cols if not (c in seen or seen.add(c))]
        df = df[[col for col in save_target_cols if col in df.columns]]

        # 6. データベースへの保存（既存データに追加）
        with get_connection() as conn:
            df.to_sql(table_id, conn, if_exists='append', index=False)
            
            cur = conn.cursor()
            headers_str = ",".join(df.columns)
            pattern_hash = hashlib.md5(headers_str.encode()).hexdigest()
            cur.execute("INSERT OR REPLACE INTO table_mapping (pattern_hash, table_name, headers) VALUES (?, ?, ?)", 
                        (pattern_hash, table_id, headers_str))
            conn.commit()

        # インポート後に既存の「該当なし」をDBから一括削除
        cleanup_invalid_marker(table_id)

        return {"success": True, "count": len(df)}
    except Exception as e:
        print(f"Import Error: {e}")
        return {"success": False, "error": str(e)}
    
# database.py に追加
def get_single_table_data(table_id):
    """
    指定されたテーブルの全データを取得して返します（行特定用のidを含める）
    """
    try:
        with get_connection() as conn:
            check = conn.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_id}'").fetchone()
            if not check:
                return {"success": False, "error": "テーブルが存在しません"}

            # さとふるテーブルに「伝票表示名」カラムがなければ追加（既存データの移行対応）
            if 'satofuru' in table_id:
                existing_cols = {row[1] for row in conn.execute(f'PRAGMA table_info("{table_id}")')}
                if '伝票表示名' not in existing_cols:
                    conn.execute(f'ALTER TABLE "{table_id}" ADD COLUMN "伝票表示名" TEXT DEFAULT ""')
                    conn.commit()

            # 【変更】rowid as id を追加して、フロントエンドから行を特定可能にする
            df = pd.read_sql_query(f'SELECT rowid as id, * FROM "{table_id}"', conn).fillna("")
            df = df.replace("該当なし", "")
            # 全カラムを文字列に統一してフロントエンドでの型エラーを防ぐ
            for col in df.columns:
                if col != 'id':
                    df[col] = df[col].astype(str).replace('nan', '')
            return {"success": True, "rows": df.to_dict(orient='records')}
    except Exception as e:
        return {"success": False, "error": str(e)}
    
def get_satohuru_master():
    """CSVから全マスタデータを取得"""
    if not os.path.exists(MASTA_FILE):
        return []
    df = pd.read_csv(MASTA_FILE, dtype=str).fillna("")
    # 旧列名「お礼ID」を画面表示用の「商品コード」に統一
    if 'お礼ID' in df.columns and '商品コード' not in df.columns:
        df = df.rename(columns={'お礼ID': '商品コード'})
    return df.to_dict(orient='records')

def save_satohuru_master(data):
    """フロントエンドから届いたリストをCSVに上書き保存"""
    try:
        df = pd.DataFrame(data)
        # Shift-JIS (cp932) ではなく、Excelで開きやすくかつ壊れにくい utf-8-sig を使用
        df.to_csv(MASTA_FILE, index=False, encoding='utf-8-sig')
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    
def get_sincho_master():
    if not os.path.exists(SINCHO_MASTA_FILE):
        return []
    df = pd.read_csv(SINCHO_MASTA_FILE, dtype=str).fillna("")
    return df.to_dict(orient='records')

def save_sincho_master(data):
    try:
        df = pd.DataFrame(data)
        df.to_csv(SINCHO_MASTA_FILE, index=False, encoding='utf-8-sig')
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}
    
def cleanup_invalid_marker(table_id):
    """
    指定テーブル内の全文字列カラムから「該当なし」を空欄に一括置換する。
    インポートロジック修正前に取り込まれた旧データのクリーンアップ用。
    """
    try:
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute(f"PRAGMA table_info('{table_id}')")
            cols = [row[1] for row in cur.fetchall()]
            count = 0
            for col in cols:
                if col.startswith('_') or col in ('id',):
                    continue
                result = conn.execute(
                    f'UPDATE "{table_id}" SET "{col}" = "" WHERE "{col}" = "該当なし"'
                )
                count += result.rowcount
            conn.commit()
        return {"success": True, "updated": count}
    except Exception as e:
        return {"success": False, "error": str(e)}

def update_row_field(table_id, row_id, field, value):
    """
    特定の行（rowid）の単一カラム（のし・備考など）のデータを更新する
    """
    try:
        with get_connection() as conn:
            # カラムが存在しない場合は自動で追加する（のし・備考などをCSVにない状態から作り出すため）
            cur = conn.cursor()
            cur.execute(f"PRAGMA table_info('{table_id}')")
            cols = [row[1] for row in cur.fetchall()]
            if field not in cols:
                conn.execute(f'ALTER TABLE "{table_id}" ADD COLUMN "{field}" TEXT')
            
            # データ更新
            conn.execute(f'UPDATE "{table_id}" SET "{field}" = ? WHERE rowid = ?', (value, row_id))
            conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def export_custom_csv(table_id, column_order, view_mode, date_mode="today", custom_date=None):
    """
    フロントエンドで指定された列の順番・モードに合わせてCSVを出力する。
    date_mode: 'today' | 'next_day' | 'next_weekday' | 'custom'
    custom_date: 'YYYY-MM-DD' (date_mode=='custom' のときのみ使用)
    """
    target_dir = select_directory()
    if not target_dir:
        return {"success": False, "error": "保存先が選択されませんでした。"}
        
    try:
        with get_connection() as conn:
            df = pd.read_sql_query(f'SELECT * FROM "{table_id}"', conn).fillna("")
        
        # --- 新朝プレス用の特殊データ変換 ---
        if "shincho" in table_id.lower():
            if "配送管理ID" in df.columns: df["管理番号"] = df["配送管理ID"]
            if "寄付者" in df.columns: df["依頼主"] = df["寄付者"]
            if "お届け指定日" in df.columns: df["指定日"] = df["お届け指定日"]
            
            # 指定時間帯の空欄を「指定なし」に変換
            if "お届け指定時間帯" in df.columns: 
                df["指定時間"] = df["お届け指定時間帯"].apply(lambda x: "指定なし" if x == "" else x)
            else:
                df["指定時間"] = "指定なし"
            
            # 未入力の場合のデフォルト値
            if "のし" not in df.columns: df["のし"] = "なし"
            if "備考" not in df.columns: df["備考"] = ""

        # --- 列のフィルタリングと並び替え ---
        if not column_order:
            column_order = list(df.columns)
        
        # フロントから送られた「表示中の列」だけを抽出
        export_cols = [c for c in column_order if c in df.columns]
        
        # 全項目モードの場合は、残りの列を末尾にすべてくっつける
        if view_mode == "all":
            remaining = [c for c in df.columns if c not in export_cols and not c.startswith("_") and c != "id"]
            export_cols.extend(remaining)

        df_export = df[export_cols].copy()
        
        # --- 列名の最終調整（正規化名を画面表示名に合わせる） ---
        rename_dict = {}
        if "satofuru" in table_id.lower():
            rename_dict["正規化名"] = "お礼品名"
        if "shincho" in table_id.lower():
            rename_dict["正規化名"] = "返礼品"
            
        df_export = df_export.rename(columns=rename_dict)

        output_date = _calc_output_date(date_mode, custom_date)

        if 'satofuru' in table_id.lower():
            filename = _make_filename(table_id, len(df_export), '', 'xlsx', output_date)
            filepath = os.path.join(target_dir, filename)
            _save_excel_yugothic(df_export, filepath)
        else:
            filename = _make_filename(table_id, len(df_export), 'CSV', 'csv', output_date)
            filepath = os.path.join(target_dir, filename)
            df_export.to_csv(filepath, index=False, encoding='utf-8-sig')
        open_folder(target_dir)
        return {"success": True}

    except Exception as e:
        return {"success": False, "error": str(e)}

def update_order_record(table_id, row_id, updated_data):
    """
    指定されたテーブルの1行(rowid)のデータを丸ごと更新する
    """
    try:
        # システム用の内部カラム（_で始まるものやid）は更新対象から除外
        clean_data = {k: v for k, v in updated_data.items() if not str(k).startswith('_') and k != 'id'}
        
        if not clean_data:
            return {"success": True}

        with get_connection() as conn:
            # 動的にUPDATE文を組み立てる
            set_clauses = [f'"{k}" = ?' for k in clean_data.keys()]
            values = list(clean_data.values())
            
            sql = f'UPDATE "{table_id}" SET {", ".join(set_clauses)} WHERE rowid = ?'
            values.append(row_id)
            
            conn.execute(sql, values)
            conn.commit()
            
        return {"success": True}
    except Exception as e:
        print(f"Update Record Error: {e}")
        return {"success": False, "error": str(e)}

def export_summary_excel_custom(table_id, selected_dates=None):
    """
    集計データをExcel（Arial 12pt）で出力する。
    selected_dates: 出力対象の日付リスト（YYYY-MM-DD）。Noneの場合は全日付。
    """
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment

        target_dir = select_directory()
        if not target_dir:
            return {"success": False, "error": "保存先が選択されませんでした"}

        with get_connection() as conn:
            df = pd.read_sql_query(f'SELECT * FROM "{table_id}"', conn).fillna("")

        df = df.replace("該当なし", "")
        df['ケース数'] = pd.to_numeric(df['ケース数'], errors='coerce').fillna(0).astype(int)
        df['発注商品名'] = df['発注商品名'].astype(str).str.strip()
        df['インポート日'] = df['インポート日'].astype(str).str.strip()

        # 受注のある行だけでピボット
        df_valid = df[(df['発注商品名'] != '') & (df['ケース数'] > 0)]
        if df_valid.empty:
            return {"success": False, "error": "出力対象のデータがありません"}

        pivot = df_valid.groupby(['発注商品名', 'インポート日'])['ケース数'].sum().unstack(fill_value=0)
        pivot = pivot.reindex(sorted(pivot.columns), axis=1)

        # 日付絞り込み
        if selected_dates:
            valid = [d for d in selected_dates if d in pivot.columns]
            if not valid:
                return {"success": False, "error": "選択した日付にデータがありません"}
            pivot = pivot[valid]

        # 全日付で0の商品を除外
        pivot = pivot[pivot.sum(axis=1) > 0]
        if pivot.empty:
            return {"success": False, "error": "出力対象のデータがありません"}

        dates = pivot.columns.tolist()
        products = pivot.index.tolist()

        def fmt_date(s):
            try:
                dt = datetime.strptime(s, '%Y-%m-%d')
                return f"{dt.year}年{dt.month}月{dt.day}日"
            except Exception:
                return s

        wb = Workbook()
        ws = wb.active

        arial12 = Font(name='Yu Gothic', size=12)
        right_align = Alignment(horizontal='right')
        center_align = Alignment(horizontal='center')

        col_start = 3  # C列からデータ列

        # 行1: 日付ヘッダー
        for i, date in enumerate(dates):
            c = ws.cell(row=1, column=col_start + i, value=fmt_date(date))
            c.font = arial12
            c.alignment = center_align

        # 行2: "個数" サブヘッダー
        for i in range(len(dates)):
            c = ws.cell(row=2, column=col_start + i, value='個数')
            c.font = arial12
            c.alignment = center_align

        # データ行
        for r, product in enumerate(products):
            row_num = r + 3
            c = ws.cell(row=row_num, column=1, value=product)
            c.font = arial12
            for i, date in enumerate(dates):
                val = int(pivot.loc[product, date])
                c2 = ws.cell(row=row_num, column=col_start + i, value=val)
                c2.font = arial12
                c2.alignment = right_align

        # 総計行
        total_row = len(products) + 3
        c = ws.cell(row=total_row, column=2, value='総計')
        c.font = arial12
        c.alignment = right_align
        for i, date in enumerate(dates):
            total = int(pivot[date].sum())
            c2 = ws.cell(row=total_row, column=col_start + i, value=total)
            c2.font = arial12
            c2.alignment = right_align

        # 列幅調整
        ws.column_dimensions['A'].width = 45
        ws.column_dimensions['B'].width = 8
        for i in range(len(dates)):
            col_letter = ws.cell(row=1, column=col_start + i).column_letter
            ws.column_dimensions[col_letter].width = 14

        total_cases = int(pivot.values.sum())
        filename = _make_filename(table_id, total_cases, '集計', 'xlsx')
        filepath = os.path.join(target_dir, filename)
        wb.save(filepath)
        open_folder(target_dir)
        return {"success": True, "path": filepath}

    except Exception as e:
        print(f"Export Summary Excel Error: {e}")
        return {"success": False, "error": str(e)}


def propagate_code_update(table_id, match_field, match_value, code_field, new_code):
    """
    match_field が match_value に一致する全行の code_field と関連する派生列を一括更新する
    """
    try:
        source_type = 'sincho' if 'shincho' in table_id.lower() else 'satofuru'

        # マスタから発注商品名を取得
        master_fields = check_item.get_master_fields(new_code, source_type)
        order_name = master_fields['発注商品名'] if master_fields else ''

        # 派生値の算出
        normalized_name = order_name
        case_count = 2 if '【２ケース】' in normalized_name else 1
        is_gift = 'あり' if '【ギフト】' in normalized_name else 'なし'
        master_map = load_master_map()
        mgmt_code = master_map.get(normalized_name, '未登録')

        with get_connection() as conn:
            col_info = conn.execute(f'PRAGMA table_info("{table_id}")').fetchall()
            existing_cols = {row[1] for row in col_info}

            updates = {code_field: new_code, '発注商品名': order_name}
            if '正規化名' in existing_cols:
                updates['正規化名'] = normalized_name
            if 'ケース数' in existing_cols:
                updates['ケース数'] = case_count
            if 'ギフト' in existing_cols:
                updates['ギフト'] = is_gift
            if '管理コード' in existing_cols:
                updates['管理コード'] = mgmt_code

            set_clauses = [f'"{k}" = ?' for k in updates.keys()]
            values = list(updates.values()) + [match_value]
            sql = f'UPDATE "{table_id}" SET {", ".join(set_clauses)} WHERE "{match_field}" = ?'
            cur = conn.cursor()
            cur.execute(sql, values)
            updated_count = cur.rowcount
            conn.commit()

        return {"success": True, "updated": updated_count}
    except Exception as e:
        print(f"Propagate Code Update Error: {e}")
        return {"success": False, "error": str(e)}