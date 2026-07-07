import { useCallback, useEffect, useState } from 'react'
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
import { Pricing } from './components/Pricing'
import { Footer } from './components/Footer'
import { AdminLogin } from './components/AdminLogin'
import { AuthModal } from './components/AuthModal'
import { isTauri } from './lib/platform'
import { useEntitlement, logoutAdmin } from './lib/entitlement'
import { useUser, logoutUser, startProCheckout, fetchUser } from './lib/auth'

function App() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutAfterAuth, setCheckoutAfterAuth] = useState(false)
  const [checkoutState, setCheckoutState] = useState<'none' | 'pending' | 'success'>('none')
  const native = isTauri()
  const { fullAccess: localAccess, admin } = useEntitlement()
  const { user } = useUser()
  // Pro tools unlock via the account's paid pro flag (or native app / local admin).
  const fullAccess = localAccess || !!user?.pro

  // The admin login is hidden in production; reachable in dev or via ?admin.
  const adminEntry = import.meta.env.DEV || new URLSearchParams(window.location.search).has('admin')

  const beginProCheckout = useCallback(async () => {
    try {
      await startProCheckout()
    } catch (err) {
      if (err instanceof Error && err.message === 'auth-required') {
        setCheckoutAfterAuth(true)
        setAuthOpen(true)
      } else {
        window.alert(err instanceof Error ? err.message : 'Could not start checkout.')
      }
    }
  }, [])

  /** Entry point for every "Unlock Pro" button: sign in first, then pay. */
  const handleUnlockPro = useCallback(() => {
    if (user) {
      void beginProCheckout()
    } else {
      setCheckoutAfterAuth(true)
      setAuthOpen(true)
    }
  }, [user, beginProCheckout])

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

    // Back from checkout: the webhook can lag the redirect, so poll briefly
    // until the account's pro flag lands.
    if (params.get('checkout') === 'success') {
      setCheckoutState('pending')
      let tries = 0
      const poll = async () => {
        const u = await fetchUser()
        if (u?.pro) {
          setCheckoutState('success')
        } else if (++tries < 5) {
          setTimeout(() => void poll(), 1500)
        }
      }
      void poll()
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      url.searchParams.delete('test')
      window.history.replaceState({}, '', url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function renderActiveTool(tool: Tool) {
    const close = () => setActiveTool(null)
    // Every Pro tool sits behind the account paywall until the pro flag is set.
    if (tool.pro && !fullAccess) {
      return <UpgradePanel tool={tool} onClose={close} onUnlock={handleUnlockPro} />
    }
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
        return <ToolPanel tool={tool} onClose={close} />
    }
  }

  return (
    <div className="app">
      <Header
        admin={admin}
        showAdminEntry={adminEntry}
        onOpenAdmin={() => setAdminOpen(true)}
        onLogout={logoutAdmin}
        user={user}
        onSignIn={() => {
          setCheckoutAfterAuth(false)
          setAuthOpen(true)
        }}
        onSignOut={() => void logoutUser()}
      />
      {checkoutState !== 'none' && (
        <div
          className={`checkout-banner${checkoutState === 'success' ? ' is-success' : ''}`}
          role="status"
        >
          {checkoutState === 'success'
            ? '🎉 Payment received — Pro tools are unlocked on your account.'
            : 'Finalizing your payment…'}
        </div>
      )}
      <main>
        <Hero isPro={fullAccess} />
        <ToolGrid onSelect={setActiveTool} fullAccess={fullAccess} />
        {!native && !fullAccess && <Pricing onUnlockPro={handleUnlockPro} />}
      </main>
      <Footer />
      {activeTool && renderActiveTool(activeTool)}
      {adminOpen && (
        <AdminLogin onClose={() => setAdminOpen(false)} onSuccess={() => setAdminOpen(false)} />
      )}
      {authOpen && (
        <AuthModal
          reason={
            checkoutAfterAuth
              ? 'Create an account first — your Pro unlock is tied to it, on every browser.'
              : undefined
          }
          onClose={() => {
            setAuthOpen(false)
            setCheckoutAfterAuth(false)
          }}
          onSuccess={(u) => {
            setAuthOpen(false)
            if (checkoutAfterAuth) {
              setCheckoutAfterAuth(false)
              if (!u.pro) void beginProCheckout()
            }
          }}
        />
      )}
    </div>
  )
}

export default App
