import { useEffect, useState } from 'react'
import type { CredentialPort } from '../../app/ports'
import type {
  AiCapability,
  CredentialSummaries,
  CredentialSummary,
} from './types'
import {
  credentialPreset,
  providerPresetsFor,
} from './providerPresets'
import './CredentialCenter.css'

type CredentialView =
  | { kind: 'list' }
  | { kind: 'edit'; capability: AiCapability }

const EMPTY_SUMMARIES: CredentialSummaries = {
  assistant: {
    capability: 'assistant',
    status: 'not_configured',
    providerId: '',
    providerLabel: '',
    modelId: '',
  },
  'recipe-illustration': {
    capability: 'recipe-illustration',
    status: 'not_configured',
    providerId: '',
    providerLabel: '',
    modelId: '',
  },
  'speech-recognition': {
    capability: 'speech-recognition',
    status: 'not_configured',
    providerId: '',
    providerLabel: '',
    modelId: '',
  },
}

const CAPABILITY_COPY: Record<
  AiCapability,
  { title: string; description: string }
> = {
  assistant: {
    title: '智能助手',
    description: '食谱推荐与问答',
  },
  'speech-recognition': {
    title: '语音识别',
    description: '把语音输入转成文字',
  },
  'recipe-illustration': {
    title: '食谱插画',
    description: '生成四种插画风格',
  },
}

function statusLabel(summary: CredentialSummary): string {
  if (summary.status === 'not_configured') return '未配置'
  if (summary.status === 'needs_attention') return '需更新'
  if (summary.status === 'verified') return '可用'
  return '已配置'
}

function endpointIsSafe(endpoint: string): boolean {
  try {
    const url = new URL(endpoint.trim())
    return (
      url.protocol === 'https:' &&
      Boolean(url.host) &&
      !url.username &&
      !url.password &&
      !url.hash
    )
  } catch {
    return false
  }
}

export function credentialSummaryLabel(
  summaries: CredentialSummaries,
): string {
  const pending = Object.values(summaries).filter(
    (summary) =>
      summary.status === 'not_configured' ||
      summary.status === 'needs_attention',
  ).length
  return pending === 0 ? '已配置' : `${pending} 项待配置`
}

