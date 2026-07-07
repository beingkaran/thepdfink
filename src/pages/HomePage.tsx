import { useNavigate } from 'react-router-dom'
import type { Tool } from '../data/tools'
import { Hero } from '../components/Hero'
import { ToolGrid } from '../components/ToolGrid'
import { Pricing } from '../components/Pricing'
import { LocalProcessingBadge } from '../components/LocalProcessingBadge'

interface Props {
  fullAccess: boolean
  native: boolean
  onUnlockPro: () => void
}

/** Landing page: hero, the "runs locally" reassurance, the tool grid, pricing. */
export function HomePage({ fullAccess, native, onUnlockPro }: Props) {
  const navigate = useNavigate()
  const openTool = (tool: Tool) => navigate(`/tools/${tool.id}`)

  return (
    <main>
      <Hero isPro={fullAccess} />
      <div className="local-badge-wrap">
        <LocalProcessingBadge />
      </div>
      <ToolGrid onSelect={openTool} fullAccess={fullAccess} />
      {!native && !fullAccess && <Pricing onUnlockPro={onUnlockPro} />}
    </main>
  )
}
