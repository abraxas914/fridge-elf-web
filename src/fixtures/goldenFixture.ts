import type { FoodKey } from '../catalog/foodCatalog'

export interface GoldenFood {
  id: string
  key: FoodKey
  name: string
  englishName: string
  category: 'ingredient' | 'drink' | 'other'
  kcal: number
  quantity: string
  addedDaysAgo: number
  expiresInDays: number
  expiryDate: string
  storage: 'fridge'
}

export const GOLDEN_FOODS: readonly GoldenFood[] = [
  { id: 'food-cabbage', key: 'cabbage', name: '白菜', englishName: 'Cabbage', category: 'ingredient', kcal: 25, quantity: '半颗', addedDaysAgo: 3, expiresInDays: 5, expiryDate: '2026-07-29', storage: 'fridge' },
  { id: 'food-carrot', key: 'carrot', name: '胡萝卜', englishName: 'Carrot', category: 'ingredient', kcal: 41, quantity: '3根', addedDaysAgo: 1, expiresInDays: 7, expiryDate: '2026-07-31', storage: 'fridge' },
  { id: 'food-tomato', key: 'tomato', name: '番茄', englishName: 'Tomato', category: 'ingredient', kcal: 18, quantity: '4个', addedDaysAgo: 2, expiresInDays: 1, expiryDate: '2026-07-25', storage: 'fridge' },
  { id: 'food-cucumber', key: 'cucumber', name: '黄瓜', englishName: 'Cucumber', category: 'ingredient', kcal: 15, quantity: '2根', addedDaysAgo: 5, expiresInDays: 3, expiryDate: '2026-07-27', storage: 'fridge' },
  { id: 'food-potato', key: 'potato', name: '土豆', englishName: 'Potato', category: 'ingredient', kcal: 77, quantity: '5个', addedDaysAgo: 7, expiresInDays: 14, expiryDate: '2026-08-07', storage: 'fridge' },
  { id: 'food-onion', key: 'onion', name: '洋葱', englishName: 'Onion', category: 'ingredient', kcal: 40, quantity: '2个', addedDaysAgo: 4, expiresInDays: 10, expiryDate: '2026-08-03', storage: 'fridge' },
  { id: 'food-apple', key: 'apple', name: '苹果', englishName: 'Apple', category: 'ingredient', kcal: 52, quantity: '4个', addedDaysAgo: 1, expiresInDays: 6, expiryDate: '2026-07-30', storage: 'fridge' },
  { id: 'food-banana', key: 'banana', name: '香蕉', englishName: 'Banana', category: 'ingredient', kcal: 89, quantity: '3根', addedDaysAgo: 3, expiresInDays: 2, expiryDate: '2026-07-26', storage: 'fridge' },
  { id: 'food-grape', key: 'grape', name: '葡萄', englishName: 'Grape', category: 'ingredient', kcal: 69, quantity: '一串', addedDaysAgo: 2, expiresInDays: 4, expiryDate: '2026-07-28', storage: 'fridge' },
  { id: 'food-strawberry', key: 'strawberry', name: '草莓', englishName: 'Strawberry', category: 'ingredient', kcal: 33, quantity: '一盒', addedDaysAgo: 1, expiresInDays: 1, expiryDate: '2026-07-25', storage: 'fridge' },
  { id: 'food-beef', key: 'beef', name: '牛肉', englishName: 'Beef', category: 'ingredient', kcal: 250, quantity: '500g', addedDaysAgo: 2, expiresInDays: 3, expiryDate: '2026-07-27', storage: 'fridge' },
  { id: 'food-chicken', key: 'chicken', name: '鸡腿', englishName: 'Chicken', category: 'ingredient', kcal: 239, quantity: '4只', addedDaysAgo: 1, expiresInDays: 2, expiryDate: '2026-07-26', storage: 'fridge' },
  { id: 'food-salmon', key: 'salmon', name: '三文鱼', englishName: 'Salmon', category: 'ingredient', kcal: 206, quantity: '300g', addedDaysAgo: 0, expiresInDays: 1, expiryDate: '2026-07-25', storage: 'fridge' },
  { id: 'food-shrimp', key: 'shrimp', name: '虾仁', englishName: 'Shrimp', category: 'ingredient', kcal: 99, quantity: '200g', addedDaysAgo: 1, expiresInDays: 2, expiryDate: '2026-07-26', storage: 'fridge' },
  { id: 'food-egg', key: 'egg', name: '鸡蛋', englishName: 'Egg', category: 'other', kcal: 155, quantity: '10个', addedDaysAgo: 3, expiresInDays: 20, expiryDate: '2026-08-13', storage: 'fridge' },
  { id: 'food-milk', key: 'milk', name: '牛奶', englishName: 'Milk', category: 'drink', kcal: 42, quantity: '1L', addedDaysAgo: 2, expiresInDays: 5, expiryDate: '2026-07-29', storage: 'fridge' },
  { id: 'food-cheese', key: 'cheese', name: '芝士', englishName: 'Cheese', category: 'other', kcal: 402, quantity: '200g', addedDaysAgo: 5, expiresInDays: 30, expiryDate: '2026-08-23', storage: 'fridge' },
  { id: 'food-butter', key: 'butter', name: '黄油', englishName: 'Butter', category: 'other', kcal: 717, quantity: '250g', addedDaysAgo: 10, expiresInDays: 60, expiryDate: '2026-09-22', storage: 'fridge' },
]

