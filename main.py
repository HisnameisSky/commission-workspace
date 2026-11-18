import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 要件定義生成用のリクエストスキーマ
class RequirementRequest(BaseModel):
    project_title: str
    raw_request: str

@app.post("/api/generate-requirements")
def generate_requirements(
    req: RequirementRequest,
    x_api_key: Optional[str] = Header(None)
):
    if not x_api_key:
        raise HTTPException(
            status_code=400,
            detail="APIキーが設定されていません。設定からGemini APIキーを入力してください。"
        )

    try:
        client = genai.Client(api_key=x_api_key)

        # Geminiにプロ仕様の要件定義を作らせるプロンプト
        prompt = f"""
あなたはプロフェッショナルなクリエイティブ・ディレクターです。
クライアントからの以下のラフな要望と案件名を元に、制作のための「プロ仕様の要件定義・見積もり構成案」を日本語のマークダウン形式で簡潔に作成してください。

【案件名】 {req.project_title}
【クライアントの要望】 {req.raw_request}

以下の項目を含めて出力してください：
1. **要件サマリー**（どのような作品・成果物を作るか）
2. **想定される制作ステップ**（ラフ、線画、着色、修正など）
3. **確認事項・質問リスト**（クライアントに確認すべきポイント2〜3個）
4. **推奨価格・納期の目安**
"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        ai_result = response.text if response.text else "要件定義を生成できませんでした。"

        return {
            "status": "success",
            "ai_requirements": ai_result.strip()
        }

    except Exception as e:
        print(f"Gemini API エラー: {e}")
        raise HTTPException(status_code=500, detail=f"APIエラー: {str(e)}")


#

# チャットメッセージの型定義
class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class CommissionChatRequest(BaseModel):
    project_title: str
    client_name: str
    raw_request: str
    ai_requirements: Optional[str] = ""
    chat_history: list[ChatMessage]
    user_message: str

@app.post("/api/chat-commission")
def chat_commission(
    req: CommissionChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    if not x_api_key:
        raise HTTPException(
            status_code=400,
            detail="APIキーが設定されていません。設定からGemini APIキーを入力してください。"
        )

    try:
        client = genai.Client(api_key=x_api_key)

        # これまでの会話履歴をテキストに整形
        history_text = "\n".join(
            [f"{'ユーザー' if m.role == 'user' else 'AI'}: {m.content}" for m in req.chat_history]
        )

        prompt = f"""
あなたはプロフェッショナルなクリエイティブ・ディレクター兼、海外・国内クライアント対応の優秀なアシスタントです。
以下の案件情報を踏まえて、ユーザーからの相談・指示に的確に答えてください。
英文メールの作成や条件交渉の文面を頼まれた場合は、そのままコピー＆ペーストして使える自然な表現を提案してください。

【案件情報】
・クライアント名: {req.client_name}
・案件名: {req.project_title}
・最初の要望: {req.raw_request}
・AI要件定義メモ: {req.ai_requirements or 'まだ作成されていません'}

【これまでの壁打ち履歴】
{history_text if history_text else '（なし）'}

【ユーザーの新しい質問・指示】
{req.user_message}
"""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )

        reply = response.text if response.text else "回答を生成できませんでした。"

        return {
            "status": "success",
            "reply": reply.strip()
        }

    except Exception as e:
        print(f"Chat API エラー: {e}")
        raise HTTPException(status_code=500, detail=f"APIエラー: {str(e)}")