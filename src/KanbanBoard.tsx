import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Commission {
  id: string;
  clientName: string;
  projectTitle: string;
  rawRequest: string;
  aiRequirements?: string;
  chatHistory?: ChatMessage[];
  status: 'todo' | 'in_progress' | 'review' | 'done';
  budget: number;
  currency: 'USD' | 'JPY' | 'EUR';
  deadline: string;
}

const COLUMNS = [
  { id: 'todo', title: '📥 未着手 (To Do)', color: '#8e8e93' },
  { id: 'in_progress', title: '⚡ 進行中 (In Progress)', color: '#0071e3' },
  { id: 'review', title: '👀 確認中 (Review)', color: '#ff9f0a' },
  { id: 'done', title: '✨ 完了 (Done)', color: '#34c759' },
] as const;

export function KanbanBoard() {
  const [commissions, setCommissions] = useState<Commission[]>(() => {
    const saved = localStorage.getItem('commissions_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('保存データの読み込みに失敗しました', e);
      }
    }
    return [
      {
        id: '1',
        clientName: 'Alice (海外)',
        projectTitle: 'サイバーパンク・イラスト制作',
        rawRequest: 'ネオン街を背景にした女の子を描いてほしい。',
        status: 'todo',
        budget: 200,
        currency: 'USD',
        deadline: '2026-11-30',
        chatHistory: [],
      }
    ];
  });

  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [usdToJpyRate, setUsdToJpyRate] = useState<number>(150);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [rawRequest, setRawRequest] = useState('');
  const [budget, setBudget] = useState<number>(100);
  const [currency, setCurrency] = useState<'USD' | 'JPY' | 'EUR'>('USD');
  const [deadline, setDeadline] = useState('2026-12-31');

  useEffect(() => {
    localStorage.setItem('gemini_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('commissions_data', JSON.stringify(commissions));
  }, [commissions]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(commissions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `commission_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = event => {
        try {
          const parsedData = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsedData)) {
            if (window.confirm(`インポートを実行しますか？（現在のデータ ${commissions.length} 件が置き換わります）`)) {
              setCommissions(parsedData);
              alert('データを正常にインポートしました！✨');
            }
          } else {
            alert('無効なファイル形式です。');
          }
        } catch (error) {
          console.error(error);
          alert('JSONファイルの解析に失敗しました。');
        }
      };
    }
    e.target.value = '';
  };

  const handleMoveStatus = (id: string, direction: 'next' | 'prev') => {
    const statusOrder: Commission['status'][] = ['todo', 'in_progress', 'review', 'done'];
    setCommissions(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const currentIndex = statusOrder.indexOf(item.status);
        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < statusOrder.length) {
          return { ...item, status: statusOrder[nextIndex] };
        }
        return item;
      })
    );
  };

  const handleAddCommission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !projectTitle) return;

    const newItem: Commission = {
      id: Date.now().toString(),
      clientName,
      projectTitle,
      rawRequest,
      status: 'todo',
      budget: budget || 0,
      currency,
      deadline,
      chatHistory: [],
    };

    setCommissions([newItem, ...commissions]);
    setClientName('');
    setProjectTitle('');
    setRawRequest('');
    setBudget(100);
  };

  const calculateJpyEquivalent = (amount: number, curr: string) => {
    if (curr === 'JPY') return amount;
    if (curr === 'USD') return Math.round(amount * usdToJpyRate);
    if (curr === 'EUR') return Math.round(amount * (usdToJpyRate * 1.1));
    return amount;
  };

  const summaryStats = useMemo(() => {
    let totalJpy = 0;
    let doneJpy = 0;
    let activeJpy = 0;
    let activeCount = 0;
    let doneCount = 0;
    const monthlyMap: Record<string, number> = {};

    commissions.forEach(item => {
      const jpy = calculateJpyEquivalent(item.budget, item.currency);
      totalJpy += jpy;

      if (item.status === 'done') {
        doneJpy += jpy;
        doneCount += 1;
      } else if (item.status === 'in_progress' || item.status === 'review') {
        activeJpy += jpy;
        activeCount += 1;
      }

      const monthKey = item.deadline ? item.deadline.slice(0, 7) : '未定';
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + jpy;
    });

    const sortedMonths = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b));
    const completionRate = totalJpy > 0 ? Math.round((doneJpy / totalJpy) * 100) : 0;

    return {
      totalJpy,
      doneJpy,
      activeJpy,
      activeCount,
      doneCount,
      totalCount: commissions.length,
      completionRate,
      sortedMonths,
    };
  }, [commissions, usdToJpyRate]);

  // 【直接通信】Gemini API (要件定義生成)
  const handleGenerateAI = async (id: string, projectTitle: string, rawRequest: string) => {
    if (!apiKey.trim()) {
      alert('Gemini APIキーが設定されていません。');
      setShowSettings(true);
      return;
    }

    setLoadingId(id);
    try {
      const prompt = `
以下のイラスト・デザイン制作の依頼内容から、プロフェッショナルな「要件定義メモ」を日本語で作成してください。
構成案：1. 制作目的・イメージ 2. 画面構成/構図の方向性 3. 納品形式・注意事項の提案

【案件名】 ${projectTitle}
【クライアントの要望】 ${rawRequest}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '要件を生成できませんでした。';
        setCommissions(prev =>
          prev.map(item => item.id === id ? { ...item, aiRequirements: text.trim() } : item)
        );
      } else {
        const err = await response.json();
        alert(`Gemini APIエラー: ${err.error?.message || '通信に失敗しました'}`);
      }
    } catch (error) {
      console.error('通信エラー:', error);
      alert('Gemini APIへの接続に失敗しました。');
    } finally {
      setLoadingId(null);
    }
  };

  // 【直接通信】Gemini API (カード詳細チャット壁打ち)
  const handleSendChat = async (customMessage?: string) => {
    const messageToSend = customMessage ?? chatInput;
    if (!messageToSend.trim() || !selectedCardId) return;

    if (!apiKey.trim()) {
      alert('Gemini APIキーが設定されていません。');
      setShowSettings(true);
      return;
    }

    const targetCard = commissions.find(c => c.id === selectedCardId);
    if (!targetCard) return;

    const currentHistory = targetCard.chatHistory || [];
    const updatedHistoryWithUser: ChatMessage[] = [
      ...currentHistory,
      { role: 'user', content: messageToSend }
    ];

    setCommissions(prev =>
      prev.map(item => item.id === selectedCardId ? { ...item, chatHistory: updatedHistoryWithUser } : item)
    );
    if (!customMessage) setChatInput('');
    setIsChatLoading(true);

    try {
      const historyText = currentHistory.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n');
      const prompt = `
あなたはプロフェッショナルなクリエイティブ・ディレクター兼、クライアント対応のアシスタントです。以下の案件情報を踏まえて回答してください。英文メールや交渉文面はそのままコピーして使えるように書いてください。

【案件情報】
・クライアント: ${targetCard.clientName}
・案件名: ${targetCard.projectTitle}
・要望: ${targetCard.rawRequest}
・AI要件定義: ${targetCard.aiRequirements || 'なし'}

【会話履歴】
${historyText}

【ユーザーからの相談】
${messageToSend}
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '回答を生成できませんでした。';
        setCommissions(prev =>
          prev.map(item =>
            item.id === selectedCardId
              ? {
                  ...item,
                  chatHistory: [...updatedHistoryWithUser, { role: 'assistant', content: reply.trim() }]
                }
              : item
          )
        );
      } else {
        const err = await response.json();
        alert(`Gemini APIエラー: ${err.error?.message || '応答の取得に失敗しました'}`);
      }
    } catch (error) {
      console.error('チャット通信エラー:', error);
      alert('通信エラーが発生しました。');
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (selectedCardId === id) setSelectedCardId(null);
    setCommissions(commissions.filter(item => item.id !== id));
  };

  const selectedCard = commissions.find(c => c.id === selectedCardId) || null;

  return (
    <div style={{ padding: '30px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', background: '#faf9f6', minHeight: '100vh' }}>
      
      {/* ヘッダー ＆ 設定 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#1d1d1f', margin: 0, fontWeight: '600' }}>🎨 コミッション・スマートワークスペース</h2>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #d2d2d7', fontSize: '12px' }}>
            <span>USD/JPYレート: </span>
            <input 
              type="number" 
              value={usdToJpyRate} 
              onChange={e => setUsdToJpyRate(Number(e.target.value))} 
              style={{ width: '50px', border: 'none', fontWeight: 'bold', outline: 'none' }}
            />
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{ background: '#e5e5ea', color: '#1d1d1f', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
          >
            {showSettings ? '⚙️ 設定を閉じる' : '⚙️ 設定・データ管理'}
          </button>
        </div>
      </div>

      {/* 設定・データ管理パネル */}
      {showSettings && (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #d2d2d7', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Gemini API キー (LocalStorage保存)</label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              style={{ width: '100%', padding: '8px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d2d2d7', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ borderTop: '1px solid #e5e5ea', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>📦 データバックアップ (JSON)</div>
              <div style={{ fontSize: '11px', color: '#8e8e93' }}>現在のすべての案件・チャット履歴をファイルとして保存・復元できます。</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportJSON}
                style={{ background: '#34c759', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              >
                📥 データをエクスポート
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportJSON} 
                accept=".json" 
                style={{ display: 'none' }} 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ background: '#e5e5ea', color: '#1d1d1f', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
              >
                📤 データをインポート
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📊 売上ダッシュボード ＆ 収益サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '25px' }}>
        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '600', marginBottom: '4px' }}>💰 総売上見込み (全 {summaryStats.totalCount} 件)</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d1d1f' }}>¥{summaryStats.totalJpy.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '4px' }}>※現在レート (1$={usdToJpyRate}円) で自動換算</div>
        </div>

        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', color: '#34c759', fontWeight: '600' }}>✨ 確定収益 (完了 {summaryStats.doneCount} 件)</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#34c759' }}>{summaryStats.completionRate}%</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d1d1f' }}>¥{summaryStats.doneJpy.toLocaleString()}</div>
          <div style={{ width: '100%', height: '6px', background: '#f2f2f7', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${summaryStats.completionRate}%`, height: '100%', background: '#34c759', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', color: '#0071e3', fontWeight: '600', marginBottom: '4px' }}>⚡ 進行中・確認中 ({summaryStats.activeCount} 件)</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d1d1f' }}>¥{summaryStats.activeJpy.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '4px' }}>作業中の案件の合計金額</div>
        </div>

        <div style={{ background: '#fff', padding: '18px', borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', color: '#1d1d1f', fontWeight: '600', marginBottom: '8px' }}>📅 納期月別 サマリー</div>
          {summaryStats.sortedMonths.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#8e8e93' }}>データなし</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '75px', overflowY: 'auto' }}>
              {summaryStats.sortedMonths.map(([month, amount]) => (
                <div key={month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px dashed #f2f2f7', paddingBottom: '2px' }}>
                  <span style={{ color: '#3a3a3c', fontWeight: '500' }}>{month}</span>
                  <span style={{ fontWeight: '600', color: '#0071e3' }}>¥{amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 新規追加フォーム */}
      <form onSubmit={handleAddCommission} style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #e5e5ea', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text" placeholder="クライアント名" value={clientName} onChange={e => setClientName(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7', flex: 1, minWidth: '120px' }} 
        />
        <input 
          type="text" placeholder="案件名" value={projectTitle} onChange={e => setProjectTitle(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7', flex: 1, minWidth: '140px' }} 
        />
        <input 
          type="text" placeholder="ラフな要望" value={rawRequest} onChange={e => setRawRequest(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7', flex: 2, minWidth: '200px' }} 
        />
        <input 
          type="number" placeholder="金額" value={budget} onChange={e => setBudget(Number(e.target.value))}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7', width: '80px' }} 
        />
        <select 
          value={currency} onChange={e => setCurrency(e.target.value as any)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7', background: '#fff' }}
        >
          <option value="USD">USD ($)</option>
          <option value="JPY">JPY (¥)</option>
          <option value="EUR">EUR (€)</option>
        </select>
        <input 
          type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d2d2d7' }}
        />
        <button type="submit" style={{ background: '#0071e3', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
          ＋ 依頼を追加
        </button>
      </form>

      {/* カンバンボード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', alignItems: 'start' }}>
        {COLUMNS.map(col => {
          const columnItems = commissions.filter(item => item.status === col.id);

          return (
            <div key={col.id} style={{ background: '#f2f2f7', borderRadius: '12px', padding: '16px', minHeight: '500px', border: '1px solid #e5e5ea' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: col.color, fontSize: '14px', fontWeight: '600' }}>{col.title}</h4>
                <span style={{ background: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', color: '#8e8e93', fontWeight: 'bold' }}>
                  {columnItems.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {columnItems.map(item => {
                  const jpyValue = calculateJpyEquivalent(item.budget, item.currency);

                  return (
                    <div key={item.id} style={{ background: '#fff', padding: '16px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', border: '1px solid #e5e5ea' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#0071e3', fontWeight: '600' }}>{item.clientName}</span>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', fontSize: '11px' }}>削除</button>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f', marginBottom: '6px' }}>{item.projectTitle}</div>
                      
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
                        <span style={{ background: '#f2f1f6', padding: '2px 6px', borderRadius: '4px', color: '#3a3a3c', fontWeight: '500' }}>
                          📅 納期: {item.deadline}
                        </span>
                        <span style={{ background: '#e8f0fe', padding: '2px 6px', borderRadius: '4px', color: '#0071e3', fontWeight: '600' }}>
                          💰 {item.budget} {item.currency} (≈ ¥{jpyValue.toLocaleString()})
                        </span>
                      </div>

                      <p style={{ fontSize: '13px', color: '#3a3a3c', margin: '0 0 10px 0', lineHeight: '1.4', background: '#faf9f6', padding: '8px', borderRadius: '6px' }}>
                        💬 「{item.rawRequest}」
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                        {item.aiRequirements ? (
                          <div style={{ background: '#eef4fd', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#1d1d1f', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                            <strong style={{ color: '#0071e3' }}>✨ AI要件定義:</strong>
                            <div style={{ marginTop: '4px' }}>{item.aiRequirements}</div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGenerateAI(item.id, item.projectTitle, item.rawRequest)}
                            disabled={loadingId === item.id}
                            style={{ width: '100%', background: loadingId === item.id ? '#8e8e93' : '#34c759', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                          >
                            {loadingId === item.id ? 'AIが要件定義を作成中...' : '✨ AI要件定義を作成'}
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedCardId(item.id)}
                          style={{ width: '100%', background: '#f2f2f7', color: '#1d1d1f', border: '1px solid #d2d2d7', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          💬 詳細・AI壁打ちチャット {(item.chatHistory && item.chatHistory.length > 0) ? `(${item.chatHistory.length})` : ''}
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid #f2f2f7', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {col.id !== 'todo' && (
                            <button onClick={() => handleMoveStatus(item.id, 'prev')} style={{ background: '#e5e5ea', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>◀</button>
                          )}
                          {col.id !== 'done' && (
                            <button onClick={() => handleMoveStatus(item.id, 'next')} style={{ background: '#0071e3', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>▶</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* カード詳細 ＆ AI壁打ちチャットモーダル */}
      {selectedCard && (
        <div
          onClick={() => setSelectedCardId(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', width: '100%', maxWidth: '820px', maxHeight: '88vh',
              borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
          >
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e5e5ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf9f6' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#0071e3', fontWeight: '700' }}>{selectedCard.clientName}</span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#1d1d1f' }}>{selectedCard.projectTitle}</h3>
              </div>
              <button
                onClick={() => setSelectedCardId(null)}
                style={{ background: '#e5e5ea', border: 'none', width: '30px', height: '30px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold', color: '#3a3a3c' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', borderRight: '1px solid #e5e5ea', overflowY: 'auto', background: '#faf9f6' }}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#8e8e93', fontWeight: '600', marginBottom: '4px' }}>💰 予算・納期</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>
                    {selectedCard.budget} {selectedCard.currency} (≈ ¥{calculateJpyEquivalent(selectedCard.budget, selectedCard.currency).toLocaleString()}) / 納期: {selectedCard.deadline}
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#8e8e93', fontWeight: '600', marginBottom: '4px' }}>💬 クライアントの最初の要望</div>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e5e5ea', fontSize: '13px', lineHeight: '1.5' }}>
                    {selectedCard.rawRequest}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#0071e3', fontWeight: '600', marginBottom: '4px' }}>✨ AI要件定義メモ</div>
                  {selectedCard.aiRequirements ? (
                    <div style={{ background: '#eef4fd', padding: '12px', borderRadius: '8px', fontSize: '12px', whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#1d1d1f' }}>
                      {selectedCard.aiRequirements}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#8e8e93' }}>まだ要件定義が生成されていません。</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#fff' }}>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(!selectedCard.chatHistory || selectedCard.chatHistory.length === 0) && (
                    <div style={{ textAlign: 'center', color: '#8e8e93', fontSize: '12px', marginTop: '30px', lineHeight: '1.6' }}>
                      この案件についてAIと壁打ちができます！<br />
                      下のクイックボタンや自由入力から相談してみてください。
                    </div>
                  )}

                  {selectedCard.chatHistory?.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.role === 'user' ? '#0071e3' : '#f2f2f7',
                        color: msg.role === 'user' ? '#fff' : '#1d1d1f',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        maxWidth: '85%',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {msg.content}
                    </div>
                  ))}

                  {isChatLoading && (
                    <div style={{ alignSelf: 'flex-start', background: '#f2f2f7', color: '#8e8e93', padding: '8px 12px', borderRadius: '12px', fontSize: '12px' }}>
                      AIが回答を作成中...
                    </div>
                  )}
                </div>

                <div style={{ padding: '8px 12px', borderTop: '1px solid #f2f2f7', display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#faf9f6' }}>
                  <button
                    onClick={() => handleSendChat('この案件の依頼を受ける際の、海外クライアント向けの丁寧な英文メール返信案を作成してください。')}
                    disabled={isChatLoading}
                    style={{ fontSize: '11px', background: '#fff', border: '1px solid #d2d2d7', borderRadius: '12px', padding: '4px 10px', cursor: 'pointer', color: '#1d1d1f' }}
                  >
                    ✉️ 英文返信メール作成
                  </button>
                  <button
                    onClick={() => handleSendChat('制作を始める前にクライアントへ確認すべき質問事項を3つ箇条書き（日本語と英語併記）で作ってください。')}
                    disabled={isChatLoading}
                    style={{ fontSize: '11px', background: '#fff', border: '1px solid #d2d2d7', borderRadius: '12px', padding: '4px 10px', cursor: 'pointer', color: '#1d1d1f' }}
                  >
                    ❓ 確認質問リスト作成
                  </button>
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendChat();
                  }}
                  style={{ padding: '12px', borderTop: '1px solid #e5e5ea', display: 'flex', gap: '8px' }}
                >
                  <input
                    type="text"
                    placeholder="AIに相談・文面作成を依頼..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #d2d2d7', fontSize: '13px', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    style={{ background: '#0071e3', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    送信
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}