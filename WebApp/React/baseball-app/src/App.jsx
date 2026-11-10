
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import './App.css'
import Auth from './Auth'
import { supabase } from './lib/supabaseClient'

// 管理者のメールアドレス一覧
const ADMIN_EMAILS = [
  'susi007garu@gmail.com',
  'komesouta@gmail.com',
  'tigertora7571@gmail.com'
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

function App({ darkMode, onDarkModeChange }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [profileUserId, setProfileUserId] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0)
  const [nickname, setNickname] = useState('')
  const [isSavingNickname, setIsSavingNickname] = useState(false)
  const [isSummaryCompact, setIsSummaryCompact] = useState(false)
  const [activeManagementTab, setActiveManagementTab] = useState('income')
  const [isAccountInfoVisible, setIsAccountInfoVisible] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const successMessageTimer = useRef(null)

  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase())

  useEffect(() => {
    function updateSummarySize() {
      setIsSummaryCompact(window.scrollY > 80)
    }

    updateSummarySize()
    window.addEventListener('scroll', updateSummarySize, { passive: true })
    return () => window.removeEventListener('scroll', updateSummarySize)
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(successMessageTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function loadProfiles() {
      setProfileLoading(true)
      setProfileLoadError('')

      try {
        const [profileResult, profilesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, nickname')
            .eq('id', user.id)
            .maybeSingle(),
          supabase.from('profiles').select('id, nickname').order('nickname'),
        ])

        if (profileResult.error) throw profileResult.error
        if (profilesResult.error) throw profilesResult.error

        if (!cancelled) {
          setProfile(profileResult.data)
          setProfiles(profilesResult.data)
        }
      } catch (err) {
        if (!cancelled) setProfileLoadError(err.message)
      } finally {
        if (!cancelled) {
          setProfileUserId(user.id)
          setProfileLoading(false)
        }
      }
    }

    loadProfiles()
    return () => {
      cancelled = true
    }
  }, [user, profileLoadAttempt])

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

  function showSuccessMessage(message) {
    window.clearTimeout(successMessageTimer.current)
    setSuccessMessage(message)
    successMessageTimer.current = window.setTimeout(() => {
      setSuccessMessage('')
      successMessageTimer.current = null
    }, 3000)
  }

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
      showSuccessMessage('収入を登録しました。')
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
      showSuccessMessage('支出を登録しました。')
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
  const ownerOptions = [...new Set(profiles.map((item) => item.nickname))]

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
        <Paper className="auth-loading" role="status">
          <CircularProgress size={24} />
          <Typography>ログイン状態を確認しています...</Typography>
        </Paper>
      </main>
    )
  }

  if (!user) {
    return <Auth />
  }

  async function handleNicknameSubmit(event) {
    event.preventDefault()
    setProfileError('')

    const trimmedNickname = nickname.trim()
    if (!trimmedNickname) {
      setProfileError('ニックネームを入力してください。')
      return
    }

    setIsSavingNickname(true)

    try {
      const { data: savedProfile, error: saveError } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, nickname: trimmedNickname },
          { onConflict: 'id' }
        )
        .select('id, nickname')
        .single()

      if (saveError) throw saveError

      setProfile(savedProfile)
      setProfiles((current) =>
        [...current.filter((item) => item.id !== savedProfile.id), savedProfile]
          .sort((left, right) => left.nickname.localeCompare(right.nickname))
      )
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setIsSavingNickname(false)
    }
  }

  if (profileLoading || profileUserId !== user.id) {
    return (
      <main className="auth-page">
        <Paper className="auth-loading" role="status">
          <CircularProgress size={24} />
          <Typography>プロフィールを確認しています...</Typography>
        </Paper>
      </main>
    )
  }

  if (profileLoadError) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="profile-error-title">
          <h1 className="auth-title" id="profile-error-title">
            プロフィールを読み込めません
          </h1>
          <Alert severity="error" role="alert">{profileLoadError}</Alert>
          <Button
            variant="contained"
            type="button"
            onClick={() => setProfileLoadAttempt((attempt) => attempt + 1)}
          >
            再読み込み
          </Button>
        </section>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="auth-page">
        <Card className="auth-card" aria-labelledby="nickname-title" elevation={4}>
          <CardContent>
          <Typography className="auth-brand" component="p" variant="overline">BASEBALL CLUB</Typography>
          <Typography className="auth-title" component="h1" id="nickname-title" variant="h5">
            ニックネーム登録
          </Typography>
          <Typography className="auth-description">
            備品の所有者として表示するニックネームを設定してください。
          </Typography>
          <form className="auth-form" onSubmit={handleNicknameSubmit}>
            <TextField
              id="profile-nickname"
              label="ニックネーム"
              type="text"
              autoComplete="nickname"
              fullWidth
              variant="outlined"
              inputProps={{ maxLength: 30 }}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
            <Button
              variant="contained"
              type="submit"
              className="auth-submit"
              disabled={isSavingNickname}
            >
              {isSavingNickname ? '登録中...' : 'ニックネームを登録'}
            </Button>
          </form>
          {profileError && <Alert severity="error">{profileError}</Alert>}
          <Button
            variant="text"
            className="auth-toggle"
            type="button"
            onClick={() => supabase.auth.signOut()}
          >
            ログアウト
          </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <Typography component="h1" variant="h4">支出管理リスト</Typography>
          <FormControlLabel
            className="theme-switch"
            control={
              <Switch
                checked={darkMode}
                onChange={(event) => onDarkModeChange(event.target.checked)}
                inputProps={{ 'aria-label': 'ダークモード' }}
              />
            }
            label="ダークモード"
          />
        </div>

        <div className="header-account">
          <Typography component="span" className="account-nickname" variant="subtitle1">
            {profile.nickname}
          </Typography>
          <span
            id="account-email"
            className="account-email"
            aria-label={
              isAccountInfoVisible ? user.email : 'メールアドレス非表示'
            }
          >
            <span
              className="account-email-value"
              data-visible={isAccountInfoVisible}
              aria-hidden="true"
            >
              {user.email}
            </span>
            {!isAccountInfoVisible && (
              <span className="account-email-mask" aria-hidden="true">
                {user.email?.replace(/[^@]/g, '•')}
              </span>
            )}
          </span>
          <Tooltip title={isAccountInfoVisible ? 'メールアドレスを隠す' : 'メールアドレスを表示'}>
          <IconButton
            className="account-visibility-button"
            size="small"
            aria-label={
              isAccountInfoVisible ? 'メールアドレスを隠す' : 'メールアドレスを表示'
            }
            aria-pressed={isAccountInfoVisible}
            aria-controls="account-email"
            onClick={() =>
              setIsAccountInfoVisible((visible) => !visible)
            }
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isAccountInfoVisible ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.3 3.4" />
                  <path d="M6.2 6.2C3.9 7.6 2.7 9.8 2.5 12c.5 1.4 1.5 2.8 3 4a10 10 0 006.5 2c1 0 1.9-.2 2.8-.5" />
                </>
              ) : (
                <>
                  <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            type="button"
            onClick={() => supabase.auth.signOut()}
          >
            ログアウト
          </Button>
        </div>
      </header>

      <main className="main">
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <section
          className={`summary-section${isSummaryCompact ? ' is-compact' : ''}`}
        >
          <Typography component="h2" variant="h6">収支状況</Typography>
          <div className="summary-cards">
            {[
              { label: '収入', value: totalIncome, color: 'primary' },
              { label: '支出', value: totalExpense, color: 'secondary' },
              { label: '残高', value: balance, color: 'primary' },
            ].map((item) => (
              <Card className={`card summary-${item.color}`} key={item.label}>
                <CardContent>
                  <Typography component="h3" variant="subtitle2" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography component="p" variant="h5" fontWeight={700}>
                    ¥{item.value.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Tabs
          className="management-tabs"
          value={activeManagementTab}
          onChange={(_event, value) => setActiveManagementTab(value)}
          aria-label="管理項目"
          variant="fullWidth"
        >
          <Tab id="income-tab" aria-controls="income-panel" value="income" label="収入管理" />
          <Tab id="expense-tab" aria-controls="expense-panel" value="expense" label="支出管理" />
        </Tabs>

        <Paper
          elevation={0}
          className="management-area income-area"
          id="income-panel"
          role="tabpanel"
          aria-labelledby="income-tab"
          tabIndex={0}
          hidden={activeManagementTab !== 'income'}
        >
          {isAdmin && (
          <section className="management-panel">
            <Typography component="h3" variant="h6">収入登録</Typography>
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

              <output className="calculated-total">
                <span>登録予定金額</span>
                <strong>
                  ¥{(
                    (Number(incomeAmount) || 0) * (Number(people) || 0)
                  ).toLocaleString()}
                </strong>
              </output>

              <Button type="submit" variant="contained">収入を登録</Button>
            </form>
          </section>
          )}

        <section className="management-panel">
          <Typography component="h3" id="income-list-heading" variant="h6">収入一覧</Typography>
          {loading ? (
            <Typography>読み込み中...</Typography>
          ) : incomeRecords.length === 0 ? (
            <Typography>登録された収入はありません。</Typography>
          ) : (
            <ul className="record-list" aria-labelledby="income-list-heading">
              {incomeRecords.map((record) => (
                <Card component="li" className="record-card" key={record.id}>
                  <CardContent>
                  <div className="record-card-heading">
                    <h4>{record.name || '未設定'}</h4>
                    <time dateTime={formatDate(record.date)}>
                      {formatDate(record.date)}
                    </time>
                  </div>
                  <dl className="record-details">
                    <div>
                      <dt>1人あたり</dt>
                      <dd>¥{Number(record.amount).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>人数</dt>
                      <dd>{record.people}人</dd>
                    </div>
                    <div className="record-total">
                      <dt>合計金額</dt>
                      <dd>
                        ¥{(
                          Number(record.amount) * Number(record.people)
                        ).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  {isAdmin && (
                    <div className="row-actions">
                      <Button
                        variant="outlined"
                        size="small"
                        type="button"
                        className="edit-button"
                        onClick={() => openEditDialog('income', record)}
                      >
                        編集
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        type="button"
                        className="delete-button"
                        onClick={() => openDeleteDialog('income', record)}
                      >
                        削除
                      </Button>
                    </div>
                  )}
                  </CardContent>
                </Card>
              ))}
            </ul>
          )}
        </section>
        </Paper>

        <Paper
          elevation={0}
          className="management-area inventory-area"
          id="expense-panel"
          role="tabpanel"
          aria-labelledby="expense-tab"
          tabIndex={0}
          hidden={activeManagementTab !== 'expense'}
        >
          {isAdmin && (
          <section className="management-panel">
            <Typography component="h3" variant="h6">支出登録</Typography>

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
                <select
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  required
                >
                  <option value="">ニックネームを選択</option>
                  {ownerOptions.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              </label>

              <output className="calculated-total">
                <span>購入合計金額</span>
                <strong>
                  ¥{(
                    (Number(itemAmount) || 0) * (Number(quantity) || 0)
                  ).toLocaleString()}
                </strong>
              </output>

              <Button type="submit" variant="contained">支出を登録</Button>
            </form>
          </section>
          )}

        <section className="management-panel">
          <Typography component="h3" id="expense-list-heading" variant="h6">支出一覧</Typography>

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
            <Typography>読み込み中...</Typography>
          ) : filteredInventory.length === 0 ? (
            <Typography>該当する備品はありません。</Typography>
          ) : (
            <ul className="record-list" aria-labelledby="expense-list-heading">
              {filteredInventory.map((item) => (
                <Card component="li" className="record-card" key={item.id}>
                  <CardContent>
                  <div className="record-card-heading">
                    <h4>{item.name}</h4>
                    <time dateTime={formatDate(item.date)}>
                      {formatDate(item.date)}
                    </time>
                  </div>
                  <dl className="record-details">
                    <div>
                      <dt>カテゴリー</dt>
                      <dd>
                        {categories.find(
                          (option) => option.value === item.category
                        )?.label || item.category}
                      </dd>
                    </div>
                    <div>
                      <dt>購入額</dt>
                      <dd>¥{Number(item.amount).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt>個数</dt>
                      <dd>{item.quantity}</dd>
                    </div>
                    <div>
                      <dt>所持者</dt>
                      <dd>{item.owner}</dd>
                    </div>
                    <div className="record-total">
                      <dt>支出</dt>
                      <dd>
                        ¥{(
                          Number(item.amount) * Number(item.quantity)
                        ).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  {isAdmin && (
                    <div className="row-actions">
                      <Button
                        variant="outlined"
                        size="small"
                        type="button"
                        className="edit-button"
                        onClick={() => openEditDialog('inventory', item)}
                      >
                        編集
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        type="button"
                        className="delete-button"
                        onClick={() => openDeleteDialog('inventory', item)}
                      >
                        削除
                      </Button>
                    </div>
                  )}
                  </CardContent>
                </Card>
              ))}
            </ul>
          )}
        </section>
        </Paper>

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
                {editTarget.type === 'income' ? '収入の編集' : '支出の編集'}
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
                      <select
                        value={editForm.owner}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            owner: event.target.value,
                          }))
                        }
                        required
                      >
                        {!ownerOptions.includes(editForm.owner) && (
                          <option value={editForm.owner}>
                            {editForm.owner}
                          </option>
                        )}
                        {ownerOptions.map((person) => (
                          <option key={person} value={person}>
                            {person}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>

              <div className="modal-actions">
                <Button
                  variant="outlined"
                  type="button"
                  className="cancel-button"
                  onClick={() => setEditTarget(null)}
                  disabled={isSavingEdit}
                >
                  キャンセル
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  className="save-button"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? '保存中...' : '変更を保存'}
                </Button>
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
                <Button
                  variant="outlined"
                  type="button"
                  className="cancel-button"
                  onClick={() => setDeleteTarget(null)}
                >
                  キャンセル
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  type="button"
                  className="confirm-delete-button"
                  onClick={confirmDelete}
                >
                  削除
                </Button>
              </div>
            </div>
          </div>
        )}

      </main>
      {successMessage && (
        <Alert className="success-toast" severity="success" variant="filled" role="status" aria-live="polite">
          {successMessage}
        </Alert>
      )}
    </div>
  )
}

export default App
