
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
  { value: '練習球', label: '練習球' },
  { value: '公認球', label: '公認球' },
  { value: 'バット', label: 'バット' },
  { value: '防具', label: '防具' },
  { value: 'ヘルメット', label: 'ヘルメット' },
  { value: 'グローブ', label: 'グローブ' },
  { value: 'グラウンド', label: 'グラウンド' },
  { value: 'その他', label: 'その他' },
]

const BALL_CATEGORIES = ['練習球', '公認球']
const MANAGEMENT_TAB_KEY = 'baseball-club-management-tab'
const PROFILE_CACHE_KEY = 'baseball-club-profile-cache'

function isBallCategory(category) {
  return BALL_CATEGORIES.includes(category)
}

function getSavedManagementTab() {
  const savedTab = window.sessionStorage.getItem(MANAGEMENT_TAB_KEY)
  return ['expense', 'equipment'].includes(savedTab) ? savedTab : 'income'
}

function getCachedProfileState() {
  const cachedState = window.sessionStorage.getItem(PROFILE_CACHE_KEY)
  if (!cachedState) return null

  try {
    const parsedState = JSON.parse(cachedState)
    if (
      typeof parsedState.userId !== 'string' ||
      !Array.isArray(parsedState.profiles)
    ) {
      return null
    }

    return parsedState
  } catch (error) {
    console.error('保存したプロフィール情報を読み込めませんでした。', error)
    return null
  }
}

