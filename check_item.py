import pandas as pd
import os
import sys
import platform

def _get_data_dir() -> str:
    if getattr(sys, 'frozen', False):
        if platform.system() == 'Darwin':
            d = os.path.expanduser('~/Library/Application Support/OrderONE')
        else:
            d = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'OrderONE')
    else:
        d = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(d, exist_ok=True)
    return d

_DATA_DIR = _get_data_dir()

PATH_MAP = {
    'satofuru': os.path.join(_DATA_DIR, 'satohuru_masta.csv'),
    'sincho':   os.path.join(_DATA_DIR, 'sincho.csv'),
}

def get_normalized_name(raw_name, raw_id=None, source_type='satofuru'):
    """
    お礼ID（マスタの「お礼ID」列）をキーにして正規名（発注商品名）を返す。
    見つからない場合は原文(raw_name)をそのまま返す。
    """
    masta_path = PATH_MAP.get(source_type, 'satohuru_masta.csv')

    # マスタファイルが存在し、かつIDが渡されている場合のみ処理
    if os.path.exists(masta_path) and raw_id:
        try:
            # ゼロ落ちを防ぐためすべて文字列として読み込む
            df_masta = pd.read_csv(masta_path, dtype=str).fillna("")

            # IDの空白などを除去して比較用にクリーンアップ
            clean_raw_id = str(raw_id).strip()

            # 「商品コード」列を優先、なければ旧来の「お礼ID」列を使用
            id_col = next((c for c in ['商品コード', 'お礼ID'] if c in df_masta.columns), None)
            if id_col:
                match = df_masta[df_masta[id_col].str.strip() == clean_raw_id]

                if not match.empty:
                    return match.iloc[0]['発注商品名']

        except Exception as e:
            print(f"Master lookup error: {e}")

    # IDが一致しなかった場合、またはIDが空だった場合は、とりあえず原文を返す
    # （マスタに登録されていない新商品の場合は、そのままの名前で取り込まれます）
    return raw_name


def get_master_fields(raw_id, source_type='satofuru'):
    """
    お礼IDをキーにしてマスタから伝票表示名（マスタのお礼品名列）と発注商品名を返す。
    マッチしない場合は None を返す。
    """
    masta_path = PATH_MAP.get(source_type, 'satohuru_masta.csv')
    if not (os.path.exists(masta_path) and raw_id):
        return None
    try:
        df_masta = pd.read_csv(masta_path, dtype=str).fillna("")
        clean_raw_id = str(raw_id).strip()
        # 「商品コード」列を優先、なければ旧来の「お礼ID」列を使用
        id_col = next((c for c in ['商品コード', 'お礼ID'] if c in df_masta.columns), None)
        if id_col:
            match = df_masta[df_masta[id_col].str.strip() == clean_raw_id]
            if not match.empty:
                return {
                    '発注商品名': str(match.iloc[0]['発注商品名']),
                    '伝票表示名': str(match.iloc[0]['お礼品名']),
                }
    except Exception as e:
        print(f"Master lookup error: {e}")
    return None