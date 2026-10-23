import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ChevronDown,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
  X,
  Zap,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import './App.css'

type TransactionType = 'income' | 'expense' | 'usage'
type Transaction = {
  id: string
  title: string
  amount: number
  type: TransactionType
  category: string
  note: string
  transaction_date: string
}

type FormState = {
  title: string
  amount: string
  type: TransactionType
  category: string
  note: string
  transaction_date: string
}

const emptyForm: FormState = {
  title: '',
  amount: '',
  type: 'expense',
  category: 'Belanja',
  note: '',
  transaction_date: new Date().toISOString().slice(0, 10),
}

const categories: Record<TransactionType, string[]> = {
  income: ['Gaji', 'Bisnis', 'Investasi', 'Lainnya'],
  expense: ['Belanja', 'Makan', 'Transportasi', 'Tagihan', 'Kesehatan', 'Lainnya'],
  usage: ['Internet', 'Subsidi', 'Pelatihan', 'Rumah Tangga', 'Lainnya'],
}

const typeLabel: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  usage: 'Pemakaian',
}

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const now = new Date()
const initialMonth = now.toISOString().slice(0, 7)
const monthOptions = Array.from({ length: 6 }, (_, offset) => {
  const date = new Date(now)
  date.setMonth(now.getMonth() - offset)
  return {
    value: date.toISOString().slice(0, 7),
    label: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
  }
})

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')
  const [month, setMonth] = useState(initialMonth)

  const loadTransactionsForUser = useCallback(async (userId: string) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) setToast(error.message)
    else setTransactions(data as Transaction[])
  }, [])

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null
      setUser(nextUser)
      setLoading(false)
      if (nextUser) void loadTransactionsForUser(nextUser.id)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      setLoading(false)
      if (nextUser) void loadTransactionsForUser(nextUser.id)
    })

    return () => data.subscription.unsubscribe()
  }, [loadTransactionsForUser])

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)
    const expense = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0)
    const usage = transactions.filter((item) => item.type === 'usage').reduce((sum, item) => sum + item.amount, 0)
    return { income, expense, usage, balance: income - expense - usage }
  }, [transactions])

  const visibleTransactions = useMemo(() => {
    const term = search.toLowerCase()
    return transactions.filter((item) => {
      const matchesMonth = item.transaction_date.startsWith(month)
      const matchesType = filterType === 'all' || item.type === filterType
      const matchesSearch = [item.title, item.category, item.note].some((value) => value.toLowerCase().includes(term))
      return matchesMonth && matchesType && matchesSearch
    })
  }, [transactions, month, filterType, search])

  async function handleAuth(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setAuthBusy(true)
    setAuthError('')
    const action = authMode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await action
    if (error) setAuthError(error.message)
    else if (authMode === 'register') setToast('Akun dibuat. Periksa email untuk konfirmasi.')
    setAuthBusy(false)
  }

  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase || !user) return
    if (!form.title.trim() || Number(form.amount) <= 0) {
      setFormError('Nama dan jumlah harus diisi dengan benar.')
      return
    }

    setFormError('')
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      amount: Number(form.amount),
      type: form.type,
      category: form.category,
      note: form.note.trim(),
      transaction_date: form.transaction_date,
    }
    const { error } = await supabase.from('transactions').insert(payload)
    if (error) {
      setFormError(error.message)
      return
    }
    setModalOpen(false)
    setForm(emptyForm)
    setToast('Transaksi berhasil ditambahkan')
    await loadTransactionsForUser(user.id)
  }

  async function deleteTransaction(id: string) {
    if (!supabase) return
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) setToast(error.message)
    else {
      setTransactions((items) => items.filter((item) => item.id !== id))
      setToast('Transaksi dihapus')
    }
  }

  function openModal(type: TransactionType = 'expense') {
    setForm({ ...emptyForm, type, category: categories[type][0] })
    setFormError('')
    setModalOpen(true)
  }

  function setType(type: TransactionType) {
    setForm((current) => ({ ...current, type, category: categories[type][0] }))
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="setup-screen">
        <div className="setup-panel">
          <div className="brand-mark"><WalletCards /></div>
          <p className="eyebrow">Setup diperlukan</p>
          <h1>Hubungkan Supabase</h1>
          <p>Buat file <code>.env.local</code> dari <code>.env.example</code>, lalu isi URL dan anon key proyek Supabase Anda.</p>
          <ol>
            <li>Salin <code>supabase/schema.sql</code> ke SQL Editor Supabase.</li>
            <li>Aktifkan Email Auth di Authentication &gt; Providers.</li>
            <li>Isi environment variable dan jalankan ulang aplikasi.</li>
          </ol>
        </div>
      </main>
    )
  }

  if (loading) return <main className="loading-screen"><span className="loader" /></main>

  if (!user) {
    return (
      <main className="auth-layout">
        <section className="auth-story">
          <div className="brand"><div className="brand-mark"><WalletCards /></div><span>Kawan Dana</span></div>
          <div className="story-copy">
            <p className="eyebrow">Kelola uang dengan tenang</p>
            <h1>Lihat kemana uangmu benar-benar pergi.</h1>
            <p>Catat pemasukan, pengeluaran, dan pemakaian dalam satu tempat yang jelas dan mudah.</p>
          </div>
          <div className="story-stat"><span>Saldo hari ini</span><strong>{currency.format(2845000)}</strong><small><ArrowUpRight /> 12,5% dari bulan lalu</small></div>
        </section>
        <section className="auth-form-wrap">
          <form className="auth-form" onSubmit={handleAuth}>
            <div className="mobile-brand"><div className="brand-mark"><WalletCards /></div>Kawan Dana</div>
            <p className="eyebrow">Akun pribadi</p>
            <h2>{authMode === 'login' ? 'Selamat datang kembali' : 'Mulai catat keuangan'}</h2>
            <p className="muted">{authMode === 'login' ? 'Masuk untuk melanjutkan pencatatan.' : 'Buat akun untuk menyimpan semua transaksi.'}</p>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 6 karakter" minLength={6} required /></label>
            {authError && <p className="error">{authError}</p>}
            <button className="primary full" disabled={authBusy}>{authBusy ? 'Memproses...' : authMode === 'login' ? 'Masuk ke akun' : 'Buat akun'}</button>
            <button type="button" className="text-button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><WalletCards /></div><span>Kawan Dana</span></div>
        <div className="account">
          <div><span>Masuk sebagai</span><strong>{user.email}</strong></div>
          <button className="icon-button" onClick={handleLogout} title="Keluar"><LogOut /></button>
        </div>
      </header>

      <main className="dashboard">
        <div className="page-heading">
          <div><p className="eyebrow">Ringkasan keuangan</p><h1>Halo, {user.user_metadata.full_name || user.email?.split('@')[0]}</h1></div>
          <button className="primary" onClick={() => openModal()}><Plus /> Tambah transaksi</button>
        </div>

        <section className="summary-grid">
          <article className="summary-card balance-card">
            <div className="summary-icon"><WalletCards /></div>
            <div><span>Saldo tersisa</span><strong>{currency.format(totals.balance)}</strong><small>Total aset saat ini</small></div>
          </article>
          <article className="summary-card"><div className="summary-icon income"><ArrowDownLeft /></div><div><span>Pemasukan</span><strong>{currency.format(totals.income)}</strong><small>Semua waktu</small></div></article>
          <article className="summary-card"><div className="summary-icon expense"><ArrowUpRight /></div><div><span>Pengeluaran</span><strong>{currency.format(totals.expense)}</strong><small>Semua waktu</small></div></article>
          <article className="summary-card"><div className="summary-icon usage"><Zap /></div><div><span>Pemakaian</span><strong>{currency.format(totals.usage)}</strong><small>Semua waktu</small></div></article>
        </section>

        <section className="transactions-panel">
          <div className="panel-heading"><div><h2>Riwayat transaksi</h2><p>{visibleTransactions.length} transaksi pada periode ini</p></div></div>
          <div className="filters">
            <label className="search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari transaksi" /></label>
            <label className="select-wrap"><select value={month} onChange={(event) => setMonth(event.target.value)}>{monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown /></label>
            <label className="select-wrap"><select value={filterType} onChange={(event) => setFilterType(event.target.value as 'all' | TransactionType)}><option value="all">Semua jenis</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option><option value="usage">Pemakaian</option></select><ChevronDown /></label>
          </div>

          {visibleTransactions.length ? (
            <div className="table-wrap"><table><thead><tr><th>Transaksi</th><th>Tanggal</th><th>Jenis</th><th>Jumlah</th><th><span className="sr-only">Aksi</span></th></tr></thead>
              <tbody>{visibleTransactions.map((item) => (
                <tr key={item.id}><td><div className={`transaction-icon ${item.type}`}><Banknote /></div><div><strong>{item.title}</strong><span>{item.category}{item.note ? ` · ${item.note}` : ''}</span></div></td><td>{new Date(`${item.transaction_date}T12:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><span className={`type-pill ${item.type}`}>{typeLabel[item.type]}</span></td><td className={`amount ${item.type}`}>{item.type === 'income' ? '+' : '-'}{currency.format(item.amount)}</td><td><button className="delete-button" title="Hapus transaksi" onClick={() => deleteTransaction(item.id)}><Trash2 /></button></td></tr>
              ))}</tbody>
            </table></div>
          ) : (
            <div className="empty-state"><div><ReceiptText /></div><h3>Belum ada transaksi</h3><p>Tambahkan pemasukan atau pengeluaran untuk periode ini.</p><button className="secondary" onClick={() => openModal()}><Plus /> Tambah transaksi</button></div>
          )}
        </section>
      </main>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}>
          <form className="transaction-modal" onSubmit={handleSubmit}>
            <div className="modal-heading"><div><p className="eyebrow">Catatan baru</p><h2>Tambah transaksi</h2></div><button type="button" className="icon-button" onClick={() => setModalOpen(false)} title="Tutup"><X /></button></div>
            <div className="type-control">{(['income', 'expense', 'usage'] as TransactionType[]).map((type) => <button type="button" key={type} className={form.type === type ? 'active' : ''} onClick={() => setType(type)}>{typeLabel[type]}</button>)}</div>
            <div className="form-grid">
              <label>Nama transaksi<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Gaji Oktober" required /></label>
              <label>Jumlah<div className="money-input"><span>Rp</span><input type="number" min="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" required /></div></label>
              <label>Kategori<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories[form.type].map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Tanggal<input type="date" value={form.transaction_date} onChange={(event) => setForm({ ...form, transaction_date: event.target.value })} required /></label>
              <label className="wide">Catatan<input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Tambahkan catatan (opsional)" /></label>
            </div>
            {formError && <p className="error">{formError}</p>}
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setModalOpen(false)}>Batal</button><button className="primary">Simpan transaksi</button></div>
          </form>
        </div>
      )}
      {toast && <button className="toast" onClick={() => setToast('')}>{toast}<X /></button>}
    </div>
  )
}

export default App
