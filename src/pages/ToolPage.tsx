import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { tools } from '../data/tools'
import { ToolPanel } from '../components/ToolPanel'
import { UpgradePanel } from '../components/UpgradePanel'
import { BatchPanel } from '../components/BatchPanel'
import { OcrPanel } from '../components/OcrPanel'
import { SummarizePanel } from '../components/SummarizePanel'
import { ScanPanel } from '../components/ScanPanel'
import { EditPanel } from '../components/EditPanel'
import { FormBuilderPanel } from '../components/FormBuilderPanel'
import { AskPanel } from '../components/AskPanel'

interface Props {
  fullAccess: boolean
  onUnlockPro: () => void
}

/**
 * A single tool on its own route (/tools/:toolId). Unknown ids bounce home.
 * Pro tools stay behind the paywall until the account's pro flag is set.
 */
export function ToolPage({ fullAccess, onUnlockPro }: Props) {
  const { toolId } = useParams()
  const navigate = useNavigate()
  const tool = tools.find((t) => t.id === toolId)
  if (!tool) return <Navigate to="/" replace />

  const close = () => navigate('/')

  if (tool.pro && !fullAccess) {
    return <UpgradePanel tool={tool} onClose={close} onUnlock={onUnlockPro} />
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
