import { useEffect, useMemo, useState } from 'react'
import {
  DemoApiError,
  requestDemoAgent,
} from '../../ai/demoApi'
import type {
  DemoAgentInput,
  DemoAgentResponse,
  DemoWorldSnapshot,
} from '../../ai/types'
import { PotTransition } from './RecipeDetailModal'

type Requester = (
  input: DemoAgentInput,
) => Promise<DemoAgentResponse>

interface DemoAgentPanelProps {
  mode: 'agent' | 'recommend'
  message?: string
  snapshot: DemoWorldSnapshot
  requester?: Requester
  onOpenRecipe: (recipeId: string) => void
}

function fixtureResponse(
  mode: 'agent' | 'recommend',
  message?: string,
): DemoAgentResponse {
  if (mode === 'recommend') {
    return {
      answer:
        '已识别：番茄、鸡蛋、香蕉、白菜。优先推荐能直接开做的菜谱。',
      suggestions: [
        {
          title: '番茄鸡蛋轻食碗',
          reason: '番茄临期，鸡蛋库存充足',
          recipeId: 'recipe-tomato-egg-bowl',
        },
      ],
    }
  }
  return {
    answer: [
      `你问：${message?.trim() || '今晚吃什么？'}`,
      '建议先做「番茄鸡蛋轻食碗」。冰箱里番茄和鸡蛋都能直接用，15 分钟完成。',
    ].join('\n\n'),
    suggestions: [
      {
        title: '番茄鸡蛋轻食碗',
        reason: '现有食材可以直接开做',
        recipeId: 'recipe-tomato-egg-bowl',
      },
    ],
  }
}

export function DemoAgentPanel({
  mode,
  message,
  snapshot,
  requester = requestDemoAgent,
  onOpenRecipe,
}: DemoAgentPanelProps) {
  const [response, setResponse] = useState<DemoAgentResponse | null>(null)
  const [fallbackMessage, setFallbackMessage] = useState('')
  const allowedRecipeIds = useMemo(
    () => new Set(snapshot.availableRecipes.map((recipe) => recipe.id)),
    [snapshot],
  )

  useEffect(() => {
    let active = true
    setResponse(null)
    setFallbackMessage('')
    void requester({ mode, message, snapshot })
      .then((value) => {
        if (active) setResponse(value)
      })
      .catch((error: unknown) => {
        if (!active) return
        setFallbackMessage(
          error instanceof DemoApiError &&
            error.code === 'DEMO_RATE_LIMITED'
            ? '今天来访的人有点多，请稍后再问我。'
            : '在线建议暂时走神了，先为你展示一份本地推荐。',
        )
        setResponse(fixtureResponse(mode, message))
      })
    return () => {
      active = false
    }
  }, [message, mode, requester, snapshot])

  if (!response) {
    return (
      <div className="demo-agent-panel" aria-live="polite">
        <div className="preview-strip">ONLINE · READ ONLY</div>
        <PotTransition />
        <p className="demo-agent-loading">正在看看冰箱里有什么……</p>
      </div>
    )
  }

  return (
    <div className="demo-agent-panel" aria-live="polite">
      <div className="preview-strip">
        {fallbackMessage
          ? 'LOCAL PREVIEW · FIXTURE'
          : 'ONLINE · READ ONLY'}
      </div>
      {fallbackMessage ? (
        <p className="demo-agent-fallback">{fallbackMessage}</p>
      ) : null}
      {mode === 'agent' ? <PotTransition /> : null}
      <div className="recipe-agent-answer">{response.answer}</div>
      {response.notices?.length ? (
        <ul className="demo-agent-notices">
          {response.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
      {response.suggestions?.length ? (
        <div className="demo-agent-suggestions">
          {response.suggestions.map((suggestion, index) => {
            const canOpen =
              !!suggestion.recipeId &&
              allowedRecipeIds.has(suggestion.recipeId)
            const content = (
              <>
                <b>{suggestion.title}</b>
                <span>{suggestion.reason}</span>
              </>
            )
            return canOpen ? (
              <button
                className="planner-subaction demo-agent-suggestion"
                type="button"
                key={`${suggestion.title}-${index}`}
                onClick={() => onOpenRecipe(suggestion.recipeId!)}
              >
                {content}
              </button>
            ) : (
              <div
                className="demo-agent-suggestion"
                key={`${suggestion.title}-${index}`}
              >
                {content}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