export const RECIPES = [
  {
    id: 'recipe-tomato-egg-bowl',
    key: 'tomato',
    name: 'TOMATO EGG BOWL',
    cn: '番茄鸡蛋轻食碗',
    kcal: 320,
    time: 15,
    tags: ['轻食', '高蛋白'],
    match: true,
    need: ['tomato', 'egg'],
    desc: '冰箱里的番茄和鸡蛋刚好搭一碗。淋一点橄榄油，撒黑胡椒，10 分钟出锅。',
  },
  {
    id: 'recipe-veggie-noodle',
    key: 'cabbage',
    name: 'VEGGIE NOODLE',
    cn: '白菜胡萝卜汤面',
    kcal: 410,
    time: 20,
    tags: ['家常', '热汤'],
    match: true,
    need: ['cabbage', 'carrot', 'egg'],
    desc: '快过期的白菜别扔！切丝下锅，配胡萝卜和一颗溏心蛋，暖胃低脂。',
  },
  {
    id: 'recipe-salmon-rice',
    key: 'salmon',
    name: 'SALMON RICE',
    cn: '三文鱼谷物碗',
    kcal: 520,
    time: 25,
    tags: ['健身', 'omega-3'],
    match: false,
    need: ['salmon', 'cucumber', 'rice'],
    desc: '三文鱼今天到期！煎香后铺在藜麦饭上，配黄瓜片，健身党的黄金餐。',
  },
  {
    id: 'recipe-banana-pancake',
    key: 'banana',
    name: 'BANANA PANCAKE',
    cn: '香蕉燕麦松饼',
    kcal: 280,
    time: 12,
    tags: ['早餐', '无糖'],
    match: true,
    need: ['banana', 'egg', 'oat'],
    desc: '香蕉快熟过头？压成泥拌燕麦粉煎成饼，甜度自带无需加糖。',
  },
  {
    id: 'recipe-hearty-stew',
    key: 'potato',
    name: 'HEARTY STEW',
    cn: '土豆牛肉炖菜',
    kcal: 640,
    time: 60,
    tags: ['慢炖', '家庭'],
    match: false,
    need: ['potato', 'beef', 'carrot', 'onion'],
    desc: '周末慢炖锅版本，土豆、胡萝卜、洋葱和牛肉一起炖到入口即化。',
  },
] as const

export const SHOP_ITEMS = [
  { id: 'shop-milk', key: 'milk', name: '牛奶', reason: 'ALMOST OUT · 剩 1L', quantity: '2L', done: false },
  { id: 'shop-apple', key: 'apple', name: '苹果', reason: 'WEEKLY FAV · 每周必买', quantity: '6个', done: false },
  { id: 'shop-egg', key: 'egg', name: '鸡蛋', reason: 'RUNNING LOW · 剩 3 个', quantity: '12个', done: false },
  { id: 'shop-butter', key: 'butter', name: '黄油', reason: 'BAKING NEXT WEEK', quantity: '250g', done: true },
  { id: 'shop-tomato', key: 'tomato', name: '番茄', reason: 'RECIPE MATCH · 番茄蛋碗', quantity: '4个', done: false },
] as const

export const MESSAGES = [
  { id: 'message-mom', name: 'MOM', avatar: 'person-b', text: '汤在保鲜盒里 微波炉热 2 分钟', time: '今天 12:04' },
  { id: 'message-alice', name: 'ALICE', avatar: 'person', text: '刚买的水果在冰箱里 记得吃 ~ ♥', time: '今天 10:22' },
  { id: 'message-dad', name: 'DAD', avatar: 'person-a', text: '牛肉快过期啦 今晚回来吃~', time: '昨天 20:15' },
] as const

export const PLANNER_DAYS = [
  { key: 'mon', label: '一' },
  { key: 'tue', label: '二' },
  { key: 'wed', label: '三', today: true },
  { key: 'thu', label: '四' },
  { key: 'fri', label: '五' },
  { key: 'sat', label: '六' },
  { key: 'sun', label: '日' },
] as const