function saveCachedProfileState(userId, profile, profiles) {
  try {
    window.sessionStorage.setItem(
      PROFILE_CACHE_KEY,
      JSON.stringify({ userId, profile, profiles })
    )
  } catch (error) {
    console.error('プロフィール情報を一時保存できませんでした。', error)
  }
}

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
  const [cachedProfileState] = useState(getCachedProfileState)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState(cachedProfileState?.profile ?? null)
  const [profiles, setProfiles] = useState(cachedProfileState?.profiles ?? [])
  const [profileUserId, setProfileUserId] = useState(
    cachedProfileState?.userId ?? null
  )
  const [profileLoading, setProfileLoading] = useState(!cachedProfileState)
  const [profileLoadError, setProfileLoadError] = useState('')
  const [profileError, setProfileError] = useState('')
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nickname, setNickname] = useState('')
  const [isSavingNickname, setIsSavingNickname] = useState(false)
  const [isSummaryCompact, setIsSummaryCompact] = useState(false)
  const [activeManagementTab, setActiveManagementTab] =
    useState(getSavedManagementTab)
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

  useEffect(() => {
    window.sessionStorage.setItem(MANAGEMENT_TAB_KEY, activeManagementTab)
  }, [activeManagementTab])

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
      const cachedState = getCachedProfileState()
      if (cachedState?.userId === user.id) {
        setProfile(cachedState.profile)
        setProfiles(cachedState.profiles)
        setProfileUserId(user.id)
        setProfileLoading(false)
      } else {
        setProfileLoading(true)
      }
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
          setProfileUserId(user.id)
          saveCachedProfileState(
            user.id,
            profileResult.data,
            profilesResult.data
          )
        }
      } catch (err) {
        if (!cancelled) {
          if (cachedState?.userId === user.id && cachedState.profile) {
            setError(err.message)
          } else {
            setProfileLoadError(err.message)
          }
        }
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
  const [equipmentItems, setEquipmentItems] = useState([])
  const [equipmentTarget, setEquipmentTarget] = useState(null)
  const [equipmentAssignments, setEquipmentAssignments] = useState([])
  const [equipmentChangedOn, setEquipmentChangedOn] = useState('')
  const [equipmentError, setEquipmentError] = useState('')
  const [isSavingEquipment, setIsSavingEquipment] = useState(false)
  const [historyTarget, setHistoryTarget] = useState(null)
  const [equipmentHistory, setEquipmentHistory] = useState([])
  const [historyError, setHistoryError] = useState('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [disposalTarget, setDisposalTarget] = useState(null)
  const [disposalManager, setDisposalManager] = useState('')
  const [disposalQuantity, setDisposalQuantity] = useState('1')
  const [disposalError, setDisposalError] = useState('')
  const [isDisposingEquipment, setIsDisposingEquipment] = useState(false)

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
  const [ballUnitCount, setBallUnitCount] = useState('1')
  const [ballUnitCountError, setBallUnitCountError] = useState('')
  const [isBallUnitCountDialogOpen, setIsBallUnitCountDialogOpen] =
    useState(false)
  const [isSavingInventory, setIsSavingInventory] = useState(false)

  const [ownerFilter, setOwnerFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [settlementStatusFilter, setSettlementStatusFilter] = useState('')
  const [equipmentManagerFilter, setEquipmentManagerFilter] = useState('')
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isSavingExpenseStatus, setIsSavingExpenseStatus] = useState(false)

  // Supabaseから収入と備品を取得
  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function loadData() {
      try {
        const [incomeResult, inventoryResult, equipmentResult] = await Promise.all([
          supabase
            .from('income')
            .select('*')
            .order('date', { ascending: false })
            .order('id', { ascending: false }),
          supabase
            .from('inventory')
            .select('*')
            .order('date', { ascending: false })
            .order('id', { ascending: false }),
          supabase
            .from('equipment_items')
            .select(
              'id, name, category, changed_on, disposed_on, balls_per_unit, disposed_quantity, equipment_assignments(manager, quantity)'
            )
            .neq('category', 'グラウンド')
            .is('disposed_on', null)
            .order('changed_on', { ascending: false })
            .order('name'),
        ])

        if (incomeResult.error) throw incomeResult.error
        if (inventoryResult.error) throw inventoryResult.error
        if (equipmentResult.error) throw equipmentResult.error

        if (!cancelled) {
          setError('')
          setIncomeRecords(incomeResult.data)
          setInventory(inventoryResult.data)
          setEquipmentItems(equipmentResult.data)
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

  // 清算済みの備品購入額のみ支出として計上
  const totalExpense = inventory.reduce(
    (total, item) =>
      item.settlement_status === 'settled'
        ? total + Number(item.amount) * Number(item.quantity)
        : total,
    0
  )

  // 残高
  const balance = totalIncome - totalExpense
  const sortedIncomeRecords = [...incomeRecords].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || right.id - left.id
  )

  function showSuccessMessage(message) {
    window.clearTimeout(successMessageTimer.current)
    setSuccessMessage(message)
    successMessageTimer.current = window.setTimeout(() => {
      setSuccessMessage('')
      successMessageTimer.current = null
    }, 3000)
  }

  async function handleExpenseStatusChange(item) {
    if (!isAdmin || isSavingExpenseStatus) return

    const settlementStatus =
      item.settlement_status === 'settled' ? 'reimbursement' : 'settled'
    setError('')
    setIsSavingExpenseStatus(true)

    try {
      const { data: updatedItem, error: updateError } = await supabase
        .from('inventory')
        .update({ settlement_status: settlementStatus })
        .eq('id', item.id)
        .select()
        .maybeSingle()

      if (updateError) throw updateError
      if (!updatedItem) {
        throw new Error(
          'ステータスを更新できませんでした。管理者権限とSupabaseの更新ポリシーを確認してください。'
        )
      }

      setInventory((current) =>
        current.map((record) =>
          record.id === item.id ? updatedItem : record
        )
      )
      showSuccessMessage(
        `「${item.name}」を${settlementStatus === 'settled' ? '清算済み' : '立替'}に変更しました。`
      )
    } catch (err) {
      const errorMessage = err.message ?? String(err)
      setError(
        /column .* does not exist|could not find the .*settlement_status.*column|schema cache/i.test(errorMessage)
          ? '支出ステータスのデータベース設定が未完了です。Supabase SQL Editorで supabase/migrations/20261112000000_add_inventory_settlement_status.sql を実行してください。'
          : errorMessage
      )
    } finally {
      setIsSavingExpenseStatus(false)
    }
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

    if (isBallCategory(category)) {
      let existingEquipment = equipmentItems.find(
        (item) => item.name === name.trim() && item.category === category
      )
      if (!existingEquipment && name.trim()) {
        try {
          const { data, error: equipmentLookupError } = await supabase
            .from('equipment_items')
            .select('id, name, category, balls_per_unit')
            .eq('name', name.trim())
            .maybeSingle()
          if (equipmentLookupError) throw equipmentLookupError
          if (data?.category === category) existingEquipment = data
        } catch (err) {
          setError(err.message)
          return
        }
      }

      setBallUnitCount(
        String(existingEquipment?.balls_per_unit ?? 1)
      )
      setBallUnitCountError('')
      setIsBallUnitCountDialogOpen(true)
      return
    }

    await saveInventoryRecord(1)
  }

  async function handleBallUnitCountSubmit(event) {
    event.preventDefault()

    const parsedBallUnitCount = Number(ballUnitCount)
    if (
      !Number.isInteger(parsedBallUnitCount) ||
      parsedBallUnitCount < 1 ||
      parsedBallUnitCount > 2147483647
    ) {
      setBallUnitCountError(
        '1単位あたりのボール数は1以上の整数で入力してください。'
      )
      return
    }

    const existingEquipment = equipmentItems.find(
      (item) => item.name === name.trim() && item.category === category
    )
    if (
      existingEquipment &&
      Number(existingEquipment.balls_per_unit) !== parsedBallUnitCount
    ) {
      setBallUnitCountError(
        'この備品には登録済みの球数/単位があります。球数を変更する場合は、備品管理の「管理者・球数を変更」から先に更新してください。'
      )
      return
    }

    setBallUnitCountError('')
    await saveInventoryRecord(parsedBallUnitCount)
  }

  async function saveInventoryRecord(ballsPerUnit) {
    setError('')
    setIsSavingInventory(true)

    const data = {
      date: itemDate,
      name: name.trim(),
      category,
      amount: Number(itemAmount),
      quantity: Number(quantity),
      owner: owner.trim(),
      balls_per_unit: ballsPerUnit,
    }

    try {
      const { data: savedItem, error: insertError } = await supabase
        .from('inventory')
        .insert(data)
        .select()
        .single()

      if (insertError) throw insertError
      setInventory((current) => [...current, savedItem])

      const { data: updatedEquipmentItems, error: equipmentLoadError } =
        await supabase
          .from('equipment_items')
          .select(
            'id, name, category, changed_on, disposed_on, balls_per_unit, disposed_quantity, equipment_assignments(manager, quantity)'
          )
          .neq('category', 'グラウンド')
          .is('disposed_on', null)
          .order('changed_on', { ascending: false })
          .order('name')
      if (equipmentLoadError) {
        setError(
          `支出は登録されましたが、備品管理の表示を更新できませんでした: ${equipmentLoadError.message}`
        )
      } else {
        setEquipmentItems(updatedEquipmentItems)
      }

      setItemDate(getToday())
      setName('')
      setCategory('')
      setItemAmount('')
      setQuantity('1')
      setOwner('')
      setBallUnitCount('1')
      setBallUnitCountError('')
      setIsBallUnitCountDialogOpen(false)
      if (!equipmentLoadError) showSuccessMessage('支出を登録しました。')
    } catch (err) {
      if (isBallCategory(category)) {
        setBallUnitCountError(err.message)
      } else {
        setError(err.message)
      }
    } finally {
      setIsSavingInventory(false)
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


  // 絞り込みに使う購入者一覧
  const owners = [...new Set(inventory.map((item) => item.owner))]
  const ownerOptions = [...new Set(profiles.map((item) => item.nickname))]

  // 絞り込み後の備品一覧
  const filteredInventory = inventory.filter((item) => {
    const matchesOwner = !ownerFilter || item.owner === ownerFilter
    const matchesCategory =
      !categoryFilter || item.category === categoryFilter
    const matchesSettlementStatus =
      !settlementStatusFilter ||
      (item.settlement_status ?? 'reimbursement') === settlementStatusFilter

    return matchesOwner && matchesCategory && matchesSettlementStatus
  }).sort(
    (left, right) =>
      right.date.localeCompare(left.date) || right.id - left.id
  )
  const sortedEquipmentItems = [...equipmentItems].sort(
    (left, right) =>
      right.changed_on.localeCompare(left.changed_on) ||
      left.name.localeCompare(right.name)
  )
  const equipmentManagerOptions = [
    ...new Set(
      equipmentItems.flatMap((item) =>
        item.equipment_assignments.map((assignment) => assignment.manager)
      )
    ),
  ].sort((left, right) => left.localeCompare(right))
  const equipmentCategoryOptions = [
    ...new Set(equipmentItems.map((item) => item.category)),
  ].sort((left, right) => left.localeCompare(right))
  const filteredEquipmentItems = sortedEquipmentItems.filter((item) => {
    const matchesManager =
      !equipmentManagerFilter ||
      item.equipment_assignments.some(
        (assignment) => assignment.manager === equipmentManagerFilter
      )
    const matchesCategory =
      !equipmentCategoryFilter || item.category === equipmentCategoryFilter

    return matchesManager && matchesCategory
  })

  function openEquipmentEditor(item) {
    setEquipmentError('')
    setEquipmentTarget(item)
    setEquipmentChangedOn(formatDate(item.changed_on))
    setEquipmentAssignments(
      item.equipment_assignments.map((assignment) => ({
        manager: assignment.manager,
        quantity: String(assignment.quantity),
      }))
    )
  }

  async function handleEquipmentSubmit(event) {
    event.preventDefault()
    if (!equipmentTarget) return

    if (equipmentAssignments.length === 0) {
      setEquipmentError('管理者と個数を1件以上登録してください。')
      return
    }

    const managers = equipmentAssignments.map((assignment) =>
      assignment.manager.trim()
    )
    if (managers.some((manager) => !manager)) {
      setEquipmentError('すべての管理者を選択してください。')
      return
    }
    if (new Set(managers).size !== managers.length) {
      setEquipmentError('同じ管理者を複数行に登録できません。')
      return
    }
    if (
      equipmentAssignments.some(
        (assignment) =>
          !Number.isInteger(Number(assignment.quantity)) ||
          Number(assignment.quantity) < 1 ||
          Number(assignment.quantity) > 2147483647
      )
    ) {
      setEquipmentError('個数は1以上2,147,483,647以下の整数を入力してください。')
      return
    }
    setEquipmentError('')
    setIsSavingEquipment(true)
    try {
      const { error: saveError } = await supabase.rpc(
        'save_equipment_assignments',
        {
          p_equipment_id: equipmentTarget.id,
          p_changed_on: equipmentChangedOn,
          p_assignments: equipmentAssignments.map((assignment) => ({
            manager: assignment.manager.trim(),
            quantity: Number(assignment.quantity),
          })),
        }
      )
      if (saveError) throw saveError

      const { data, error: loadError } = await supabase
        .from('equipment_items')
        .select(
          'id, name, category, changed_on, disposed_on, balls_per_unit, disposed_quantity, equipment_assignments(manager, quantity)'
        )
        .neq('category', 'グラウンド')
        .is('disposed_on', null)
        .order('changed_on', { ascending: false })
        .order('name')
      if (loadError) throw loadError

      setEquipmentItems(data)
      setEquipmentTarget(null)
    } catch (err) {
      setEquipmentError(err.message)
    } finally {
      setIsSavingEquipment(false)
    }
  }

  async function openEquipmentHistory(item) {
    setHistoryTarget(item)
    setEquipmentHistory([])
    setHistoryError('')
    setIsLoadingHistory(true)
    try {
      const { data, error: loadError } = await supabase
        .from('equipment_history')
        .select(
          'id, changed_on, before_state, after_state, before_balls_per_unit, after_balls_per_unit, changed_by_nickname, change_type'
        )
        .eq('equipment_id', item.id)
        .order('created_at', { ascending: false })
      if (loadError) throw loadError
      setEquipmentHistory(data)
    } catch (err) {
      setHistoryError(err.message)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  async function confirmEquipmentDisposal() {
    if (!disposalTarget) return

    setDisposalError('')
    setIsDisposingEquipment(true)
    try {
      const isBallEquipment = isBallCategory(disposalTarget.category)
      const { error: disposeError } = await supabase.rpc(
        'dispose_equipment_quantity',
        {
          p_equipment_id: disposalTarget.id,
          p_manager: disposalManager,
          p_quantity: Number(disposalQuantity),
        }
      )
      if (disposeError) throw disposeError

      const { data, error: loadError } = await supabase
        .from('equipment_items')
        .select(
          'id, name, category, changed_on, disposed_on, balls_per_unit, disposed_quantity, equipment_assignments(manager, quantity)'
        )
        .neq('category', 'グラウンド')
        .is('disposed_on', null)
        .order('changed_on', { ascending: false })
        .order('name')
      if (loadError) throw loadError
      setEquipmentItems(data)

      setDisposalTarget(null)
      showSuccessMessage(
        `${disposalManager}の割当から${disposalQuantity}${isBallEquipment ? '球' : '個'}を廃棄しました。`
      )
    } catch (err) {
      setDisposalError(err.message)
    } finally {
      setIsDisposingEquipment(false)
    }
  }

  function renderInventoryList(headingId, heading) {
    function renderExpenseStatus(item) {
      const isSettled = item.settlement_status === 'settled'
      const statusLabel = isSettled ? '清算済み' : '立替'
      const nextStatusLabel = isSettled ? '立替' : '清算済み'
      const mark = isSettled ? (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16.5 9" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M8 8h8M8 11h8m-7 5 3-4 3 4m-3-4v7" />
        </svg>
      )

      return isAdmin ? (
        <Tooltip
          title={`ステータス: ${statusLabel}（クリックして${nextStatusLabel}に変更）`}
        >
          <span className="expense-status-control-wrap">
            <IconButton
              type="button"
              className={`expense-status-mark ${isSettled ? 'is-settled' : 'is-reimbursement'}`}
              aria-label={`${item.name}: ${statusLabel}。クリックして${nextStatusLabel}に変更`}
              onClick={() => handleExpenseStatusChange(item)}
              disabled={isSavingExpenseStatus}
              size="small"
            >
              {mark}
            </IconButton>
          </span>
        </Tooltip>
      ) : (
        <span
          className={`expense-status-mark ${isSettled ? 'is-settled' : 'is-reimbursement'}`}
          role="img"
          aria-label={statusLabel}
          title={statusLabel}
        >
          {mark}
        </span>
      )
    }

    return (
      <section className="management-panel">
        <Typography component="h3" id={headingId} variant="h6">
          {heading}
        </Typography>

        <div className="filter-area">
          <label>
            購入者で絞り込み
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

          <label>
            ステータスで絞り込み
            <select
              value={settlementStatusFilter}
              onChange={(event) =>
                setSettlementStatusFilter(event.target.value)
              }
            >
              <option value="">すべて</option>
              <option value="reimbursement">立替</option>
              <option value="settled">清算済み</option>
            </select>
          </label>
        </div>

        {loading ? (
          <Typography>読み込み中...</Typography>
        ) : filteredInventory.length === 0 ? (
          <Typography>該当する備品はありません。</Typography>
        ) : (
          <ul className="record-list" aria-labelledby={headingId}>
            {filteredInventory.map((item) => (
              <Card component="li" className="record-card" key={item.id}>
                <CardContent>
                  <div className="record-card-heading">
                    <div className="record-name-status">
                      <h4>{item.name}</h4>
                      {renderExpenseStatus(item)}
                    </div>
                    <time dateTime={formatDate(item.date)}>
                      {formatDate(item.date)}
                    </time>
                  </div>
                  <dl className="record-details">
                    <div className="expense-category">
                      <dt>カテゴリー</dt>
                      <dd>
                        {categories.find(
                          (option) => option.value === item.category
                        )?.label || item.category}
                      </dd>
                    </div>
                    <div className="expense-unit-cost">
                      <dt>購入額</dt>
                      <dd>¥{Number(item.amount).toLocaleString()}</dd>
                    </div>
                    <div className="expense-quantity">
                      <dt>個数</dt>
                      <dd>{item.quantity}</dd>
                    </div>
                    <div className="expense-owner">
                      <dt>購入者</dt>
                      <dd>{item.owner}</dd>
                    </div>
                    <div className="record-total-row">
                      <div className="record-total">
                        <dt>支出</dt>
                        <dd>
                          ¥{(
                            Number(item.amount) * Number(item.quantity)
                          ).toLocaleString()}
                          <span className="unit-price">
                            {Number(item.amount).toLocaleString()}円/個
                          </span>
                        </dd>
                      </div>
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
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </ul>
        )}
      </section>
    )
  }

  function getEquipmentQuantities(item) {
    const isBallEquipment = isBallCategory(item.category)
    const assignedQuantity = item.equipment_assignments.reduce(
      (total, assignment) => total + Number(assignment.quantity),
      0
    )

    return {
      isBallEquipment,
      totalQuantity: assignedQuantity,
    }
  }

  function renderEquipmentList() {
    return (
      <section className="management-panel">
        <Typography component="h3" id="equipment-list-heading" variant="h6">
          備品一覧
        </Typography>
        {loading ? (
          <Typography>読み込み中...</Typography>
        ) : equipmentItems.length === 0 ? (
          <Typography>登録された備品はありません。</Typography>
        ) : (
          <>
            <div className="filter-area">
              <label>
                管理者で絞り込み
                <select
                  value={equipmentManagerFilter}
                  onChange={(event) =>
                    setEquipmentManagerFilter(event.target.value)
                  }
                >
                  <option value="">すべて</option>
                  {equipmentManagerOptions.map((manager) => (
                    <option key={manager} value={manager}>
                      {manager}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                カテゴリーで絞り込み
                <select
                  value={equipmentCategoryFilter}
                  onChange={(event) =>
                    setEquipmentCategoryFilter(event.target.value)
                  }
                >
                  <option value="">すべて</option>
                  {equipmentCategoryOptions.map((categoryValue) => (
                    <option key={categoryValue} value={categoryValue}>
                      {categories.find(
                        (categoryOption) =>
                          categoryOption.value === categoryValue
                      )?.label || categoryValue}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {filteredEquipmentItems.length === 0 ? (
              <Typography>条件に一致する備品はありません。</Typography>
            ) : (
          <ul className="record-list" aria-labelledby="equipment-list-heading">
            {filteredEquipmentItems.map((item) => {
              const {
                isBallEquipment,
                totalQuantity,
              } =
                getEquipmentQuantities(item)

              return (
                <Card component="li" className="record-card" key={item.id}>
                <CardContent>
                  <div className="record-card-heading">
                    <h4>{item.name}</h4>
                    <time dateTime={formatDate(item.changed_on)}>
                      変更日: {formatDate(item.changed_on)}
                    </time>
                  </div>
                  <dl className="record-details equipment-details">
                    <div className="equipment-category">
                      <dt>カテゴリー</dt>
                      <dd>
                        {categories.find(
                          (categoryOption) =>
                            categoryOption.value === item.category
                        )?.label || item.category}
                      </dd>
                    </div>
                    <div className="equipment-managers">
                      <dt>
                        管理者・{isBallEquipment ? '球数' : '個数'}
                        <span className="equipment-count-legend">
                          （割当数 / 合計{isBallEquipment ? '球数' : '個数'}）
                        </span>
                      </dt>
                      <dd>
                        {item.equipment_assignments
                          .slice()
                          .sort((left, right) =>
                            left.manager.localeCompare(right.manager)
                          )
                          .map((assignment) => (
                            <span
                              className="equipment-manager"
                              key={assignment.manager}
                            >
                              <span>{assignment.manager}</span>
                              <span className="equipment-count-fraction">
                                <strong>
                                  {assignment.quantity}
                                  {isBallEquipment ? '球' : '個'}
                                </strong>
                                <span aria-hidden="true">/</span>
                                <span>
                                  {totalQuantity}
                                  {isBallEquipment ? '球' : '個'}
                                </span>
                              </span>
                            </span>
                          ))}
                      </dd>
                    </div>
                  </dl>
                  <div className="row-actions equipment-actions">
                    <Button
                      variant="outlined"
                      size="small"
                      type="button"
                      className="edit-button"
                      onClick={() => openEquipmentEditor(item)}
                    >
                      管理者・{isBallEquipment ? '球数' : '個数'}を変更
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      type="button"
                      className="edit-button"
                      onClick={() => openEquipmentHistory(item)}
                    >
                      変更履歴
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      type="button"
                      className="delete-button"
                      onClick={() => {
                        setDisposalError('')
                        setDisposalTarget(item)
                        setDisposalManager(
                          item.equipment_assignments[0]?.manager ?? ''
                        )
                        setDisposalQuantity('1')
                      }}
                    >
                      廃棄
                    </Button>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </ul>
            )}
          </>
        )}
      </section>
    )
  }

  const equipmentAssignedQuantity = equipmentAssignments.reduce(
    (total, assignment) => total + Number(assignment.quantity || 0),
    0
  )
  const disposalManagerQuantity =
    disposalTarget?.equipment_assignments.find(
      (assignment) => assignment.manager === disposalManager
    )?.quantity ?? 0

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
      const updatedProfiles = [
        ...profiles.filter((item) => item.id !== savedProfile.id),
        savedProfile,
      ].sort((left, right) => left.nickname.localeCompare(right.nickname))
      setProfiles(updatedProfiles)
      saveCachedProfileState(user.id, savedProfile, updatedProfiles)
      setProfileUserId(user.id)
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
            備品の購入者として表示するニックネームを設定してください。
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
          <Tab id="equipment-tab" aria-controls="equipment-panel" value="equipment" label="備品管理" />
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
              {sortedIncomeRecords.map((record) => (
                <Card component="li" className="record-card" key={record.id}>
                  <CardContent>
                  <div className="record-card-heading">
                    <h4>{record.name || '未設定'}</h4>
                    <time dateTime={formatDate(record.date)}>
                      {formatDate(record.date)}
                    </time>
                  </div>
                  <dl className="record-details">
                    <div className="income-people">
                      <dt>人数</dt>
                      <dd>{record.people}人</dd>
                    </div>
                    <div className="record-total-row">
                      <div className="record-total">
                        <dt>合計金額</dt>
                        <dd>
                          ¥{(
                            Number(record.amount) * Number(record.people)
                          ).toLocaleString()}
                          <span className="unit-price">
                            ¥{Number(record.amount).toLocaleString()}/人
                          </span>
                        </dd>
                      </div>
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
                    </div>
                  </dl>
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
                購入者
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

        {renderInventoryList('expense-list-heading', '支出一覧')}
        </Paper>

        <Paper
          elevation={0}
          className="management-area inventory-area"
          id="equipment-panel"
          role="tabpanel"
          aria-labelledby="equipment-tab"
          tabIndex={0}
          hidden={activeManagementTab !== 'equipment'}
        >
          {renderEquipmentList()}
        </Paper>

        {isBallUnitCountDialogOpen && (
          <div className="modal-overlay">
            <form
              className="delete-modal equipment-modal"
              onSubmit={handleBallUnitCountSubmit}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ball-unit-count-title"
            >
              <h2 id="ball-unit-count-title">1単位あたりのボール数</h2>
              <p>
                「{name || '備品'}」1単位に入っているボールの個数を入力してください。
              </p>
              {ballUnitCountError && (
                <Alert severity="error" role="alert" sx={{ mt: 2 }}>
                  {ballUnitCountError}
                </Alert>
              )}
              <label>
                1単位あたりの球数
                <input
                  type="number"
                  min="1"
                  max="2147483647"
                  step="1"
                  value={ballUnitCount}
                  onChange={(event) => {
                    setBallUnitCount(event.target.value)
                    setBallUnitCountError('')
                  }}
                  required
                  autoFocus
                />
              </label>
              <p className="equipment-quantity-summary">
                {Number(ballUnitCount) || 0}球 ×{' '}
                {(Number(quantity) || 0).toLocaleString()}個 ={' '}
                {(
                  (Number(ballUnitCount) || 0) * (Number(quantity) || 0)
                ).toLocaleString()}
                球
              </p>
              <div className="modal-actions">
                <Button
                  variant="outlined"
                  type="button"
                  className="cancel-button"
                  onClick={() => setIsBallUnitCountDialogOpen(false)}
                  disabled={isSavingInventory}
                >
                  キャンセル
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  className="save-button"
                  disabled={isSavingInventory}
                >
                  {isSavingInventory ? '登録中...' : '球数を確定して登録'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {equipmentTarget && (
          <div className="modal-overlay">
            <form
              className="delete-modal edit-modal equipment-modal"
              onSubmit={handleEquipmentSubmit}
              role="dialog"
              aria-modal="true"
              aria-labelledby="equipment-edit-title"
            >
              <h2 id="equipment-edit-title">
                {equipmentTarget.name}の管理情報
              </h2>
              <p className="equipment-quantity-summary">
                {isBallCategory(equipmentTarget.category)
                  ? '実球数合計'
                  : '管理者割当合計'}
                : {equipmentAssignedQuantity}
                {isBallCategory(equipmentTarget.category) ? '球' : '個'}
              </p>
              {equipmentError && (
                <Alert severity="error" role="alert">
                  {equipmentError}
                </Alert>
              )}
              <label>
                変更日
                <input
                  type="date"
                  value={equipmentChangedOn}
                  onChange={(event) =>
                    setEquipmentChangedOn(event.target.value)
                  }
                  required
                />
              </label>
              <div className="equipment-assignment-fields">
                {equipmentAssignments.map((assignment, index) => (
                  <div className="equipment-assignment-row" key={index}>
                    <label>
                      管理者
                      <select
                        value={assignment.manager}
                        onChange={(event) =>
                          setEquipmentAssignments((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, manager: event.target.value }
                                : entry
                            )
                          )
                        }
                        required
                      >
                        <option value="">選択してください</option>
                        {!ownerOptions.includes(assignment.manager) &&
                          assignment.manager && (
                            <option value={assignment.manager}>
                              {assignment.manager}
                            </option>
                          )}
                        {ownerOptions
                          .filter(
                            (nickname) =>
                              nickname === assignment.manager ||
                              !equipmentAssignments.some(
                                (entry, entryIndex) =>
                                  entryIndex !== index &&
                                  entry.manager === nickname
                              )
                          )
                          .map((nickname) => (
                            <option key={nickname} value={nickname}>
                              {nickname}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      {isBallCategory(equipmentTarget.category) ? '球数' : '個数'}
                      <input
                        type="number"
                        min="1"
                        max="2147483647"
                        step="1"
                        value={assignment.quantity}
                        onChange={(event) =>
                          setEquipmentAssignments((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, quantity: event.target.value }
                                : entry
                            )
                          )
                        }
                        required
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outlined"
                      className="delete-button"
                      onClick={() =>
                        setEquipmentAssignments((current) =>
                          current.filter(
                            (_entry, entryIndex) => entryIndex !== index
                          )
                        )
                      }
                    >
                      削除
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outlined"
                onClick={() =>
                  setEquipmentAssignments((current) => [
                    ...current,
                    { manager: '', quantity: '1' },
                  ])
                }
              >
                管理者を追加
              </Button>
              <div className="modal-actions">
                <Button
                  variant="outlined"
                  type="button"
                  className="cancel-button"
                  onClick={() => setEquipmentTarget(null)}
                  disabled={isSavingEquipment}
                >
                  キャンセル
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  className="save-button"
                  disabled={isSavingEquipment}
                >
                  {isSavingEquipment ? '保存中...' : '変更を保存'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {disposalTarget && (
          <div className="modal-overlay">
            <section
              className="delete-modal equipment-disposal-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="equipment-disposal-title"
            >
              <h2 id="equipment-disposal-title">備品の廃棄確認</h2>
              <p>
                「{disposalTarget.name}」の廃棄数と管理者を選択してください。選択した管理者の割当から差し引きます。全数を廃棄すると備品一覧から非表示になり、変更履歴も削除されます。
              </p>
              <label>
                管理者
                <select
                  value={disposalManager}
                  onChange={(event) => {
                    setDisposalManager(event.target.value)
                    setDisposalQuantity('1')
                  }}
                  required
                >
                  {disposalTarget.equipment_assignments.map((assignment) => (
                    <option key={assignment.manager} value={assignment.manager}>
                      {assignment.manager}（{assignment.quantity}
                      {isBallCategory(disposalTarget.category) ? '球' : '個'}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                廃棄する
                {isBallCategory(disposalTarget.category) ? '球' : '個'}
                （最大{disposalManagerQuantity}
                {isBallCategory(disposalTarget.category) ? '球' : '個'}）
                <input
                  type="number"
                  min="1"
                  max={disposalManagerQuantity}
                  step="1"
                  value={disposalQuantity}
                  onChange={(event) =>
                    setDisposalQuantity(event.target.value)
                  }
                  required
                />
              </label>
              {disposalError && (
                <Alert severity="error" role="alert" sx={{ mt: 2 }}>
                  {disposalError}
                </Alert>
              )}
              <div className="modal-actions">
                <Button
                  variant="outlined"
                  type="button"
                  className="cancel-button"
                  onClick={() => setDisposalTarget(null)}
                  disabled={isDisposingEquipment}
                >
                  キャンセル
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  type="button"
                  className="confirm-delete-button"
                  onClick={confirmEquipmentDisposal}
                  disabled={
                    isDisposingEquipment ||
                    !Number.isInteger(Number(disposalQuantity)) ||
                    Number(disposalQuantity) < 1 ||
                    Number(disposalQuantity) > disposalManagerQuantity
                  }
                >
                  {isDisposingEquipment ? '廃棄中...' : '廃棄する'}
                </Button>
              </div>
            </section>
          </div>
        )}

        {historyTarget && (
          <div className="modal-overlay">
            <section
              className="delete-modal equipment-history-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="equipment-history-title"
            >
              <div className="equipment-history-header">
                <h2 id="equipment-history-title">
                  {historyTarget.name}の変更履歴
                </h2>
                <IconButton
                  className="equipment-history-close"
                  aria-label="変更履歴を閉じる"
                  onClick={() => setHistoryTarget(null)}
                  size="small"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </IconButton>
              </div>
              {historyError && (
                <Alert severity="error" role="alert">
                  {historyError}
                </Alert>
              )}
              {isLoadingHistory ? (
                <Typography>履歴を読み込み中...</Typography>
              ) : equipmentHistory.length === 0 && !historyError ? (
                <Typography>変更履歴はありません。</Typography>
              ) : (
                <ol className="equipment-history-list">
                  {equipmentHistory.map((entry) => {
                    const isPartialDisposal =
                      entry.change_type === 'partial_disposal'
                    const removedAllocation = isPartialDisposal
                      ? entry.before_state.find((before) => {
                          const after = entry.after_state.find(
                            (allocation) =>
                              allocation.manager === before.manager
                          )
                          return before.quantity > (after?.quantity ?? 0)
                        })
                      : null
                    const removedQuantity = removedAllocation
                      ? removedAllocation.quantity -
                        (entry.after_state.find(
                          (allocation) =>
                            allocation.manager === removedAllocation.manager
                        )?.quantity ?? 0)
                      : 0
                    const afterAllocations = [
                      ...entry.after_state,
                      ...entry.before_state
                        .filter(
                          (before) =>
                            !entry.after_state.some(
                              (after) => after.manager === before.manager
                            )
                        )
                        .map((before) => ({ ...before, quantity: 0 })),
                    ]
                    const allocationDeltas =
                      entry.change_type === 'assignment_change'
                        ? afterAllocations
                            .map((allocation) => ({
                              manager: allocation.manager,
                              quantityChange:
                                allocation.quantity -
                                (entry.before_state.find(
                                  (before) =>
                                    before.manager === allocation.manager
                                )?.quantity ?? 0),
                            }))
                            .filter(
                              (allocation) => allocation.quantityChange !== 0
                            )
                        : []

                    return (
                      <li
                        className={
                          entry.change_type !== 'assignment_change'
                            ? 'is-disposal'
                            : ''
                        }
                        key={entry.id}
                      >
                        <div className="equipment-history-meta">
                          <time dateTime={formatDate(entry.changed_on)}>
                            {formatDate(entry.changed_on)}
                          </time>
                          <span>{entry.changed_by_nickname}</span>
                        </div>
                        {allocationDeltas.length > 0 && (
                          <div
                            className="equipment-history-deltas"
                            aria-label="管理者ごとの数量変更"
                          >
                            {allocationDeltas.map(
                              ({ manager, quantityChange }) => (
                                <span
                                  className={`equipment-history-delta ${quantityChange > 0 ? 'is-increase' : 'is-decrease'}`}
                                  key={manager}
                                >
                                  {manager}：{quantityChange > 0 ? '増加 +' : '減少 '}
                                  {quantityChange}
                                  {isBallCategory(historyTarget.category)
                                    ? '球'
                                    : '個'}
                                </span>
                              )
                            )}
                          </div>
                        )}
                        {entry.change_type === 'disposal' ||
                        isPartialDisposal ? (
                          <div className="equipment-history-disposal">
                            {isPartialDisposal
                              ? `${removedAllocation?.manager}から${removedQuantity}${isBallCategory(historyTarget.category) ? '球' : '個'}を廃棄しました。`
                              : '備品を廃棄しました。'}
                          </div>
                        ) : (
                          <div className="equipment-history-change">
                            <div className="equipment-history-state">
                              <span className="equipment-history-state-label">
                                {entry.before_state.length === 0
                                  ? '初期状態'
                                  : '変更前'}
                              </span>
                              {entry.before_state.length === 0
                                ? null
                                : entry.before_state.map((allocation) => (
                                    <span
                                      className="equipment-history-allocation"
                                      key={allocation.manager}
                                    >
                                      <span>{allocation.manager}</span>
                                      <strong>
                                        {allocation.quantity}
                                        {isBallCategory(historyTarget.category)
                                          ? '球'
                                          : '個'}
                                      </strong>
                                    </span>
                                  ))}
                              {entry.before_state.length > 0 &&
                                isBallCategory(historyTarget.category) && (
                                  <span className="equipment-history-empty">
                                    1単位あたり{entry.before_balls_per_unit}球
                                  </span>
                                )}
                            </div>
                            <span
                              className="equipment-history-arrow"
                              aria-label="変更後"
                            >
                              →
                            </span>
                            <div className="equipment-history-state is-after">
                              <span className="equipment-history-state-label">
                                変更後
                              </span>
                              {isBallCategory(historyTarget.category) && (
                                <span className="equipment-history-empty">
                                  1単位あたり{entry.after_balls_per_unit}球
                                </span>
                              )}
                              {afterAllocations.length === 0
                                ? (
                                  <span className="equipment-history-empty">
                                    管理者なし
                                  </span>
                                )
                                : afterAllocations.map((allocation) => {
                                    return (
                                      <span
                                        className="equipment-history-allocation"
                                        key={allocation.manager}
                                      >
                                        <span>{allocation.manager}</span>
                                        <span className="equipment-history-allocation-values">
                                          <strong>
                                            {allocation.quantity}
                                            {isBallCategory(historyTarget.category)
                                              ? '球'
                                              : '個'}
                                            </strong>
                                        </span>
                                      </span>
                                    )
                                  })}
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </div>
        )}

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
                      購入者
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
