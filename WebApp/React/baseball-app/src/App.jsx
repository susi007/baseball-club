
import { useEffect, useState } from 'react'
import './App.css'
import Auth from './Auth'
import { supabase } from './lib/supabaseClient'

// 管理者のメールアドレス一覧
const ADMIN_EMAILS = [
  'susi007garu@gmail.com',
]

const categories = [
  { value: '練習玉', label: '練習球' },
  { value: '公認球', label: '公認球' },
  { value: 'バット', label: 'バット' },
  { value: '防具', label: '防具' },
  { value: 'ヘルメット', label: 'ヘルメット' },
  { value: 'グローブ', label: 'グローブ' },
  { value: 'グラウンド', label: 'グラウンド' },
]

function getToday() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(date) {
  return String(date).slice(0, 10)
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase())

  useEffect(() => {
    // 現在のログイン状態を確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    // ログイン・ログアウトを監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 以下は既存のコードを続ける
  const [incomeRecords, setIncomeRecords] = useState([])
  const [inventory, setInventory] = useState([])

  const [incomeDate, setIncomeDate] = useState(getToday())
  const [incomeName, setIncomeName] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [people, setPeople] = useState('1')

  const [itemDate, setItemDate] = useState(getToday())
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [itemAmount, setItemAmount] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [owner, setOwner] = useState('')

  const [ownerFilter, setOwnerFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Supabaseから収入と備品を取得
  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function loadData() {
      try {
        const [incomeResult, inventoryResult] = await Promise.all([
          supabase.from('income').select('*').order('id'),
          supabase.from('inventory').select('*').order('id'),
        ])

        if (incomeResult.error) throw incomeResult.error
        if (inventoryResult.error) throw inventoryResult.error

        if (!cancelled) {
          setIncomeRecords(incomeResult.data)
          setInventory(inventoryResult.data)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [user])


  // 収入合計
  const totalIncome = incomeRecords.reduce(
    (total, record) =>
      total + Number(record.amount) * Number(record.people),
    0
  )

  // 備品購入額の合計
  const totalExpense = inventory.reduce(
    (total, item) =>
      total + Number(item.amount) * Number(item.quantity),
    0
  )

  // 残高
  const balance = totalIncome - totalExpense

  // 収入登録
  async function handleIncomeSubmit(event) {
    event.preventDefault()
    setError('')

    const data = {
      date: incomeDate,
      name: incomeName.trim(),
      amount: Number(incomeAmount),
      people: Number(people),
    }

    try {
      const { data: savedRecord, error: insertError } = await supabase
        .from('income')
        .insert(data)
        .select()
        .single()

      if (insertError) throw insertError

      setIncomeRecords((current) => [...current, savedRecord])

      setIncomeAmount('')
      setIncomeName('')
      setPeople('1')
      setIncomeDate(getToday())
    } catch (err) {
      setError(err.message)
    }
  }

  // 備品登録
  async function handleInventorySubmit(event) {
    event.preventDefault()
    setError('')

    const data = {
      date: itemDate,
      name: name.trim(),
      category,
      amount: Number(itemAmount),
      quantity: Number(quantity),
      owner: owner.trim(),
    }

    try {
      const { data: savedItem, error: insertError } = await supabase
        .from('inventory')
        .insert(data)
        .select()
        .single()

      if (insertError) throw insertError
      setInventory((current) => [...current, savedItem])

      setItemDate(getToday())
      setName('')
      setCategory('')
      setItemAmount('')
      setQuantity('1')
      setOwner('')
    } catch (err) {
      setError(err.message)
    }
  }



  // 削除確認画面を開く
  function openDeleteDialog(type, item) {
    setDeleteTarget({ type, item })
  }

  function openEditDialog(type, item) {
    setError('')
    setEditError('')
    setEditTarget({ type, item })
    setEditForm(
      type === 'income'
        ? {
          date: formatDate(item.date),
          name: item.name ?? '',
          amount: String(item.amount),
          people: String(item.people),
        }
        : {
          date: formatDate(item.date),
          name: item.name,
          category: item.category,
          amount: String(item.amount),
          quantity: String(item.quantity),
          owner: item.owner,
        }
    )
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!editTarget) return

    const { type, item } = editTarget
    const table = type === 'income' ? 'income' : 'inventory'
    const data =
      type === 'income'
        ? {
          date: editForm.date,
          name: editForm.name.trim(),
          amount: Number(editForm.amount),
          people: Number(editForm.people),
        }
        : {
          date: editForm.date,
          name: editForm.name.trim(),
          category: editForm.category,
          amount: Number(editForm.amount),
          quantity: Number(editForm.quantity),
          owner: editForm.owner.trim(),
        }

    setEditError('')
    setIsSavingEdit(true)

    try {
      const { data: updatedItem, error: updateError } = await supabase
        .from(table)
        .update(data)
        .eq('id', item.id)
        .select()
        .single()

      if (updateError) throw updateError

      if (type === 'income') {
        setIncomeRecords((current) =>
          current.map((record) =>
            record.id === item.id ? updatedItem : record
          )
        )
      } else {
        setInventory((current) =>
          current.map((savedItem) =>
            savedItem.id === item.id ? updatedItem : savedItem
          )
        )
      }

      setEditTarget(null)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // 削除確認画面で「削除する」を押したとき
  async function confirmDelete() {
    if (!deleteTarget) return

    const { type, item } = deleteTarget
    const table =
      type === 'income' ? 'income' : 'inventory'

    setError('')

    try {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id)
        .select('id')
        .single()

      if (deleteError) throw deleteError

      if (type === 'income') {
        setIncomeRecords((current) =>
          current.filter((record) => record.id !== item.id)
        )
      } else {
        setInventory((current) =>
          current.filter((savedItem) => savedItem.id !== item.id)
        )
      }

      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
    }
  }


  // 絞り込みに使う所持者一覧
  const owners = [...new Set(inventory.map((item) => item.owner))]

  // 絞り込み後の備品一覧
  const filteredInventory = inventory.filter((item) => {
    const matchesOwner = !ownerFilter || item.owner === ownerFilter
    const matchesCategory =
      !categoryFilter || item.category === categoryFilter

    return matchesOwner && matchesCategory
  })

  if (authLoading) {
    return (
      <main className="auth-page">
        <p className="auth-loading" role="status">
          ログイン状態を確認しています...
        </p>
      </main>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="app">
      <header className="header">
        <h1>備品管理リスト</h1>

        <div>
          <span>{user.email}</span>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="main">
        {error && <p className="error">{error}</p>}

        <section>
          <h2>収支状況</h2>
          <div className="summary-cards">
            <div className="card">
              <h3>収入</h3>
              <p>¥{totalIncome.toLocaleString()}</p>
            </div>
            <div className="card">
              <h3>支出</h3>
              <p>¥{totalExpense.toLocaleString()}</p>
            </div>
            <div className="card">
              <h3>残高</h3>
              <p>¥{balance.toLocaleString()}</p>
            </div>
          </div>
        </section>

        {isAdmin && (
          <section>
            <h2>収入登録</h2>
            <form onSubmit={handleIncomeSubmit} className="app-form">
              <label>
                日付
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(event) => setIncomeDate(event.target.value)}
                  required
                />
              </label>

              <label>
                名目
                <input
                  type="text"
                  value={incomeName}
                  onChange={(event) => setIncomeName(event.target.value)}
                  placeholder="例：部費"
                  required
                />
              </label>

              <label>
                1人あたりの金額（円）
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={incomeAmount}
                  onChange={(event) => setIncomeAmount(event.target.value)}
                  placeholder="例：1000"
                  required
                />
              </label>

              <label>
                人数
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={people}
                  onChange={(event) => setPeople(event.target.value)}
                  required
                />
              </label>

              <p className="calculated-total">
                登録予定金額：
                ¥{(
                  (Number(incomeAmount) || 0) * (Number(people) || 0)
                ).toLocaleString()}
              </p>

              <button type="submit">収入を登録</button>
            </form>
          </section>
        )}

        <section>
          <h2>収入一覧</h2>
          {loading ? (
            <p>読み込み中...</p>
          ) : incomeRecords.length === 0 ? (
            <p>登録された収入はありません。</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>名目</th>
                    <th>1人あたり</th>
                    <th>人数</th>
                    <th>合計金額</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.date)}</td>
                      <td>{record.name || '未設定'}</td>
                      <td>¥{Number(record.amount).toLocaleString()}</td>
                      <td>{record.people}人</td>
                      <td>
                        ¥{(
                          Number(record.amount) * Number(record.people)
                        ).toLocaleString()}
                      </td>
                      <td>
                        {isAdmin && (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => openEditDialog('income', record)}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => openDeleteDialog('income', record)}
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </section>

        {isAdmin && (
          <section>
            <h2>備品登録</h2>

            <form onSubmit={handleInventorySubmit} className="app-form">
              <label>
                日付
                <input
                  type="date"
                  value={itemDate}
                  onChange={(event) => setItemDate(event.target.value)}
                  required
                />
              </label>

              <label>
                名前
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="備品の名前"
                  required
                />
              </label>

              <label>
                カテゴリー
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                >
                  <option value="">カテゴリーを選択</option>
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                購入額（円）
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={itemAmount}
                  onChange={(event) => setItemAmount(event.target.value)}
                  placeholder="例：1500"
                  required
                />
              </label>

              <label>
                個数
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                />
              </label>

              <label>
                所持者
                <input
                  type="text"
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  placeholder="所持者の名前"
                  required
                />
              </label>

              <p className="calculated-total">
                購入合計：
                ¥{(
                  (Number(itemAmount) || 0) * (Number(quantity) || 0)
                ).toLocaleString()}
              </p>

              <button type="submit">備品を登録</button>
            </form>
          </section>
        )}

        <section>
          <h2>備品一覧</h2>

          <div className="filter-area">
            <label>
              所持者で絞り込み
              <select
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
              >
                <option value="">すべて</option>
                {owners.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </label>

            <label>
              カテゴリーで絞り込み
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="">すべて</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p>読み込み中...</p>
          ) : filteredInventory.length === 0 ? (
            <p>該当する備品はありません。</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>名前</th>
                    <th>カテゴリー</th>
                    <th>購入額</th>
                    <th>個数</th>
                    <th>支出</th>
                    <th>所持者</th>
                    <th>操作</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.name}</td>
                      <td>
                        {categories.find(
                          (option) => option.value === item.category
                        )?.label || item.category}
                      </td>
                      <td>¥{Number(item.amount).toLocaleString()}</td>
                      <td>{item.quantity}</td>
                      <td>
                        ¥{(
                          Number(item.amount) * Number(item.quantity)
                        ).toLocaleString()}
                      </td>
                      <td>{item.owner}</td>
                      <td>
                        {isAdmin && (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => openEditDialog('inventory', item)}
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => openDeleteDialog('inventory', item)}
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </section>

        {editTarget && (
          <div className="modal-overlay">
            <form
              className="delete-modal edit-modal"
              onSubmit={handleEditSubmit}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-modal-title"
            >
              <h2 id="edit-modal-title">
                {editTarget.type === 'income' ? '収入の編集' : '備品の編集'}
              </h2>

              {editError && (
                <p className="error edit-error" role="alert">
                  {editError}
                </p>
              )}

              <div className="edit-form-fields">
                <label>
                  日付
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                {editTarget.type === 'income' ? (
                  <>
                    <label>
                      名目
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      1人あたりの金額（円）
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.amount}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      人数
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.people}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            people: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      名前
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      カテゴリー
                      <select
                        value={editForm.category}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="">カテゴリーを選択</option>
                        {categories.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      購入額（円）
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editForm.amount}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      個数
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editForm.quantity}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            quantity: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      所持者
                      <input
                        type="text"
                        value={editForm.owner}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            owner: event.target.value,
                          }))
                        }
                        required
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setEditTarget(null)}
                  disabled={isSavingEdit}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? '保存中...' : '変更を保存'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 削除確認ダイアログ */}
        {deleteTarget && (
          <div className="modal-overlay">
            <div
              className="delete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
            >
              <h2 id="delete-modal-title">削除の確認</h2>

              <p>
                {deleteTarget.type === 'income'
                  ? `${formatDate(deleteTarget.item.date)}の収入を削除しますか？`
                  : `「${deleteTarget.item.name}」を削除しますか？`}
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setDeleteTarget(null)}
                >
                  キャンセル
                </button>

                <button
                  type="button"
                  className="confirm-delete-button"
                  onClick={confirmDelete}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App
