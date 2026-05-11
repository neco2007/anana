import sys
import json
import urllib.request
import traceback
import platform
import logging
import os
from functools import wraps

# --- 設定 ---
# あなたのWebhook URLであることを確認してください
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1489252992766054482/xeB2AyaflO125Ao7y1pqZrwYtIAscxGuwq2SgXB4R8vRdaTGoF7vokbCInyJUgbmOQXh"
APP_VERSION = "1.0.0"

# --- ロガーの設定 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("OrderONE")

def send_to_discord(title, description, color=16711680):
    """
    Discordにリッチな埋め込み形式でメッセージを送信する
    """
    try:
        # 実行環境のOS情報を取得
        os_info = f"{platform.system()} {platform.release()} (Arch: {platform.machine()})"
        
        payload = {
            "username": "OrderONE 監視ロボ",
            "embeds": [{
                "title": title,
                "description": description,
                "color": color,
                "fields": [
                    {"name": "Version", "value": APP_VERSION, "inline": True},
                    {"name": "OS", "value": os_info, "inline": True}
                ],
                "footer": {"text": "Sent from OrderONE Client"}
            }]
        }

        # Discordからブロックされる(403 Forbidden)のを防ぐため、ブラウザのふりをするヘッダーを追加
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }

        req = urllib.request.Request(
            DISCORD_WEBHOOK_URL,
            data=json.dumps(payload).encode(),
            headers=headers,
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status
    except Exception as e:
        # 通知機能自体のエラーでアプリを止めない
        print(f"Discord通知に失敗しました: {e}")

def log_startup():
    """アプリが起動したことをDiscordに知らせる"""
    logger.info("Application starting...")
    send_to_discord("🚀 アプリが起動しました", "クライアントの環境でアプリが正常に開始されました。", color=65280)

def eel_safe(func):
    """
    Eel関数を保護するデコレータ。
    1. @wraps(func) により、元の関数名を維持し、Eelのロード待ち（ぐるぐる）を防ぎます。
    2. 関数内でエラーが起きたら、自動で詳細をDiscordに送信します。
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            err_trace = traceback.format_exc()
            logger.error(f"Function {func.__name__} failed: {e}")
            
            # DiscordのDescriptionは4096文字制限があるため、長すぎる場合は後ろから切り取る
            trace_text = err_trace if len(err_trace) < 3900 else "...\n" + err_trace[-3900:]
            
            send_to_discord(
                f"🚨 Eel関数エラー: {func.__name__}", 
                f"実行中にエラーが発生しました。\n```python\n{trace_text}\n```",
                color=16711680  # エラー時は赤色
            )
            
            # フロントエンド(JS)側にエラーを返す、もしくは再送出する
            # ※Eelの仕様に合わせて、そのままエラーを投げるか辞書で返すか選択してください
            raise e
            
    return wrapper