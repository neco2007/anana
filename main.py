import eel, database, check_item, sys, os, tkinter as tk
from tkinter import filedialog

def _open_file_dialog():
    """Mac/Windows 共通: ファイルダイアログを確実に最前面に表示するヘルパー"""
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    root.lift()
    root.focus_force()
    root.update()
    return root

# --- ビルド後の実行環境（一時フォルダ）のパスを取得するロジック ---
if getattr(sys, 'frozen', False):
    # exe/アプリとして実行されている場合
    base_path = sys._MEIPASS
else:
    # 通常のPythonとして実行されている場合
    base_path = os.path.dirname(os.path.abspath(__file__))

# フォルダ構成に合わせてパスを結合
web_dir = os.path.join(base_path, 'frontend', 'out')
eel.init(web_dir)

@eel.expose
def check_init_status(): return {"is_first_user": database.is_first_run()}
@eel.expose
def login(u, p): return database.authenticate_user(u, p)
@eel.expose
def signup(u, p): return database.register_user(u, p)
@eel.expose
def process_and_navigate():
    root = _open_file_dialog()
    path = filedialog.askopenfilename(filetypes=[("CSV", "*.csv")])
    root.destroy()
    return database.save_to_dynamic_item(path) if path else {"success": False}
@eel.expose
def fetch_all_tables(): return database.get_all_tables_data()
@eel.expose
def delete_table(name): return database.delete_item_table(name)
@eel.expose
def save_table_changes(name, rows): return {"success": database.update_table_data(name, rows)}
@eel.expose
def rename_item(old_name, new_name):
    return database.rename_table_name(old_name, new_name)
@eel.expose
def finalize_import(import_id, mode):
    return database.finalize_import(import_id, mode)
@eel.expose
def fetch_master(): return database.get_master_rows()

@eel.expose
def update_master(rows): return database.save_master_to_excel(rows)
@eel.expose
def open_excel_folder():
    return database.export_all_to_excel()
@eel.expose
def fetch_summary(table_ids, date_type, s_date, e_date, s_time, e_time):
    return database.get_aggregated_data_multi(table_ids, date_type, s_date, e_date, s_time, e_time)

@eel.expose
def pick_folder():
    return database.select_directory()

@eel.expose
def download_summary(table_id, data, label, target_dir):
    return database.export_summary_excel(table_id, data, label, target_dir)

@eel.expose
def download_raw_csv(table_id, target_dir):
    return database.export_table_to_csv(table_id, target_dir)

@eel.expose
def export_files_combined(table_ids, target_dir, date_type, s_date, e_date, s_time, e_time, mode="all"):

    return database.export_combined_files(table_ids, target_dir, date_type, s_date, e_date, s_time, e_time, mode)

# main.py の @eel.expose 群の中に追加
@eel.expose
def delete_rows(table_id, row_ids):
    return database.delete_rows(table_id, row_ids)

@eel.expose
def add_new_order(table_id, row_data):
    return database.insert_single_row(table_id, row_data)

# main.py の @eel.expose 群に追加

@eel.expose
def import_csv_to_table(table_id, expected_labels):
    """
    ファイルダイアログを開き、選択されたCSVを特定のテーブルにインポートする。
    """
    root = _open_file_dialog()
    path = filedialog.askopenfilename(filetypes=[("CSV", "*.csv")])
    root.destroy()
    if path:
        return database.import_to_specific_table(path, table_id, expected_labels)
    else:
        return {"success": False, "error": "ファイルが選択されませんでした。"}

@eel.expose
def export_table_csv(table_id, column_order=[], view_mode="basic"):
    """
    現在のテーブルデータを出力する（さとふる: Excel、新朝: CSV）。
    """
    return database.export_custom_csv(table_id, column_order, view_mode)
    
# main.py の @eel.expose 群に追加
@eel.expose
def fetch_table_rows(table_id):
    return database.get_single_table_data(table_id)

@eel.expose
def get_satohuru_master():
    return database.get_satohuru_master()

@eel.expose
def save_satohuru_master(data):
    return database.save_satohuru_master(data)

@eel.expose
def get_sincho_master():
    return database.get_sincho_master()

@eel.expose
def save_sincho_master(data):
    return database.save_sincho_master(data)

@eel.expose
def update_row_field(table_id, row_id, field, value):
    """
    特定の行の特定の項目（のし・備考など）を更新する
    """
    return database.update_row_field(table_id, row_id, field, value)

@eel.expose
def update_order_record(table_id, row_id, updated_data):
    return database.update_order_record(table_id, row_id, updated_data)

@eel.expose
def cleanup_invalid_marker(table_id):
    return database.cleanup_invalid_marker(table_id)

@eel.expose
def propagate_code_update(table_id, match_field, match_value, code_field, new_code):
    return database.propagate_code_update(table_id, match_field, match_value, code_field, new_code)

@eel.expose
def export_summary_excel_custom(table_id, selected_dates=None):
    return database.export_summary_excel_custom(table_id, selected_dates)

@eel.expose
def get_notifications():
    return database.get_notifications()

@eel.expose
def save_notification(message, time):
    return database.add_notification(message, time)

@eel.expose
def clear_notifications():
    return database.clear_notifications()

print("--- [SYSTEM] Server Starting (Dynamic Table Mode) ---")
eel.start('login/index.html', port=8080)