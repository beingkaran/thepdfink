import { Lock, Check } from 'lucide-react'
import { tools, type Tool } from '../data/tools'

interface ToolGridProps {
  onSelect: (tool: Tool) => void
  /** When true, Pro tools are shown as unlocked (paid native app or admin). */
  fullAccess?: boolean
}

function ToolCard({
  tool,
  onSelect,
  fullAccess,
}: {
  tool: Tool
  onSelect: (t: Tool) => void
  fullAccess?: boolean
}) {
  const Icon = tool.icon
  const locked = tool.pro && !tool.soon && !fullAccess
  return (
    <button
      type="button"
      className={`tool-card${locked ? ' tool-card-pro' : ''}`}
      onClick={() => onSelect(tool)}
    >
      <div className="tool-card-top">
        <div className="tool-icon">
          <Icon size={22} strokeWidth={1.75} aria-hidden />
        </div>
        {tool.soon ? (
          <span className="tool-tag tool-tag-soon">Soon</span>
        ) : tool.pro && fullAccess ? (
          <span className="tool-tag tool-tag-unlocked">
            <Check size={11} aria-hidden /> Unlocked
          </span>
        ) : tool.pro ? (
          <span className="tool-tag">
            <Lock size={11} aria-hidden /> Pro
          </span>
        ) : null}
      </div>
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
    </button>
  )
}

export function ToolGrid({ onSelect, fullAccess }: ToolGridProps) {
  const freeTools = tools.filter((t) => !t.pro)
  const proTools = tools.filter((t) => t.pro)

  return (
    <section className="tools-section" id="tools">
      <div className="section-head">
        <h2>Choose a tool</h2>
        <p>Click any tool to open it. All processing happens on your device.</p>
      </div>
      <div className="tool-grid">
        {freeTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onSelect={onSelect} fullAccess={fullAccess} />
        ))}
      </div>

      <div className="section-head section-head-pro">
        <h2>
          Pro tools{' '}
          {fullAccess ? (
            <span className="pro-chip">Unlocked</span>
          ) : (
            <span className="pro-chip">$29 · lifetime</span>
          )}
        </h2>
        <p>
          {fullAccess
            ? 'Included with your access — every power tool is unlocked on this device.'
            : 'Power features for heavy documents. Included with Pro and Business.'}
        </p>
      </div>
      <div className="tool-grid">
        {proTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onSelect={onSelect} fullAccess={fullAccess} />
        ))}
      </div>
    </section>
  )
}
