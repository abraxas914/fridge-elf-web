import { type FormEvent, useState } from 'react'
import type { AddInventoryItem } from '../../bridge/types'
import {
  FOOD_SVGS,
  foodCatalogEntries,
} from '../../catalog/foodCatalog'
import { svgDataUrl } from '../../catalog/pixelIcons'

interface AddFoodModalProps {
  onSubmit: (input: AddInventoryItem) => Promise<void>
}

function localDateString(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function defaultExpiryDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return localDateString(date)
}

export function AddFoodModal({ onSubmit }: AddFoodModalProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1个')
  const [storage, setStorage] = useState('冷藏室')
  const [addedDate, setAddedDate] = useState(() => localDateString(new Date()))
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ name, quantity, storage, expiryDate, addedDate })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '添加失败，请重试')
      setSubmitting(false)
    }
  }

  return (
    <form className="add-food-form" onSubmit={submit}>
      <fieldset className="food-choice-fieldset">
        <legend>常用食物</legend>
        <div className="food-choice-grid">
          {foodCatalogEntries.map((food) => (
            <button
              className={name === food.name ? 'selected' : ''}
              type="button"
              key={food.key}
              onClick={() => {
                setName(food.name)
                setQuantity(food.quantity)
              }}
            >
              <img src={svgDataUrl(FOOD_SVGS[food.key])} alt="" />
              <span>{food.name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        <span>食物名称</span>
        <input
          autoFocus
          required
          maxLength={32}
          value={name}
          placeholder="例如：鸡蛋"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        <span>数量</span>
        <input
          required
          maxLength={32}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </label>
      <label>
        <span>存放位置</span>
        <select
          value={storage}
          onChange={(event) => setStorage(event.target.value)}
        >
          <option>冷藏室</option>
          <option>冷冻室</option>
          <option>果蔬区</option>
        </select>
      </label>
      <label>
        <span>买入 / 录入日期</span>
        <input
          required
          type="date"
          max={localDateString(new Date())}
          value={addedDate}
          onChange={(event) => setAddedDate(event.target.value)}
        />
      </label>
      <label>
        <span>到期日期</span>
        <input
          required
          type="date"
          min={addedDate}
          value={expiryDate}
          onChange={(event) => setExpiryDate(event.target.value)}
        />
      </label>
      {error ? <div className="add-food-error">{error}</div> : null}
      <button className="add-food-submit" type="submit" disabled={submitting}>
        {submitting ? '正在同步...' : '确认添加'}
      </button>
    </form>
  )
}
