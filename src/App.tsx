import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { buildDemoWorldSnapshot } from './ai/demoWorld'
import type {
  DemoAssistantIntent,
  DemoAssistantReply,
} from './ai/types'
import { createBrowserAudio } from './app/browserAudio'
import {
  appReducer,
  createInitialAppState,
  deriveMissingIngredients,
} from './app/state'
import { mapNativeInventory } from './app/inventoryMapper'
import {
  loadFavoriteRecipes,
  type SavedRecipe,
} from './app/recipes'
import type { AppTab, PresentedFood } from './app/types'
import {
  selectInventoryRuntime,
  type AppRuntime,
} from './bridge/browserMock'
import type {
  AddInventoryItem,
  AssistantRecipe,
  AssistantShoppingItem,
  MqttStatus,
} from './bridge/types'
import { AppShell } from './components/AppShell'
import { createDemoRuntime } from './demo/demoRuntime'
import './components/EntryComposer.css'
import { KitchenScene } from './scenes/KitchenScene'
import { DisplayScene } from './scenes/display/DisplayScene'
import { AddFoodModal } from './scenes/fridge/AddFoodModal'
import { FoodDetailModal } from './scenes/fridge/FoodDetailModal'
import { FridgePreviewModal } from './scenes/fridge/FridgePreviewModal'
import { FridgeScene } from './scenes/fridge/FridgeScene'
import { GOLDEN_PRESENTED_FOODS } from './scenes/fridge/foodPresentation'
import { MealPlannerModal } from './scenes/recipe/MealPlannerModal'
import { FavoriteRecipesModal } from './scenes/recipe/FavoriteRecipesModal'
import {
  PotTransition,
  RecipeDetailModal,
} from './scenes/recipe/RecipeDetailModal'
import {
  RecipeMini,
  RecipeScene,
  type Recipe,
} from './scenes/recipe/RecipeScene'
import { AssistantAnswer } from './scenes/recipe/AssistantAnswer'
import { ProfileScene } from './scenes/profile/ProfileScene'
import {
  ShoppingScene,
  createShopItem,
  initialShopItems,
} from './scenes/shop/ShoppingScene'
import type { AiCapability } from './features/credentials/types'

function localDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localDateString(date)
}

export type AppInventoryRuntime = AppRuntime

