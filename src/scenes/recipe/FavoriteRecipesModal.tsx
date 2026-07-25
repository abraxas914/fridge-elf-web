import { useState } from 'react'
import type { SavedRecipe } from '../../app/recipes'
import { RecipeCatalogPicker } from './RecipeCatalogPicker'

interface FavoriteRecipesModalProps {
  recipes: readonly SavedRecipe[]
  onSave: (recipe: SavedRecipe) => void
  onDelete: (id: string) => void
  onOpen: (recipe: SavedRecipe) => void
}

const blankRecipe = (): SavedRecipe => ({
  id: `favorite-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  key: 'unknown',
  name: 'MY RECIPE',
  cn: '',
  kcal: null,
  time: 30,
  tags: ['自定义'],
  match: false,
  need: [],
  desc: '',
  steps: [],
  source: 'user',
})

export function FavoriteRecipesModal(props: FavoriteRecipesModalProps) {
  const [editing, setEditing] = useState<SavedRecipe | null>(null)
  const [selectedId, setSelectedId] = useState(props.recipes[0]?.id ?? '')
  const selectedRecipe =
    props.recipes.find((recipe) => recipe.id === selectedId) ??
    props.recipes[0]

  if (editing) {
    return (
      <form
        className="favorite-recipe-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (!editing.cn.trim()) return
          props.onSave({
            ...editing,
            cn: editing.cn.trim(),
            name: editing.name.trim() || 'MY RECIPE',
            need: editing.need.map((value) => value.trim()).filter(Boolean),
            steps: (editing.steps ?? []).map((value) => value.trim()).filter(Boolean),
          })
          setEditing(null)
        }}
      >
        <label>食谱名称<input value={editing.cn} required onChange={(event) => setEditing({ ...editing, cn: event.target.value })} /></label>
        <label>英文名<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label>
        <label>用时（分钟）<input type="number" min="1" value={editing.time} onChange={(event) => setEditing({ ...editing, time: Number(event.target.value) || 1 })} /></label>
        <label>所需食材（顿号分隔）<input value={editing.need.join('、')} onChange={(event) => setEditing({ ...editing, need: event.target.value.split(/[、,，]/) })} /></label>
        <label>做法说明<textarea rows={3} value={editing.desc} onChange={(event) => setEditing({ ...editing, desc: event.target.value })} /></label>
        <label>步骤（每行一步）<textarea rows={5} value={(editing.steps ?? []).join('\n')} onChange={(event) => setEditing({ ...editing, steps: event.target.value.split('\n') })} /></label>
        <div className="favorite-form-actions">
          <button type="button" onClick={() => setEditing(null)}>取消</button>
          <button type="submit">保存食谱</button>
        </div>
      </form>
    )
  }

  return (
    <div className="favorite-recipes">
      <button className="favorite-add" type="button" onClick={() => setEditing(blankRecipe())}>＋ 新建食谱</button>
      <RecipeCatalogPicker
        recipes={props.recipes}
        selectedId={selectedRecipe?.id}
        onSelect={(recipe) => setSelectedId(recipe.id)}
        onOpen={props.onOpen}
      />
      {selectedRecipe && selectedRecipe.source !== 'seed' ? (
        <div className="favorite-selected-actions">
          <button
            aria-label={`编辑${selectedRecipe.cn}`}
            type="button"
            onClick={() =>
              setEditing({
                ...selectedRecipe,
                need: [...selectedRecipe.need],
                steps: [...(selectedRecipe.steps ?? [])],
                ingredients: selectedRecipe.ingredients?.map((item) => ({
                  ...item,
                })),
              })
            }
          >
            编辑
          </button>
          <button
            aria-label={`删除${selectedRecipe.cn}`}
            className="danger"
            type="button"
            onClick={() => {
              props.onDelete(selectedRecipe.id)
              setSelectedId(
                props.recipes.find(
                  (recipe) => recipe.id !== selectedRecipe.id,
                )?.id ?? '',
              )
            }}
          >
            删除
          </button>
        </div>
      ) : null}
      {!props.recipes.length ? <p>还没有收藏食谱，先新建一份吧。</p> : null}
    </div>
  )
}
