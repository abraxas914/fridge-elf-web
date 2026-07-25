import { type FormEvent, useState } from 'react'
import type { AddInventoryItem } from '../../bridge/types'

interface AddFoodModalProps {
  onSubmit: (input: AddInventoryItem) => Promise<void>
}

function defaultExpiryDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().slice(0, 10)
}

export function AddFoodModal({ onSubmit }: AddFoodModalProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('1个')
  const [storage, setStorage] = useState('冷藏室')
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({ name, quantity, storage, expiryDate })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '添加失败，请重试')
      setSubmitting(false)
    }
  }

  return (
    <form className="add-food-form" onSubmit={submit}>
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
        <span>到期日期</span>
        <input
          required
          type="date"
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