export function App({
  inventoryRuntime: providedRuntime,
  onRestartDemo,
}: {
  inventoryRuntime?: AppRuntime
  onRestartDemo?: () => void
} = {}) {
  const tabHistory = useRef<AppTab[]>([])
  const audioRef = useRef<ReturnType<typeof createBrowserAudio> | null>(null)
  if (!audioRef.current) audioRef.current = createBrowserAudio()
  const audio = audioRef.current
  const [runtime] = useState<AppRuntime>(
    () =>
      providedRuntime ??
      (window.NativeBridge
        ? selectInventoryRuntime()
        : createDemoRuntime()),
  )
  const inventoryPort = runtime.inventory
  const [inventoryItems, setInventoryItems] = useState<readonly PresentedFood[]>(
    () => runtime.mode === 'browser-mock' ? GOLDEN_PRESENTED_FOODS : [],
  )
  const [mqttStatus, setMqttStatus] = useState<MqttStatus>(
    runtime.mode === 'browser-mock'
      ? { connected: true, detail: 'BROWSER MOCK' }
      : { connected: false, detail: '连接中' },
  )
  const [credentialTarget, setCredentialTarget] =
    useState<AiCapability | null>(null)
  const [shoppingItems, setShoppingItems] = useState(initialShopItems)
  const [favoriteRecipes, setFavoriteRecipes] =
    useState<SavedRecipe[]>(() =>
      loadFavoriteRecipes(runtime.stateStorage),
    )
  const [state, dispatch] = useReducer(
    appReducer,
    runtime.stateStorage,
    (storage) => ({
      ...createInitialAppState(storage),
      reducedMotion:
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
        false,
    }),
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
    runtime.stateStorage.setItem(
      'fridge-favorite-recipes-v1',
      JSON.stringify(favoriteRecipes),
    )
  }, [favoriteRecipes, runtime.stateStorage])

  useEffect(() => {
    runtime.stateStorage.setItem(
      'fridge-planner-v2',
      JSON.stringify(state.planner),
    )
  }, [runtime.stateStorage, state.planner])

  useEffect(() => {
    let active = true
    const updateInventory = (
      items: Parameters<typeof mapNativeInventory>[0],
    ) => {
      if (active) setInventoryItems(mapNativeInventory(items, new Date()))
    }
    const unsubscribe = inventoryPort.subscribe((event) => {
      if (event.type === 'inventory-updated') {
        updateInventory(event.payload.items)
      } else if (event.type === 'mqtt-status' && active) {
        setMqttStatus(event.payload)
      }
    })

    void inventoryPort.getItems().then(updateInventory).catch(() => {
      if (active) {
        dispatch({ type: 'show-toast', message: '库存读取失败' })
      }
    })
    void inventoryPort.getMqttStatus().then((status) => {
      if (active) setMqttStatus(status)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [inventoryPort])

  const addInventoryItem = useCallback(
    async (input: AddInventoryItem) => {
      const item = await inventoryPort.addItem(input)
      const allItems = await inventoryPort.getItems()
      setInventoryItems(mapNativeInventory(allItems, new Date()))
      dispatch({ type: 'close-modal' })
      dispatch({
        type: 'show-toast',
        message:
          runtime.mode === 'native'
            ? '已提交，等待开发板确认'
            : `已添加 ${item.name} 到 BROWSER MOCK`,
      })
    },
    [inventoryPort, runtime.mode],
  )

  const removeInventoryItem = useCallback(
    async (food: PresentedFood) => {
      for (const id of food.sourceIds) {
        await inventoryPort.removeItem(id)
      }
      dispatch({ type: 'close-modal' })
      dispatch({
        type: 'show-toast',
        message:
          runtime.mode === 'native'
            ? `已提交取出 ${food.batchCount} 批，等待开发板确认`
            : `已从 BROWSER MOCK 取出 ${food.batchCount} 批`,
      })
    },
    [inventoryPort, runtime.mode],
  )

  const removeInventoryBatch = useCallback(async (id: string) => {
    await inventoryPort.removeItem(id)
    dispatch({ type: 'close-modal' })
    dispatch({ type: 'show-toast', message: '已提交取出，等待开发板确认' })
  }, [inventoryPort])

  const updateInventoryQuantity = useCallback(
    async (id: string, quantity: string) => {
      if (!inventoryPort) throw new Error('请在手机 App 中修改数量')
      await inventoryPort.updateItemQuantity(id, quantity)
      setInventoryItems(
        mapNativeInventory(await inventoryPort.getItems(), new Date()),
      )
      dispatch({ type: 'close-modal' })
      dispatch({
        type: 'show-toast',
        message: `剩余数量已更新为 ${quantity}`,
      })
    },
    [inventoryPort],
  )

  const saveFavoriteRecipe = useCallback((recipe: SavedRecipe) => {
    setFavoriteRecipes((current) => [
      recipe,
      ...current.filter((candidate) => candidate.id !== recipe.id),
    ])
    dispatch({ type: 'show-toast', message: `已收藏：${recipe.cn}` })
  }, [])

  const saveAssistantRecipe = useCallback((recipe: AssistantRecipe) => {
    saveFavoriteRecipe({
      id: `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      key: 'unknown',
      name: recipe.name,
      cn: recipe.name,
      kcal: null,
      time: 30,
      tags: ['AI 推荐'],
      match: recipe.missingIngredients.length === 0,
      need: [...recipe.availableIngredients, ...recipe.missingIngredients],
      desc: recipe.reason,
      steps: recipe.steps,
    })
  }, [saveFavoriteRecipe])

  const missingIngredients = useMemo(
    () =>
      deriveMissingIngredients(
        state.planner,
        inventoryItems.flatMap((food) => [food.key, food.name]),
        favoriteRecipes,
      ),
    [favoriteRecipes, inventoryItems, state.planner],
  )

  const assistantContext = useCallback(
    (question: string, intent: DemoAssistantIntent = 'agent') => ({
      intent,
      question,
      snapshot: buildDemoWorldSnapshot({
        inventory: inventoryItems,
        planner: state.planner,
        missingItems: missingIngredients,
      }),
    }),
    [inventoryItems, missingIngredients, state.planner],
  )

  const ensureAssistantConfigured = useCallback(async () => {
    const assistant =
      (await runtime.credentials.getSummaries()).assistant
    if (
      assistant.status !== 'not_configured' &&
      assistant.status !== 'needs_attention'
    ) {
      setCredentialTarget(null)
      return true
    }
    setCredentialTarget('assistant')
    dispatch({ type: 'close-modal' })
    dispatch({ type: 'select-tab', tab: 'me' })
    dispatch({ type: 'show-toast', message: '请先配置智能助手' })
    return false
  }, [runtime.credentials])

  const startInventoryVoice = useCallback(() => {
    const speech = runtime.speech.start()
    return {
      stop: speech.stop,
      result: speech.result.then(async (text) => {
        if (!(await ensureAssistantConfigured())) {
          throw new Error('请先配置智能助手')
        }
        const reply = await runtime.assistant.ask(
          assistantContext(text, 'inventory-voice'),
        )
        const parsedItems = reply.shoppingItems.length
          ? reply.shoppingItems
          : [{ name: text, quantity: '1份', reason: '语音添加' }]
        for (const item of parsedItems) {
          await inventoryPort.addItem({
            name: item.name,
            quantity: item.quantity || '1份',
            storage: '冷藏室',
            addedDate: localDateString(new Date()),
            expiryDate: dateAfter(7),
          })
        }
        setInventoryItems(
          mapNativeInventory(await inventoryPort.getItems(), new Date()),
        )
        return parsedItems.length
      }),
    }
  }, [
    assistantContext,
    ensureAssistantConfigured,
    inventoryPort,
    runtime.assistant,
    runtime.speech,
  ])

  const askAssistant = useCallback(async (question: string) => {
    if (!(await ensureAssistantConfigured())) return
    dispatch({
      type: 'open-modal',
      kind: 'assistant-loading',
      payload: question,
    })
    try {
      const reply = await runtime.assistant.ask(assistantContext(question))
      dispatch({
        type: 'open-modal',
        kind: 'assistant-result',
        payload: { question, reply },
      })
    } catch (error) {
      dispatch({ type: 'close-modal' })
      dispatch({
        type: 'show-toast',
        message:
          error instanceof Error ? error.message : '智能助手请求失败',
      })
      return
    }
  }, [assistantContext, ensureAssistantConfigured, runtime.assistant])

  const askRecommendation = useCallback(async () => {
    if (!(await ensureAssistantConfigured())) return
    const question = '根据当前库存和本周计划推荐现在最适合做的菜'
    dispatch({
      type: 'open-modal',
      kind: 'assistant-loading',
      payload: question,
    })
    const reply = await runtime.assistant.ask(
      assistantContext(question, 'recommend'),
    )
    dispatch({
      type: 'open-modal',
      kind: 'assistant-result',
      payload: { question, reply },
    })
  }, [assistantContext, ensureAssistantConfigured, runtime.assistant])

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
                onRemove={removeInventoryItem}
                onRemoveBatch={removeInventoryBatch}
                onUpdateQuantity={updateInventoryQuantity}
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
              <RecipeDetailModal
                recipe={state.modal.payload as Recipe}
                credentials={runtime.credentials}
                illustration={runtime.recipeIllustration}
                onConfigure={() => {
                  dispatch({ type: 'close-modal' })
                  setCredentialTarget('recipe-illustration')
                  dispatch({ type: 'select-tab', tab: 'me' })
                }}
              />
            ),
          }
      : state.modal?.kind === 'planner'
        ? {
            title: 'CAL · 周食谱规划',
            content: (
              <MealPlannerModal
                planner={state.planner}
                recipes={favoriteRecipes}
                missingIngredients={missingIngredients}
                onAssign={(day, meal, recipe) => {
                  dispatch({
                    type: 'assign-recipe',
                    day,
                    meal,
                    recipeId: recipe.id,
                  })
                  dispatch({
                    type: 'show-toast',
                    message: '✓ 已加入周食谱',
                  })
                }}
                onClear={(day, meal) =>
                  dispatch({ type: 'clear-recipe', day, meal })
                }
              />
            ),
          }
      : state.modal?.kind === 'favorites'
        ? {
            title: 'FAV · 个人收藏食谱',
            content: (
              <FavoriteRecipesModal
                recipes={favoriteRecipes}
                onOpen={(recipe) =>
                  dispatch({
                    type: 'open-modal',
                    kind: 'recipe-detail',
                    payload: recipe,
                  })
                }
                onSave={saveFavoriteRecipe}
                onDelete={(id) => {
                  setFavoriteRecipes((current) =>
                    current.filter((recipe) => recipe.id !== id),
                  )
                  dispatch({ type: 'show-toast', message: '食谱已删除' })
                }}
              />
            ),
          }
      : state.modal?.kind === 'ai-recipe'
        ? {
            title: 'AI · 根据冰箱食材推荐',
            content: (
              <>
                <div className="planner-intro">
                  已识别：番茄、鸡蛋、香蕉、白菜。优先推荐能直接开做的菜谱。
                </div>
                <div className="recipe-strip">
                  {favoriteRecipes.filter((recipe) => recipe.match)
                    .slice(0, 3)
                    .map((recipe) => (
                      <RecipeMini
                        recipe={recipe}
                        label="READY"
                        key={recipe.id}
                        onOpen={(selected) =>
                          dispatch({
                            type: 'open-modal',
                            kind: 'recipe-detail',
                            payload: selected,
                          })
                        }
                      />
                    ))}
                </div>
              </>
            ),
          }
      : state.modal?.kind === 'assistant-loading'
        ? {
            title: 'Recipe Agent',
            content: (
              <>
                <PotTransition />
                <div className="recipe-generating">
                  正在结合真实库存、口味偏好和健康备注生成建议...
                </div>
              </>
            ),
          }
      : state.modal?.kind === 'assistant-result'
        ? {
            title: '智能助手 · 冰箱 Agent',
            content: (() => {
              const payload = state.modal?.payload as {
                question: string
                reply: DemoAssistantReply
              }
              const existingRecipeIds = new Set(
                payload.reply.existingRecipeIds ?? [],
              )
              return (
                <AssistantAnswer
                  question={payload.question}
                  reply={payload.reply}
                  existingRecipes={favoriteRecipes.filter((recipe) =>
                    existingRecipeIds.has(recipe.id),
                  )}
                  onOpenRecipe={(recipe) =>
                    dispatch({
                      type: 'open-modal',
                      kind: 'recipe-detail',
                      payload: recipe,
                    })
                  }
                  onAddShopping={() => {
                    setShoppingItems((current) => [
                      ...current,
                      ...payload.reply.shoppingItems.map((item) =>
                        createShopItem(item, '智能助手建议'),
                      ),
                    ])
                    dispatch({ type: 'close-modal' })
                    dispatch({ type: 'select-tab', tab: 'shop' })
                    dispatch({
                      type: 'show-toast',
                      message: `已加入 ${payload.reply.shoppingItems.length} 项采购`,
                    })
                  }}
                  onSaveRecipe={saveAssistantRecipe}
                />
              )
            })(),
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
          runtime.mode === 'browser-mock' ? 'BROWSER MOCK' : undefined
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
          runtime.mode === 'browser-mock' ? onRestartDemo : undefined
        }
      >
        {state.currentTab === 'fridge' ? (
          <FridgeScene
            items={inventoryItems}
            connectionDetail={mqttStatus.detail}
            onVoiceStart={startInventoryVoice}
            onToast={(message) =>
              dispatch({ type: 'show-toast', message })
            }
            onAddFood={() =>
              dispatch({ type: 'open-modal', kind: 'add-food' })
            }
            onOpenFood={(food) =>
              dispatch({
                type: 'open-modal',
                kind: 'food-detail',
                payload: food,
              })
            }
          />
        ) : state.currentTab === 'shop' ? (
          <ShoppingScene
            items={shoppingItems}
            missingIngredients={missingIngredients}
            planner={state.planner}
            recipes={favoriteRecipes}
            onItemsChange={setShoppingItems}
            onVoiceStart={() => {
              const speech = runtime.speech.start()
              return {
                stop: speech.stop,
                result: speech.result.then(async (text) => {
                  if (!(await ensureAssistantConfigured())) {
                    throw new Error('请先配置智能助手')
                  }
                  const reply = await runtime.assistant.ask(
                    assistantContext(text, 'shopping-voice'),
                  )
                  if (reply.shoppingItems.length) return reply.shoppingItems
                  return [{
                    name: text,
                    quantity: '1份',
                    reason: '语音添加',
                  }] satisfies AssistantShoppingItem[]
                }),
              }
            }}
            onToast={(message) =>
              dispatch({ type: 'show-toast', message })
            }
          />
        ) : state.currentTab === 'recipe' ? (
          <RecipeScene
            onOpenPlanner={() =>
              dispatch({ type: 'open-modal', kind: 'planner' })
            }
            onOpenFavorites={() =>
              dispatch({ type: 'open-modal', kind: 'favorites' })
            }
            onOpenAi={askRecommendation}
            onOpenAgent={askAssistant}
            onSpeechStart={() => runtime.speech.start()}
            onToast={(message) =>
              dispatch({ type: 'show-toast', message })
            }
          />
        ) : state.currentTab === 'note' ? (
          <DisplayScene
            items={inventoryItems}
            planner={state.planner}
            recipes={favoriteRecipes}
            connected={mqttStatus.connected}
            native={runtime.mode === 'native'}
            onSendDisplay={(displayState) =>
              runtime.display.setState(displayState)
            }
            onToast={(message) => dispatch({ type: 'show-toast', message })}
          />
        ) : (
          <ProfileScene
            credentials={runtime.credentials}
            storage={runtime.stateStorage}
            openCredentialCapability={credentialTarget}
            onToast={(message) =>
              dispatch({ type: 'show-toast', message })
            }
          />
        )}
      </AppShell>
    </div>
  )
}