export function CredentialCenter({
  credentials,
  initialCapability,
  onBack,
  onToast,
  onSummariesChange,
}: {
  credentials: CredentialPort
  initialCapability?: AiCapability
  onBack: () => void
  onToast: (message: string) => void
  onSummariesChange?: (summaries: CredentialSummaries) => void
}) {
  const [view, setView] = useState<CredentialView>(
    initialCapability
      ? { kind: 'edit', capability: initialCapability }
      : { kind: 'list' },
  )
  const [summaries, setSummaries] =
    useState<CredentialSummaries>(EMPTY_SUMMARIES)
  const [providerId, setProviderId] = useState('custom')
  const [providerLabel, setProviderLabel] = useState('')
  const [modelId, setModelId] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const publish = (next: CredentialSummaries) => {
    setSummaries(next)
    onSummariesChange?.(next)
  }

  useEffect(() => {
    let mounted = true
    void credentials
      .getSummaries()
      .then((next) => {
        if (mounted) publish(next)
      })
      .catch(() => {
        if (mounted) setError('暂时无法读取配置')
      })
    return () => {
      mounted = false
    }
  }, [credentials])

  const openEditor = (capability: AiCapability) => {
    const summary = summaries[capability]
    const preset = credentialPreset(
      capability,
      summary.providerId || providerPresetsFor(capability)[0].id,
    )
    setProviderId(preset.id)
    setProviderLabel(summary.providerLabel || preset.label)
    setModelId(summary.modelId || preset.suggestedModelId)
    setEndpoint(
      summary.status === 'not_configured' ? preset.endpoint : '',
    )
    setApiKey('')
    setError('')
    setView({ kind: 'edit', capability })
  }

  const save = async (capability: AiCapability) => {
    const summary = summaries[capability]
    if (!providerLabel.trim()) {
      setError('请输入服务商')
      return
    }
    if (!modelId.trim()) {
      setError('请输入模型 ID')
      return
    }
    if (!apiKey && summary.status === 'not_configured') {
      setError('请输入访问密钥')
      return
    }
    if (
      (!endpoint && summary.status === 'not_configured') ||
      (endpoint && !endpointIsSafe(endpoint))
    ) {
      setError('服务地址格式不正确')
      return
    }

    setSaving(true)
    setError('')
    try {
      const next = await credentials.saveConfig({
        capability,
        providerId,
        providerLabel: providerLabel.trim(),
        modelId: modelId.trim(),
        endpoint: endpoint.trim(),
        apiKey,
      })
      publish({ ...summaries, [capability]: next })
      setApiKey('')
      setEndpoint('')
      setView({ kind: 'list' })
      onToast('配置已保存')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (capability: AiCapability) => {
    setSaving(true)
    setError('')
    try {
      const next = await credentials.removeConfig(capability)
      publish({ ...summaries, [capability]: next })
      setView({ kind: 'list' })
      onToast('配置已移除')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '移除失败')
    } finally {
      setSaving(false)
    }
  }

  if (view.kind === 'list') {
    return (
      <section className="credential-center" aria-label="密钥配置">
        <header className="credential-head">
          <button type="button" onClick={onBack} aria-label="返回我的">
            ←
          </button>
          <div>
            <h2>密钥配置</h2>
            <p>为智能功能选择服务</p>
          </div>
        </header>

        <div className="credential-capabilities">
          {(Object.keys(CAPABILITY_COPY) as AiCapability[]).map(
            (capability) => {
              const copy = CAPABILITY_COPY[capability]
              const summary = summaries[capability]
              return (
                <button
                  className="credential-capability"
                  type="button"
                  key={capability}
                  onClick={() => openEditor(capability)}
                >
                  <span>
                    <strong>{copy.title}</strong>
                    <small>{copy.description}</small>
                  </span>
                  <em className={`credential-status ${summary.status}`}>
                    {statusLabel(summary)}
                  </em>
                </button>
              )
            },
          )}
        </div>

        <p className="credential-note">
          密钥由系统安全保存，不会同步或备份。
        </p>
        {error ? <p className="credential-error">{error}</p> : null}
      </section>
    )
  }

  const capability = view.capability
  const summary = summaries[capability]
  const copy = CAPABILITY_COPY[capability]
  const presets = providerPresetsFor(capability)
  return (
    <section className="credential-center" aria-label={`${copy.title}配置`}>
      <header className="credential-head">
        <button
          type="button"
          onClick={() => {
            setError('')
            setView({ kind: 'list' })
          }}
          aria-label="返回密钥配置"
        >
          ←
        </button>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
      </header>

      <div className="credential-form">
        {presets.length > 1 ? (
          <label>
            <span>服务预设</span>
            <select
              value={providerId}
              onChange={(event) => {
                const preset = credentialPreset(
                  capability,
                  event.target.value,
                )
                setProviderId(preset.id)
                setProviderLabel(preset.label)
                setModelId(preset.suggestedModelId)
                setEndpoint(preset.endpoint)
              }}
            >
              {presets.map((preset, index) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}{index === 0 ? '（默认）' : ''}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span>服务商</span>
          <input
            value={providerLabel}
            onChange={(event) => setProviderLabel(event.target.value)}
            placeholder="按服务商文档填写"
            autoComplete="organization"
          />
        </label>
        <label>
          <span>模型 ID</span>
          <input
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            placeholder="使用服务商提供的模型 ID"
            autoCapitalize="none"
          />
        </label>
        <label>
          <span>访问密钥</span>
          <input
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={
              summary.status === 'not_configured'
                ? '输入密钥'
                : '留空则保持不变'
            }
            type="password"
            autoComplete="new-password"
            autoCapitalize="none"
          />
        </label>
        <label>
          <span>服务地址</span>
          <input
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder={
              summary.status === 'not_configured'
                ? 'https://…'
                : '留空则保持不变'
            }
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
          />
        </label>
        {error ? (
          <p className="credential-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="credential-actions">
          <button
            className="credential-save"
            type="button"
            disabled={saving}
            onClick={() => void save(capability)}
          >
            {saving ? '保存中…' : '保存'}
          </button>
          {summary.status !== 'not_configured' ? (
            <button
              className="credential-remove"
              type="button"
              disabled={saving}
              onClick={() => void remove(capability)}
            >
              移除配置
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
