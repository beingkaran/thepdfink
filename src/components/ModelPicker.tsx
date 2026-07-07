import { useState } from 'react'
import { Cpu } from 'lucide-react'
import { MODELS, getSelectedModel, setSelectedModel } from '../lib/llm'

interface Props {
  /** Disable switching while a summary/answer is in progress. */
  disabled?: boolean
  /** Notified after a switch so the parent can refresh its copy. */
  onChange?: (id: string) => void
}

/**
 * Lets the user pick which in-browser model runs. Persisted across sessions.
 * Switching to a not-yet-downloaded model triggers its download on next use.
 */
export function ModelPicker({ disabled, onChange }: Props) {
  const [selected, setSelected] = useState(() => getSelectedModel().id)
  const current = MODELS.find((m) => m.id === selected) ?? MODELS[0]

  const choose = (id: string) => {
    if (id === selected) return
    setSelectedModel(id)
    setSelected(id)
    onChange?.(id)
  }

  return (
    <fieldset className="model-picker">
      <legend>
        <Cpu size={13} aria-hidden /> AI model
      </legend>
      <div className="seg-group">
        {MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`seg${selected === m.id ? ' seg-active' : ''}`}
            onClick={() => choose(m.id)}
            disabled={disabled}
            title={`${m.size} download`}
          >
            {m.label}
            <small>{m.size}</small>
          </button>
        ))}
      </div>
      <p className="model-picker-blurb">{current.blurb}</p>
    </fieldset>
  )
}
