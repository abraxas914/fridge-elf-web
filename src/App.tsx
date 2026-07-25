import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  appReducer,
  deriveMissingIngredients,
  initialAppState,
} from './app/state'
import { createBrowserAudio } from './app/browserAudio'
import { mapNativeInventory } from './app/inventoryMapper'
import type { InventoryPort } from './app/ports'
import type {
  AppTab,
  PresentedFood,
} from './app/types'
import { buildDemoWorldSnapshot } from './ai/demoWorld'
import type {
  DemoAgentInput,
  DemoAgentResponse,
} from './ai/types'
import type { AddInventoryItem } from './bridge/types'
import { AppShell } from './components/AppShell'
import { RECIPES } from './fixtures/goldenFixture'
import { readDemoToken } from './illustration/demoAccess'
import { DEFAULT_ILLUSTRATION_RECIPE } from './illustration/demoRecipe'
import { KitchenScene } from './scenes/KitchenScene'
import { AddFoodModal } from './scenes/fridge/AddFoodModal'
import { FoodDetailModal } from './scenes/fridge/FoodDetailModal'
import { FridgePreviewModal } from './scenes/fridge/FridgePreviewModal'
import { FridgeScene } from './scenes/fridge/FridgeScene'
import { GOLDEN_PRESENTED_FOODS } from './scenes/fridge/foodPresentation'
import { DeviceDisplayScene } from './scenes/note/DeviceDisplayScene'
import { ProfileScene } from './scenes/profile/ProfileScene'
import { MealPlannerModal } from './scenes/recipe/MealPlannerModal'
import {
  RecipeDetailModal,
} from './scenes/recipe/RecipeDetailModal'
import { DemoAgentPanel } from './scenes/recipe/DemoAgentPanel'
import {
  RecipeScene,
  type Recipe,
} from './scenes/recipe/RecipeScene'
import { IllustrationModal } from './scenes/recipe/IllustrationModal'
import { ShoppingScene } from './scenes/shop/ShoppingScene'
import {
  selectInventoryRuntime,
  type RuntimeMode,
} from './bridge/browserMock'
import type { InventoryItem, MqttStatus } from './bridge/types'

export interface AppInventoryRuntime {
  inventory: InventoryPort
  mode: RuntimeMode
}

function presentInventory(
  items: readonly InventoryItem[],
  mode: RuntimeMode,
) {
  if (mode === 'native') return mapNativeInventory(items, new Date())
  const goldenById = new Map(
    GOLDEN_PRESENTED_FOODS.map((food) => [food.id, food]),
  )
  return items.map(
    (item) =>
      goldenById.get(item.id) ??
      mapNativeInventory([item], new Date())[0],
  )
}

