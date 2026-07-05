import { Lock } from 'lucide-react'
import { tools, type Tool } from '../data/tools'

interface ToolGridProps {
  onSelect: (tool: Tool) => void
}

function ToolCard({ tool, onSelect }: { tool: Tool; onSelect: (t: Tool) => void }) {
  const Icon = tool.icon
  return (
    <button
      type="button"
      className={`tool-card${tool.pro ? ' tool-card-pro' : ''}`}
      onClick={() => onSelect(tool)}
    >
      <div className="tool-card-top">
        <div className="tool-icon">
          <Icon size={22} strokeWidth={1.75} aria-hidden />
        </div>
        {tool.pro && (
          <span className={`tool-tag${tool.soon ? ' tool-tag-soon' : ''}`}>
            {tool.soon ? 'Soon' : <><Lock size={11} aria-hidden /> Pro</>}
          </span>
        )}
      </div>
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
    </button>
  )
}

export function ToolGrid({ onSelect }: ToolGridProps) {
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
          <ToolCard key={tool.id} tool={tool} onSelect={onSelect} />
        ))}
      </div>

      <div className="section-head section-head-pro">
        <h2>
          Pro tools <span className="pro-chip">$29 · lifetime</span>
        </h2>
        <p>Power features for heavy documents. Included with Pro and Business.</p>
      </div>
      <div className="tool-grid">
        {proTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onSelect={onSelect} />
        ))}
      </div>
    </section>
  )
}
