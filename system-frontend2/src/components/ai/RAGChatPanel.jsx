import { useEffect, useRef, useState } from 'react'
import { RotateCcw, Send, X } from 'lucide-react'

export default function RAGChatPanel({ onClose }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const streamRef = useRef('')
  const listRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8088/ws/chat')
    wsRef.current = ws
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'auth',
          token: '',
          userId: 'local-dev',
          role: 'ADMIN',
          warehouseId: null,
        })
      )
    }
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'connected') {
        setConnected(true)
      } else if (data.type === 'thinking') {
        setLoading(true)
        streamRef.current = ''
        setMessages((prev) => [...prev, { role: 'assistant', content: '', isStreaming: true }])
      } else if (data.type === 'token') {
        streamRef.current += data.content
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.isStreaming ? { ...m, content: streamRef.current } : m
          )
        )
      } else if (data.type === 'done') {
        setLoading(false)
        setMessages((prev) =>
          prev.map((m, i) => (i === prev.length - 1 ? { ...m, isStreaming: false } : m))
        )
      } else if (data.type === 'error') {
        setLoading(false)
        setError(data.content || 'RAG error')
      }
    }
    ws.onerror = () => setError('WebSocket connection failed')
    ws.onclose = () => setConnected(false)
    return () => ws.close()
  }, [])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, loading])

  const submit = async (e) => {
    e.preventDefault()
    const q = question.trim()
    if (!q || loading || !wsRef.current || wsRef.current.readyState !== 1) return
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    wsRef.current.send(JSON.stringify({ type: 'query', content: q }))
    setQuestion('')
  }

  const clearHistory = () => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'clear' }))
    }
    setMessages([])
    setError('')
  }

  return (
    <div className="pointer-events-auto mb-3 flex h-[520px] w-[min(100vw-2rem,380px)] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between rounded-t-2xl bg-[#0A1628] px-4 py-3">
        <div className="text-sm font-semibold text-white">
          Netiv AI <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">beta</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={clearHistory} className="rounded p-1 text-white/70 hover:bg-white/10" aria-label="Clear history">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-white/70 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-xs text-slate-500">
            Ask: "Which products are low in stock?", "Show me today's order activity", or "Are any deliveries overdue?"
          </p>
        )}
        {messages.map((m, idx) => (
          <div key={`${m.role}-${idx}`} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={
                m.role === 'user'
                  ? 'inline-block max-w-[80%] rounded-2xl rounded-tr-sm bg-[#2D5BE3] px-3 py-2 text-sm text-white'
                  : 'inline-block max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2 text-sm text-slate-900 dark:bg-gray-800 dark:text-slate-100'
              }
            >
              {m.content || (m.isStreaming ? '...' : '')}
            </span>
          </div>
        ))}
        {loading && <p className="text-xs text-slate-400">Netiv AI is thinking...</p>}
      </div>

      <div className="border-t border-slate-100 px-3 py-3 dark:border-gray-800">
        <div className="mb-1 text-[11px] text-slate-400">
          {connected ? 'Connected to ws://localhost:8088/ws/chat' : 'Connecting...'}
        </div>
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <form onSubmit={submit} className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about operations..."
            rows={2}
            className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={!connected || loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-2 text-[11px] text-slate-400">Powered by Mistral-7B · Open source</p>
      </div>
    </div>
  )
}