export function App({
  inventoryRuntime: providedInventoryRuntime,
  demoAgentRequester,
  onRestartDemo,
}: {
  inventoryRuntime?: AppInventoryRuntime
  demoAgentRequester?: (
    input: DemoAgentInput,
  ) => Promise<DemoAgentResponse>
  onRestartDemo?: () => void
} = {}) {
  const tabHistory = useRef<AppTab[]>([])
  const audioRef = useRef<ReturnType<typeof createBrowserAudio> | null>(null)
  if (!audioRef.current) audioRef.current = createBrowserAudio()
  const audio = audioRef.current
  const [inventoryRuntime] = useState<AppInventoryRuntime>(
    () => providedInventoryRuntime ?? selectInventoryRuntime(),
  )
  const [inventoryItems, setInventoryItems] = useState<
    readonly PresentedFood[]
  >(
    inventoryRuntime.mode === 'browser-mock'
      ? GOLDEN_PRESENTED_FOODS
      : [],
  )
  const [mqttStatus, setMqttStatus] = useState<MqttStatus>(
    inventoryRuntime.mode === 'browser-mock'
      ? { connected: true, detail: 'BROWSER MOCK' }
      : { connected: false, detail: '连接中' },
  )
  const [state, dispatch] = useReducer(appReducer, {
    ...initialAppState,
    reducedMotion:
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  })
  const demoToken = useMemo(
    () =>
      readDemoToken(
        new URL(window.location.href),
        window.sessionStorage,
      ),
    [],
  )

  useEffect(() => {
    if (!state.toast) return
    const timer = window.setTimeout(
      () => dispatch({ type: 'hide-toast' }),
      1_800,
    )
    return () => window.clearTimeout(timer)
  }, [state.toast])

  useEffect(() => {
    audio.setMuted(state.muted)
  }, [audio, state.muted])

  useEffect(() => {
    let active = true
    const unsubscribe = inventoryRuntime.inventory.subscribe((event) => {
      if (event.type === 'mqtt-status') {
        setMqttStatus(event.payload)
      } else {
        setInventoryItems(
          presentInventory(event.payload.items, inventoryRuntime.mode),
        )
      }
    })

    void inventoryRuntime.inventory
      .getItems()
      .then((items) => {
        if (active) {
          setInventoryItems(presentInventory(items, inventoryRuntime.mode))
        }
      })
      .catch(() => {
        if (!active) return
        setInventoryItems(GOLDEN_PRESENTED_FOODS)
        dispatch({
          type: 'show-toast',
          message: '库存读取失败 · 已保留 LOCAL PREVIEW',
        })
      })
    void inventoryRuntime.inventory
      .getMqttStatus()
      .then((status) => {
        if (active) setMqttStatus(status)
      })
      .catch(() => {
        if (active) {
          setMqttStatus({ connected: false, detail: '连接状态不可用' })
        }
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [inventoryRuntime])

  const addInventoryItem = useCallback(
    async (input: AddInventoryItem) => {
      const item = await inventoryRuntime.inventory.addItem(input)
      setInventoryItems((current) => {
        const next = presentInventory([item], inventoryRuntime.mode)[0]
        return [
          next,
          ...current.filter((candidate) => candidate.id !== item.id),
        ]
      })
      dispatch({ type: 'close-modal' })
      dispatch({
        type: 'show-toast',
        message:
          inventoryRuntime.mode === 'native'
            ? '已提交，等待开发板确认'
            : '已添加到 BROWSER MOCK',
      })
    },
    [inventoryRuntime],
  )

  const enterApp = useCallback(() => {
    tabHistory.current = []
    dispatch({ type: 'enter-app' })
  }, [])
  const selectTab = useCallback(
    (tab: AppTab) => {
      if (tab === state.currentTab) return
      audio.play('tick')
      tabHistory.current.push(state.currentTab)
      dispatch({ type: 'select-tab', tab })
    },
    [audio, state.currentTab],
  )

  useEffect(() => {
    window.handleAndroidBack = () => {
      if (state.modal) {
        dispatch({ type: 'close-modal' })
        return true
      }
      if (state.scene === 'app' && state.currentTab !== 'fridge') {
        dispatch({
          type: 'select-tab',
          tab: tabHistory.current.pop() ?? 'fridge',
        })
        return true
      }
      return false
    }
    return () => {
      delete window.handleAndroidBack
    }
  }, [state.currentTab, state.modal, state.scene])
  const missingIngredients = useMemo(
    () =>
      deriveMissingIngredients(
        state.planner,
        inventoryItems.map((food) => food.key),
      ),
    [inventoryItems, state.planner],
  )
  const demoWorld = useMemo(
    () =>
      buildDemoWorldSnapshot({
        inventory: inventoryItems,
        planner: state.planner,
        missingItems: missingIngredients,
      }),
    [inventoryItems, missingIngredients, state.planner],
  )
  const openRecipeById = useCallback(
    (recipeId: string) => {
      const recipe = RECIPES.find((candidate) => candidate.id === recipeId)
      if (!recipe) return
      audio.play('ding')
      dispatch({
        type: 'open-modal',
        kind: 'recipe-detail',
        payload: recipe,
      })
    },
    [audio],
  )

  if (state.scene === 'kitchen') {
    return (
      <div id="stage">
        <KitchenScene
          onEnter={enterApp}
          onCue={audio.play}
          reducedMotion={state.reducedMotion}
        />
      </div>
    )
  }

  const modal =
    state.modal?.kind === 'peek'
      ? {
          title: 'PEEK · 冰箱一览',
          content: <FridgePreviewModal items={inventoryItems} />,
        }
      : state.modal?.kind === 'food-detail'
        ? {
            title: `${
              (state.modal.payload as PresentedFood).name
            } · ${(state.modal.payload as PresentedFood).englishName}`,
            content: (
              <FoodDetailModal
                food={state.modal.payload as PresentedFood}
              />
            ),
          }
      : state.modal?.kind === 'add-food'
        ? {
            title: 'ADD · 添加食物',
            content: <AddFoodModal onSubmit={addInventoryItem} />,
          }
      : state.modal?.kind === 'recipe-detail'
        ? {
            title: `${(state.modal.payload as Recipe).cn} · COOKING`,
            content: (
              <RecipeDetailModal recipe={state.modal.payload as Recipe} />
            ),
          }
      : state.modal?.kind === 'planner'
        ? {
            title: 'CAL · 周菜谱规划',
            content: (
              <MealPlannerModal
                planner={state.planner}
                missingIngredients={missingIngredients}
                onAssign={(day, recipe) => {
                  audio.play('success')
                  dispatch({
                    type: 'assign-recipe',
                    day,
                    recipeId: recipe.id,
                  })
                  dispatch({
                    type: 'show-toast',
                    message: '✓ 已加入周菜谱',
                  })
                }}
                onClear={(day) => {
                  audio.play('tick')
                  dispatch({ type: 'clear-recipe', day })
                }}
                onCue={audio.play}
              />
            ),
          }
      : state.modal?.kind === 'ai-recipe'
        ? {
            title: 'AI · 根据冰箱食材推荐',
            content: (
              <DemoAgentPanel
                mode="recommend"
                snapshot={demoWorld}
                requester={demoAgentRequester}
                onOpenRecipe={openRecipeById}
              />
            ),
          }
      : state.modal?.kind === 'recipe-illustration'
        ? {
            title: 'IMAGE2 · 菜谱插画',
            content: (
              <IllustrationModal
                defaultRecipeText={DEFAULT_ILLUSTRATION_RECIPE}
                demoToken={demoToken}
              />
            ),
          }
      : state.modal?.kind === 'recipe-agent'
        ? {
            title: 'Recipe Agent',
            content: (
              <DemoAgentPanel
                mode="agent"
                message={String(state.modal.payload)}
                snapshot={demoWorld}
                requester={demoAgentRequester}
                onOpenRecipe={openRecipeById}
              />
            ),
          }
      : state.modal
        ? { title: state.modal.kind, content: null }
        : null

  return (
    <div id="stage">
      <AppShell
        currentTab={state.currentTab}
        muted={state.muted}
        connected={mqttStatus.connected}
        runtimeLabel={
          inventoryRuntime.mode === 'browser-mock'
            ? 'BROWSER MOCK'
            : undefined
        }
        toast={state.toast}
        modal={modal}
        onSelectTab={selectTab}
        onToggleMute={() => {
          const muted = !state.muted
          audio.setMuted(muted)
          dispatch({ type: 'set-muted', muted })
          if (!muted) audio.play('tick')
        }}
        onOpenPeek={() => {
          audio.play('ding')
          dispatch({ type: 'open-modal', kind: 'peek' })
        }}
        onCloseModal={() => {
          audio.play('tick')
          dispatch({ type: 'close-modal' })
        }}
        onRestartDemo={
          inventoryRuntime.mode === 'browser-mock'
            ? onRestartDemo ?? (() => window.location.reload())
            : undefined
        }
      >
        <ShoppingScene
          active={state.currentTab === 'shop'}
          missingIngredients={missingIngredients}
          onToast={(message) =>
            dispatch({ type: 'show-toast', message })
          }
          onCue={audio.play}
        />
        <RecipeScene
          active={state.currentTab === 'recipe'}
          onOpenRecipe={(recipe) => {
            audio.play('ding')
            dispatch({
              type: 'open-modal',
              kind: 'recipe-detail',
              payload: recipe,
            })
          }}
          onOpenPlanner={() => {
            audio.play('ding')
            dispatch({ type: 'open-modal', kind: 'planner' })
          }}
          onOpenAi={() => {
            audio.play('ding')
            dispatch({ type: 'open-modal', kind: 'ai-recipe' })
          }}
          onOpenIllustration={() => {
            audio.play('ding')
            dispatch({ type: 'open-modal', kind: 'recipe-illustration' })
          }}
          onOpenAgent={(text) => {
            audio.play('wake')
            dispatch({
              type: 'show-toast',
              message: 'VOICE · Recipe Agent 正在听',
            })
            window.setTimeout(
              () =>
                dispatch({
                  type: 'open-modal',
                  kind: 'recipe-agent',
                  payload: text,
                }),
              450,
            )
          }}
          onSelectTab={selectTab}
          onToast={(message) =>
            dispatch({ type: 'show-toast', message })
          }
          onCue={audio.play}
        />
        <FridgeScene
          active={state.currentTab === 'fridge'}
          items={inventoryItems}
          connectionDetail={mqttStatus.detail}
          onAddFood={
            inventoryRuntime.mode === 'native'
              ? () => dispatch({ type: 'open-modal', kind: 'add-food' })
              : undefined
          }
          onCue={audio.play}
          onOpenFood={(food) =>
            dispatch({
              type: 'open-modal',
              kind: 'food-detail',
              payload: food,
            })
          }
        />
        <DeviceDisplayScene
          active={state.currentTab === 'note'}
          reducedMotion={state.reducedMotion}
          onCue={audio.play}
          onToast={(message) =>
            dispatch({ type: 'show-toast', message })
          }
        />
        <ProfileScene
          active={state.currentTab === 'me'}
          onCue={audio.play}
          onToast={(message) =>
            dispatch({ type: 'show-toast', message })
          }
        />
      </AppShell>
    </div>
  )
}
