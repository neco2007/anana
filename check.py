import chardet
import os

def fix_encoding(file_path):
    with open(file_path, 'rb') as f:
        rawdata = f.read()
        result = chardet.detect(rawdata)
        encoding = result['encoding']
    
    print(f"--- [CHECK] 判定された文字コード: {encoding} ---")

    if encoding and encoding.lower() != 'utf-8':
        try:
            content = rawdata.decode(encoding)
            with open(file_path, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
            print(f"--- [CHECK] UTF-8へ変換完了 ---")
        except:
            try:
                content = rawdata.decode('shift_jis')
                with open(file_path, 'w', encoding='utf-8', newline='') as f:
                    f.write(content)
            except:
                pass
    return file_path