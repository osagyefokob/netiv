import { useState } from 'react'
import { MessageSquare, X, Send, Loader2 } from 'lucide-react'

const RAG_API = import.meta.env.VITE_RAG_API_URL || '/api/v1/rag'

const WAITLIST_KEY = 'netiv-ai-waitlist-email'

export default function RAGChatbotPlaceholder() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I can help you with questions about your inventory, orders, warehouses, and operations. What would you like to know?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const userMsg = input.trim()
    if (!userMsg || loading) return

    setInput('')
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const userRole = localStorage.getItem('user_role') || 'COMPANY_ADMIN'
      const warehouseId = localStorage.getItem('warehouse_id') || null

      const res = await fetch(`${RAG_API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole,
          ...(warehouseId && { 'X-Warehouse-Id': warehouseId }),
        },
        body: JSON.stringify({
          message: userMsg,
          conversation_history: messages.slice(-8),
        }),
      })

      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.message || data.answer || 'I processed your request.' }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="pointer-events-auto mb-3 flex h-[min(70vh,500px)] w-[min(100vw-2rem,380px)] flex-col rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-navy dark:text-white">Netiv AI</span>
              <span className="rounded bg-brand-blue-light px-1.5 py-0.5 text-[10px] font-medium text-brand-blue">Live</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-blue text-white' 
                    : 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3 dark:border-gray-700">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your operations..."
              disabled={loading}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 rounded-lg bg-brand-blue px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
      <div className="pointer-events-auto relative">
        <span className="absolute -inset-1 animate-ping rounded-full bg-brand-blue/25" aria-hidden />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="AI Assistant"
          className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand-blue text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
        >
          <MessageSquare className="h-[22px] w-[22px]" />
        </button>
      </div>
    </div>
  )
}