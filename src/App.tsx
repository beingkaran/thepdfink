import { useState } from 'react'
import type { Tool } from './data/tools'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { ToolGrid } from './components/ToolGrid'
import { ToolPanel } from './components/ToolPanel'
import { UpgradePanel } from './components/UpgradePanel'
import { BatchPanel } from './components/BatchPanel'
import { OcrPanel } from './components/OcrPanel'
import { SummarizePanel } from './components/SummarizePanel'
import { Pricing } from './components/Pricing'
import { Footer } from './components/Footer'
import { isTauri } from './lib/platform'

function App() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const native = isTauri()

  function renderActiveTool(tool: Tool) {
    const close = () => setActiveTool(null)
    switch (tool.id) {
      case 'batch':
        return <BatchPanel tool={tool} onClose={close} />
      case 'ocr':
        return <OcrPanel tool={tool} onClose={close} />
      case 'ai-summarize':
        return <SummarizePanel tool={tool} onClose={close} />
      default:
        // Roadmap Pro tools (e.g. Ask AI) show the upgrade prompt.
        return tool.pro ? (
          <UpgradePanel tool={tool} onClose={close} />
        ) : (
          <ToolPanel tool={tool} onClose={close} />
        )
    }
  }

  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <ToolGrid onSelect={setActiveTool} />
        {!native && <Pricing />}
      </main>
      <Footer />
      {activeTool && renderActiveTool(activeTool)}
    </div>
  )
}

export default App
