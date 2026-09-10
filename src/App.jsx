import { useState } from 'react'
import { ArrowUpRight, Boxes, CheckCircle2, CircleAlert, Code2, GitBranch, LoaderCircle, MessageSquareText, Search, Sparkles } from 'lucide-react'
import { analyzeRepository, chatWithRepository, ingestRepository } from './api'
import './App.css'

const starterQuestions = [
  'Explain the architecture',
  'Where is authentication implemented?',
  'How does data flow through this application?',
]

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [repository, setRepository] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAnalyze(event) {
    event.preventDefault()
    if (!repositoryUrl.trim()) return
    setLoading(true)
    setError('')
    setMessages([])
    try {
      const ingested = await ingestRepository(repositoryUrl.trim())
      setRepository(ingested)
      const repositoryAnalysis = await analyzeRepository(ingested.repository_id)
      setAnalysis(repositoryAnalysis)
    } catch (requestError) {
      setError(requestError.message)
      setRepository(null)
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleAsk(event) {
    event?.preventDefault()
    if (!repository || !question.trim() || chatLoading) return
    const currentQuestion = question.trim()
    setQuestion('')
    setMessages((current) => [...current, { role: 'user', content: currentQuestion }])
    setChatLoading(true)
    setError('')
    try {
      const response = await chatWithRepository(repository.repository_id, currentQuestion)
      setMessages((current) => [...current, { role: 'assistant', content: response.answer, sources: response.sources }])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Code2 size={18} /></span><span>RepoMind</span></div>
        <div className="topbar-note"><span className="status-dot" /> Local workspace <span className="slash">/</span> code intelligence</div>
      </header>

      {!repository ? (
        <section className="welcome-view">
          <div className="welcome-copy">
            <p className="kicker"><Sparkles size={15} /> Repository intelligence</p>
            <h1>Read the shape<br />of any codebase.</h1>
            <p className="intro">Point RepoMind at a public GitHub repository. It maps the structure, finds the important files, and gives you a grounded place to ask better questions.</p>
          </div>
          <form className="ingest-card" onSubmit={handleAnalyze}>
            <div className="card-heading"><GitBranch size={20} /><div><h2>Connect a repository</h2><p>Start with a public GitHub URL</p></div></div>
            <label htmlFor="repo-url">Repository URL</label>
            <div className="url-input"><Search size={18} /><input id="repo-url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/project" /></div>
            <button className="primary-button" type="submit" disabled={loading || !repositoryUrl.trim()}>{loading ? <><LoaderCircle className="spin" size={17} /> Mapping repository...</> : <>Analyze repository <ArrowUpRight size={17} /></>}</button>
            {error && <ErrorBanner message={error} />}
            <p className="privacy-note">Only public repositories are supported. Your code stays in the configured local workspace.</p>
          </form>
        </section>
      ) : (
        <section className="workspace">
          <aside className="sidebar">
            <div className="repo-heading"><div className="repo-icon"><GitBranch size={20} /></div><div><p className="eyebrow">Repository</p><h2>{repository.repository_name}</h2><p className="owner">{repository.owner}</p></div></div>
            <div className="ready-state"><CheckCircle2 size={16} /> Analysis ready</div>
            <div className="sidebar-section"><p className="section-label">Overview</p><Stat label="Files indexed" value={analysis?.files_indexed ?? repository.files_indexed ?? '—'} /><Stat label="Primary language" value={analysis?.primary_languages?.[0]?.language ?? '—'} /></div>
            <div className="sidebar-section"><p className="section-label">Frameworks</p><div className="tag-list">{analysis?.frameworks?.length ? analysis.frameworks.map((framework) => <span className="tag" key={framework}>{framework}</span>) : <span className="muted">None detected</span>}</div></div>
            <div className="sidebar-section"><p className="section-label">Important directories</p><div className="directory-list">{analysis?.important_directories?.length ? analysis.important_directories.map((directory) => <span key={directory}><Boxes size={14} />{directory}</span>) : <span className="muted">None detected</span>}</div></div>
            <button className="quiet-button" onClick={() => { setRepository(null); setAnalysis(null); setRepositoryUrl(''); setMessages([]) }}>Analyze another repository</button>
          </aside>
          <section className="chat-panel">
            <div className="chat-header"><div><p className="eyebrow">AI codebase chat</p><h1>Ask the repository.</h1></div><span className="model-pill">Grounded answers</span></div>
            <div className="conversation">
              {!messages.length && <div className="empty-chat"><div className="empty-icon"><MessageSquareText size={23} /></div><h2>What should we inspect?</h2><p>Questions are answered from indexed repository evidence and returned with source locations.</p><div className="question-grid">{starterQuestions.map((item) => <button key={item} onClick={() => setQuestion(item)}>{item}<ArrowUpRight size={15} /></button>)}</div></div>}
              {messages.map((message, index) => <Message key={`${message.role}-${index}`} message={message} />)}
              {chatLoading && <div className="message assistant"><div className="avatar"><Sparkles size={14} /></div><div className="typing"><span /><span /><span /></div></div>}
            </div>
            {error && <ErrorBanner message={error} />}
            <form className="composer" onSubmit={handleAsk}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the architecture, a flow, or a file..." rows="1" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleAsk(event) } }} /><button aria-label="Send question" title="Send question" type="submit" disabled={!question.trim() || chatLoading}><ArrowUpRight size={19} /></button></form>
            <p className="composer-note">RepoMind only answers from indexed repository context.</p>
          </section>
        </section>
      )}
    </main>
  )
}

function Stat({ label, value }) { return <div className="stat"><span>{label}</span><strong>{value}</strong></div> }
function Message({ message }) { return <div className={`message ${message.role}`}><div className="avatar">{message.role === 'assistant' ? <Sparkles size={14} /> : <span>Y</span>}</div><div className="message-body"><p>{message.content}</p>{message.sources?.length > 0 && <div className="sources"><span className="source-label">Sources</span>{message.sources.map((source) => <button className="source" key={`${source.file_path}-${source.start_line}`} type="button" title="Copy source reference" aria-label={`Copy ${source.file_path} lines ${source.start_line} to ${source.end_line}`} onClick={() => navigator.clipboard?.writeText(`${source.file_path}:${source.start_line}-${source.end_line}`)}><Code2 size={14} /><span>{source.file_path}</span><small>Lines {source.start_line}–{source.end_line}</small></button>)}</div>}</div></div> }
function ErrorBanner({ message }) { return <div className="error-banner"><CircleAlert size={16} />{message}</div> }

export default App
