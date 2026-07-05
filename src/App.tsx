import { useEffect, useState } from 'react'
import { tools, type Tool } from './data/tools'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { ToolGrid } from './components/ToolGrid'
import { ToolPanel } from './components/ToolPanel'
import { UpgradePanel } from './components/UpgradePanel'
import { BatchPanel } from './components/BatchPanel'
import { OcrPanel } from './components/OcrPanel'
import { SummarizePanel } from './components/SummarizePanel'
import { ScanPanel } from './components/ScanPanel'
import { EditPanel } from './components/EditPanel'
import { FormBuilderPanel } from './components/FormBuilderPanel'
import { AskPanel } from './components/AskPanel'
import { Downloads } from './components/Downloads'
import { Pricing } from './components/Pricing'
import { Footer } from './components/Footer'
import { AdminLogin } from './components/AdminLogin'
import { isTauri } from './lib/platform'
import { useEntitlement, logoutAdmin } from './lib/entitlement'

function App() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const native = isTauri()
  const { fullAccess, admin } = useEntitlement()

  // The admin login is hidden in production; reachable in dev or via ?admin.
  const adminEntry = import.meta.env.DEV || new URLSearchParams(window.location.search).has('admin')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Deep link: /?tool=<id> (used by the SEO landing pages) opens that tool directly.
    const id = params.get('tool')
    if (id) {
      const match = tools.find((t) => t.id === id)
      if (match) setActiveTool(match)
    }

    // /?admin opens the local admin sign-in (unless already signed in).
    if (params.has('admin') && !admin) setAdminOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function renderActiveTool(tool: Tool) {
    const close = () => setActiveTool(null)
    switch (tool.id) {
      case 'batch':
        return <BatchPanel tool={tool} onClose={close} />
      case 'ocr':
        return <OcrPanel tool={tool} onClose={close} />
      case 'ai-summarize':
        return <SummarizePanel tool={tool} onClose={close} />
      case 'scan':
        return <ScanPanel tool={tool} onClose={close} />
      case 'edit':
        return <EditPanel tool={tool} onClose={close} />
      case 'form-builder':
        return <FormBuilderPanel tool={tool} onClose={close} />
      case 'ai-ask':
        return <AskPanel tool={tool} onClose={close} />
      default:
        // Roadmap Pro tools (e.g. Ask AI) show the upgrade prompt — unless the
        // user has full access (paid native app or admin unlock).
        return tool.pro && !fullAccess ? (
          <UpgradePanel tool={tool} onClose={close} />
        ) : (
          <ToolPanel tool={tool} onClose={close} />
        )
    }
  }

  return (
    <div className="app">
      <Header
        admin={admin}
        showAdminEntry={adminEntry}
        onOpenAdmin={() => setAdminOpen(true)}
        onLogout={logoutAdmin}
      />
      <main>
        <Hero />
        <ToolGrid onSelect={setActiveTool} fullAccess={fullAccess} />
        {!native && <Downloads />}
        {!native && !fullAccess && <Pricing />}
      </main>
      <Footer />
      {activeTool && renderActiveTool(activeTool)}
      {adminOpen && (
        <AdminLogin onClose={() => setAdminOpen(false)} onSuccess={() => setAdminOpen(false)} />
      )}
    </div>
  )
}

export default App
