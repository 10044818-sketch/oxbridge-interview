import { useRef, useState, useEffect, useCallback } from 'react'
import { requestFeedback } from '../utils/api'
import type { UserInfo, SessionInfo } from '../App'

type Tool = 'pen' | 'eraser' | 'circle' | 'rect' | 'arrow'

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  size: number
  tool: Tool
}

interface Props {
  session: SessionInfo
  user: UserInfo
  onViewReport: (session: SessionInfo) => void
}

export default function TrainingBoard({ session, user, onViewReport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#1a1a2e')
  const [size, setSize] = useState(3)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [feedback, setFeedback] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showQuestion, setShowQuestion] = useState(true)
  const isDrawing = useRef(false)

  const colors = ['#1a1a2e', '#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']

  const getCanvasPos = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const drawStroke = (s: Stroke) => {
      ctx.beginPath()
      ctx.strokeStyle = s.tool === 'eraser' ? '#ffffff' : s.color
      ctx.lineWidth = s.size
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (s.tool === 'circle' && s.points.length >= 2) {
        const cx = (s.points[0].x + s.points[s.points.length - 1].x) / 2
        const cy = (s.points[0].y + s.points[s.points.length - 1].y) / 2
        const rx = Math.abs(s.points[s.points.length - 1].x - s.points[0].x) / 2
        const ry = Math.abs(s.points[s.points.length - 1].y - s.points[0].y) / 2
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(rx ? 1 : 0, ry ? 1 : 0)
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.restore()
        ctx.stroke()
      } else if (s.tool === 'rect' && s.points.length >= 2) {
        const x1 = s.points[0].x
        const y1 = s.points[0].y
        const x2 = s.points[s.points.length - 1].x
        const y2 = s.points[s.points.length - 1].y
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1))
      } else if (s.tool === 'arrow' && s.points.length >= 2) {
        const from = s.points[0]
        const to = s.points[s.points.length - 1]
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.stroke()
        const angle = Math.atan2(to.y - from.y, to.x - from.x)
        const headLen = 12
        ctx.beginPath()
        ctx.moveTo(to.x, to.y)
        ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6))
        ctx.closePath()
        ctx.fillStyle = s.color
        ctx.fill()
      } else {
        ctx.moveTo(s.points[0].x, s.points[0].y)
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y)
        }
        ctx.stroke()
      }
    }

    strokes.forEach(drawStroke)
    if (currentStroke) drawStroke(currentStroke)
  }, [strokes, currentStroke])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
      redraw()
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redraw])

  useEffect(() => {
    redraw()
  }, [redraw])

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    isDrawing.current = true
    const pos = getCanvasPos(e)
    setCurrentStroke({ points: [pos], color: tool === 'eraser' ? '#ffffff' : color, size: tool === 'eraser' ? 20 : size, tool })
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || !currentStroke) return
    e.preventDefault()
    const pos = getCanvasPos(e)
    setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null)
  }

  const handlePointerUp = () => {
    if (!isDrawing.current || !currentStroke) return
    isDrawing.current = false
    setStrokes(prev => [...prev, currentStroke])
    setCurrentStroke(null)
  }

  const handleClear = () => {
    setStrokes([])
    setCurrentStroke(null)
    setFeedback('')
  }

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1))
  }

  const handleGetFeedback = async () => {
    setFeedbackLoading(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const dataUrl = canvas.toDataURL('image/png')
      const result = await requestFeedback(session.id, dataUrl)
      setFeedback(result.feedback)
    } catch (err) {
      setFeedback('获取反馈失败，请重试')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const handleViewReport = () => {
    onViewReport(session)
  }

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {showQuestion && (
        <div style={{ width: 260, borderRight: '0.5px solid var(--border-primary)', padding: '1rem', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>📋 题目</h3>
            <button className="btn" onClick={() => setShowQuestion(false)} style={{ fontSize: 12 }}>✕ 收起</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', flex: 1, overflow: 'auto' }}>
            {session.question}
          </div>
          <div style={{ marginTop: 12 }}>
            <span className={`badge ${session.subject === 'math' ? 'badge-info' : 'badge-success'}`}>
              {session.subject === 'math' ? '数学' : '物理'}
            </span>
            <span className="badge badge-info" style={{ marginLeft: 8 }}>
              {session.mode === 'training' ? '思维训练' : '模拟面试'}
            </span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {!showQuestion && (
          <button className="btn" onClick={() => setShowQuestion(true)} style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, fontSize: 12 }}>
            📋 显示题目
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', borderBottom: '0.5px solid var(--border-primary)' }}>
          <button className={`btn ${tool === 'pen' ? 'btn-primary' : ''}`} onClick={() => setTool('pen')} style={{ fontSize: 13 }}>🖊️ 画笔</button>
          <button className={`btn ${tool === 'eraser' ? 'btn-primary' : ''}`} onClick={() => setTool('eraser')} style={{ fontSize: 13 }}>🧹 橡皮</button>
          <button className={`btn ${tool === 'circle' ? 'btn-primary' : ''}`} onClick={() => setTool('circle')} style={{ fontSize: 13 }}>◯ 圆形</button>
          <button className={`btn ${tool === 'rect' ? 'btn-primary' : ''}`} onClick={() => setTool('rect')} style={{ fontSize: 13 }}>▭ 矩形</button>
          <button className={`btn ${tool === 'arrow' ? 'btn-primary' : ''}`} onClick={() => setTool('arrow')} style={{ fontSize: 13 }}>→ 箭头</button>
          <div style={{ width: 1, height: 24, background: 'var(--border-primary)' }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 22, height: 22, borderRadius: 4, border: `2px solid ${color === c ? 'var(--text-primary)' : 'transparent'}`, background: c, cursor: 'pointer',
              }} />
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border-primary)' }} />
          <input type="range" min={1} max={12} value={size} onChange={e => setSize(Number(e.target.value))}
            style={{ width: 80 }} title={`笔刷大小: ${size}`} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{size}px</span>
          <div style={{ width: 1, height: 24, background: 'var(--border-primary)' }} />
          <button className="btn" onClick={handleUndo} style={{ fontSize: 13 }}>↩ 撤销</button>
          <button className="btn btn-danger" onClick={handleClear} style={{ fontSize: 13 }}>⌫ 清除</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={handleGetFeedback} disabled={feedbackLoading} style={{ fontSize: 13 }}>
            {feedbackLoading ? '分析中...' : '👁️ Doc Atlas 评估'}
          </button>
          <button className="btn" onClick={handleViewReport} style={{ fontSize: 13 }}>📊 报告</button>
        </div>

        <div style={{ flex: 1, position: 'relative', background: '#fff', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, cursor: tool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none', background: '#fff' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          />
        </div>
      </div>

      <div style={{ width: 280, borderLeft: '0.5px solid var(--border-primary)', padding: '1rem', background: 'var(--bg-secondary)', overflow: 'auto' }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>👁️ Doc Atlas 评估</h3>
        {feedback ? (
          <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {feedback}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            <p>Doc Atlas 正在看着你的解题过程...</p>
            <p style={{ marginTop: 8 }}>点击上方 <strong>"Doc Atlas 评估"</strong> 按钮获取AI实时反馈。</p>
          </div>
        )}
      </div>
    </div>
  )
}
