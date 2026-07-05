import { useEffect, useState } from 'react'
import { readFormFields, type FormFieldInfo } from '../lib/pdf-forms'

interface FormFillerProps {
  file: File
  values: Record<string, string | boolean>
  onValuesChange: (values: Record<string, string | boolean>) => void
}

export function FormFiller({ file, values, onValuesChange }: FormFillerProps) {
  const [fields, setFields] = useState<FormFieldInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    readFormFields(file)
      .then((result) => {
        setFields(result.filter((f) => f.type !== 'unknown' && f.type !== 'button'))
        const initial: Record<string, string | boolean> = {}
        for (const field of result) {
          if (field.type === 'checkbox') {
            initial[field.name] = field.checked ?? false
          } else {
            initial[field.name] = field.value
          }
        }
        onValuesChange(initial)
      })
      .catch(() => setError('Could not read form fields from this PDF.'))
      .finally(() => setLoading(false))
  }, [file, onValuesChange])

  if (loading) return <p className="form-status">Loading form fields…</p>
  if (error) return <p className="feedback error">{error}</p>
  if (!fields.length)
    return (
      <p className="form-status">
        No fillable form fields found in this PDF.
      </p>
    )

  const update = (name: string, value: string | boolean) => {
    onValuesChange({ ...values, [name]: value })
  }

  return (
    <div className="form-filler">
      <p className="form-count">{fields.length} fillable field(s) detected</p>
      {fields.map((field) => (
        <div key={field.name} className="form-field">
          <label className="field">
            <span>{field.name}</span>
            {field.type === 'text' && (
              <input
                type="text"
                value={(values[field.name] as string) ?? ''}
                onChange={(e) => update(field.name, e.target.value)}
              />
            )}
            {field.type === 'checkbox' && (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => update(field.name, e.target.checked)}
                />
                Checked
              </label>
            )}
            {field.type === 'dropdown' && field.options && (
              <select
                value={(values[field.name] as string) ?? ''}
                onChange={(e) => update(field.name, e.target.value)}
              >
                <option value="">— Select —</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {field.type === 'radio' && field.options && (
              <div className="radio-group">
                {field.options.map((opt) => (
                  <label key={opt} className="radio-label">
                    <input
                      type="radio"
                      name={field.name}
                      value={opt}
                      checked={values[field.name] === opt}
                      onChange={() => update(field.name, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </label>
        </div>
      ))}
    </div>
  )
}