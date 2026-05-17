import pandas as pd
import re
import unicodedata
import os

MASTA_PATH = "satohuru_masta.csv"

def clean_text(text):
    if not text or str(text).lower() == 'nan': return ""
    text = unicodedata.normalize('NFKC', str(text)).lower()
    # 判定に邪魔な記号を除去
    text = re.sub(r'[()\[\]【】×x*_,_、]', ' ', text)
    return text

def get_normalized_name_satofuru(raw_name):
    """
    CSV内の「発注商品名」を検索して返すロジック
    """
    if not os.path.exists(MASTA_PATH):
        return raw_name
    
    df_masta = pd.read_csv(MASTA_PATH)
    cleaned_input = clean_text(raw_name)
    
    # マスタの「お礼品名」を1つずつチェック
    for _, row in df_masta.iterrows():
        masta_keyword = clean_text(str(row['お礼品名']))
        # 入力文字列の中にマスタのキーワードが含まれているか
        if masta_keyword in cleaned_input:
            return str(row['発注商品名'])
            
    # 見つからない場合は基本ロジック(前回のスーパードライ等の判定)へ
    return None