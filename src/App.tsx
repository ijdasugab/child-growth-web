import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

import babyAvatarSource from './assets/app-icon-baby.png'
import babyIconSquare from './assets/app-icon-square.png'
import girlBabySource from './assets/girl-baby.png'
import crawlingBabySource from './assets/crawling-baby.png'
import sleepBabySource from './assets/sleep-baby.png'
import trophyPastelSource from './assets/trophy-pastel.png'
import milestoneGreenSource from './assets/milestone-green.png'
import milestoneBlueSource from './assets/milestone-blue.png'
import milestoneYellowSource from './assets/milestone-yellow.png'
import bottomBabySource from './assets/bottom-baby.png'

type Route = 'landing' | 'login' | 'dashboard'
type DashboardTab =
  | 'monitoring'
  | 'admin-edit'
  | 'milestones'
  | 'immunizations'
  | 'master-data'
type Gender = 'MALE' | 'FEMALE'
type ApiDecimal = string | number | { s: number; e: number; d: number[] }

type AuthUser = {
  id: string
  fullName: string
  email: string
  phoneNumber?: string | null
  isActive?: boolean | null
  roles: string[]
}

type EditChildForm = {
  id: string
  fullName: string
  gender: Gender
  birthDate: string
  birthWeightKg: string
  birthLengthCm: string
}

const TOKEN_KEY = 'nata_baby_admin_token'
const REFRESH_TOKEN_KEY = 'nata_baby_admin_refresh_token'
const USER_KEY = 'nata_baby_admin_user'

function getStoredAuth(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    const user = userStr ? (JSON.parse(userStr) as AuthUser) : null
    return { token, user }
  } catch {
    return { token: null, user: null }
  }
}

function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function isAdminUser(user: AuthUser | null): boolean {
  if (!user || !Array.isArray(user.roles)) return false
  return user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')
}

type Child = {
  id: string
  fullName: string
  gender: Gender
  birthDate: string
  birthWeightKg: ApiDecimal | null
  birthLengthCm: ApiDecimal | null
}

type Measurement = {
  id: string
  measuredAt: string
  weightKg: ApiDecimal | null
  heightCm: ApiDecimal | null
  headCircumferenceCm: ApiDecimal | null
  notes: string | null
}

type Reminder = {
  id: string
  title: string
  reminderType: string | null
  reminderDate: string
  isDone: boolean | null
  notes: string | null
}

type ChildDetail = Child & {
  measurements: Measurement[]
  reminders: Reminder[]
}

type ChildForm = {
  fullName: string
  gender: Gender
  birthDate: string
  birthWeightKg: string
  birthLengthCm: string
}

type MeasurementForm = {
  measuredAt: string
  weightKg: string
  heightCm: string
  headCircumferenceCm: string
  notes: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

const initialChildForm: ChildForm = {
  fullName: '',
  gender: 'MALE',
  birthDate: '',
  birthWeightKg: '',
  birthLengthCm: '',
}

const initialMeasurementForm: MeasurementForm = {
  measuredAt: new Date().toISOString().slice(0, 10),
  weightKg: '',
  heightCm: '',
  headCircumferenceCm: '',
  notes: '',
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      message?: string
    } | null
    const msg = errorBody?.message || `Request gagal (${response.status})`

    if (response.status === 401 && path !== '/api/auth/login') {
      clearStoredAuth()
    }

    throw new Error(msg)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

function getRoute(): Route {
  const path = window.location.pathname
  if (path.startsWith('/login')) {
    return 'login'
  }
  if (path.startsWith('/dashboard')) {
    return 'dashboard'
  }
  return 'landing'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function calculateAge(birthDate: string) {
  const birth = new Date(birthDate)
  const now = new Date()
  const monthDiff =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    now.getMonth() -
    birth.getMonth()

  if (monthDiff < 12) {
    return `${Math.max(monthDiff, 0)} bulan`
  }

  return `${Math.floor(monthDiff / 12)} tahun ${monthDiff % 12} bulan`
}

function numberOrUndefined(value: string) {
  return value.trim() === '' ? undefined : Number(value)
}

function formatDecimal(value: ApiDecimal | null | undefined) {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  const digits = value.d.join('').padStart(value.e + 1, '0')
  const decimalIndex = value.e + 1
  const integerPart = digits.slice(0, decimalIndex) || '0'
  const fractionalPart = digits.slice(decimalIndex).replace(/0+$/, '')
  const sign = value.s < 0 ? '-' : ''

  return `${sign}${integerPart}${fractionalPart ? `.${fractionalPart}` : ''}`
}

function App() {
  const [route, setRoute] = useState<Route>(getRoute)
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('monitoring')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    () => getStoredAuth().user,
  )
  const [loginEmail, setLoginEmail] = useState('bagus@natababy.local')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginModalEmail, setLoginModalEmail] = useState('bagus@natababy.local')
  const [loginModalPassword, setLoginModalPassword] = useState('')
  const [loginModalError, setLoginModalError] = useState<string | null>(null)
  const [isLoggingInModal, setIsLoggingInModal] = useState(false)

  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<ChildDetail | null>(null)
  const [childForm, setChildForm] = useState<ChildForm>(initialChildForm)
  const [measurementForm, setMeasurementForm] = useState<MeasurementForm>(
    initialMeasurementForm,
  )
  const [editingChild, setEditingChild] = useState<EditChildForm | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null)
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isSavingChild, setIsSavingChild] = useState(false)
  const [isSavingMeasurement, setIsSavingMeasurement] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latestMeasurement = selectedChild?.measurements[0]
  const dashboardGender = selectedChild?.gender ?? childForm.gender
  const upcomingReminders = useMemo(
    () => selectedChild?.reminders.filter((reminder) => !reminder.isDone) ?? [],
    [selectedChild],
  )

  function navigate(nextRoute: Route) {
    let path = '/'
    if (nextRoute === 'dashboard') {
      path = '/dashboard'
    } else if (nextRoute === 'login') {
      path = '/login'
    }
    window.history.pushState({}, '', path)
    setRoute(nextRoute)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function loadChildren() {
    setIsLoading(true)
    setError(null)

    try {
      const data = await apiRequest<Child[]>('/api/children')
      setChildren(data)
      setSelectedChildId((current) => current ?? data[0]?.id ?? null)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Tidak bisa memuat data anak.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function loadChildDetail(childId: string) {
    setError(null)

    try {
      const data = await apiRequest<ChildDetail>(`/api/children/${childId}`)
      setSelectedChild(data)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Tidak bisa memuat detail anak.',
      )
    }
  }

  // Muat data dashboard dan validasi sesi admin
  useEffect(() => {
    if (route === 'dashboard') {
      void loadChildren()

      const { token, user } = getStoredAuth()
      if (token && isAdminUser(user)) {
        apiRequest<AuthUser>('/api/auth/me')
          .then((verifiedUser) => {
            if (isAdminUser(verifiedUser)) {
              setCurrentUser(verifiedUser)
              localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser))
            } else {
              clearStoredAuth()
              setCurrentUser(null)
            }
          })
          .catch(() => {
            clearStoredAuth()
            setCurrentUser(null)
          })
      }
    } else if (route === 'login') {
      const { token, user } = getStoredAuth()
      if (token && isAdminUser(user)) {
        navigate('dashboard')
      }
    }
  }, [route])

  useEffect(() => {
    function handlePopState() {
      setRoute(getRoute())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function handleOpenEditChild(child?: ChildDetail | Child | null) {
    const target = child ?? selectedChild
    if (!target) return

    if (!currentUser || !isAdminUser(currentUser)) {
      setLoginModalError(
        'Fitur mengedit data anak hanya dapat diakses oleh Administrator. Silakan login untuk melanjutkan.',
      )
      setShowLoginModal(true)
      return
    }

    setEditingChild({
      id: target.id,
      fullName: target.fullName,
      gender: target.gender,
      birthDate: target.birthDate ? target.birthDate.slice(0, 10) : '',
      birthWeightKg: target.birthWeightKg
        ? formatDecimal(target.birthWeightKg)
        : '',
      birthLengthCm: target.birthLengthCm
        ? formatDecimal(target.birthLengthCm)
        : '',
    })
    setEditSuccessMsg(null)
    setEditErrorMsg(null)
    setDashboardTab('admin-edit')
  }

  async function handleUpdateChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingChild) return

    setIsSavingEdit(true)
    setEditSuccessMsg(null)
    setEditErrorMsg(null)

    try {
      await apiRequest<Child>(`/api/children/${editingChild.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: editingChild.fullName,
          gender: editingChild.gender,
          birthDate: editingChild.birthDate,
          birthWeightKg: numberOrUndefined(editingChild.birthWeightKg),
          birthLengthCm: numberOrUndefined(editingChild.birthLengthCm),
        }),
      })

      setEditSuccessMsg('Data anak berhasil diperbarui!')
      await loadChildren()
      await loadChildDetail(editingChild.id)
    } catch (requestError) {
      setEditErrorMsg(
        requestError instanceof Error
          ? requestError.message
          : 'Gagal memperbarui data anak.',
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleDeleteChild(childId: string) {
    if (
      !window.confirm(
        'Apakah Anda yakin ingin menghapus data anak ini? Riwayat pemeriksaan dan reminder juga akan terhapus.',
      )
    ) {
      return
    }

    setIsSavingEdit(true)
    setEditErrorMsg(null)

    try {
      await apiRequest(`/api/children/${childId}`, {
        method: 'DELETE',
      })
      setEditSuccessMsg('Data anak berhasil dihapus.')
      setEditingChild(null)
      await loadChildren()
      if (selectedChildId === childId) {
        setSelectedChildId(null)
        setSelectedChild(null)
      }
      setDashboardTab('monitoring')
    } catch (requestError) {
      setEditErrorMsg(
        requestError instanceof Error
          ? requestError.message
          : 'Gagal menghapus data anak.',
      )
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleLoginModalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoggingInModal(true)
    setLoginModalError(null)

    try {
      const data = await apiRequest<{
        accessToken: string
        refreshToken: string
        user: AuthUser
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginModalEmail.trim(),
          password: loginModalPassword,
        }),
      })

      if (!isAdminUser(data.user)) {
        clearStoredAuth()
        setLoginModalError(
          `Akses Ditolak: Akun "${data.user.email}" bukan Administrator. Hanya Admin yang dapat mengelola data anak.`,
        )
        return
      }

      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setCurrentUser(data.user)
      setLoginModalPassword('')
      setLoginModalError(null)
      setShowLoginModal(false)

      if (selectedChild) {
        handleOpenEditChild(selectedChild)
      } else {
        setDashboardTab('admin-edit')
      }
    } catch (requestError) {
      setLoginModalError(
        requestError instanceof Error
          ? requestError.message === 'Invalid email or password'
            ? 'Email atau kata sandi admin tidak cocok.'
            : requestError.message
          : 'Gagal login admin.',
      )
    } finally {
      setIsLoggingInModal(false)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoggingIn(true)
    setLoginError(null)

    try {
      const data = await apiRequest<{
        accessToken: string
        refreshToken: string
        user: AuthUser
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      })

      if (!isAdminUser(data.user)) {
        clearStoredAuth()
        setLoginError(
          `Akses Ditolak: Akun "${data.user.email}" terdaftar sebagai Orang Tua (Parent), bukan Administrator. Dashboard admin hanya dapat diakses oleh Admin.`,
        )
        return
      }

      localStorage.setItem(TOKEN_KEY, data.accessToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setCurrentUser(data.user)
      setLoginPassword('')
      setLoginError(null)
      navigate('dashboard')
    } catch (requestError) {
      setLoginError(
        requestError instanceof Error
          ? requestError.message === 'Invalid email or password'
            ? 'Email atau kata sandi tidak cocok. Silakan periksa kembali.'
            : requestError.message
          : 'Gagal melakukan login. Silakan coba lagi.',
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleLogout() {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {})
      }
    } finally {
      clearStoredAuth()
      setCurrentUser(null)
      setEditingChild(null)
      setDashboardTab('monitoring')
    }
  }

  useEffect(() => {
    if (selectedChildId) {
      void loadChildDetail(selectedChildId)
    } else {
      setSelectedChild(null)
    }
  }, [selectedChildId])

  async function handleCreateChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSavingChild(true)
    setError(null)

    try {
      const child = await apiRequest<Child>('/api/children', {
        method: 'POST',
        body: JSON.stringify({
          fullName: childForm.fullName,
          gender: childForm.gender,
          birthDate: childForm.birthDate,
          birthWeightKg: numberOrUndefined(childForm.birthWeightKg),
          birthLengthCm: numberOrUndefined(childForm.birthLengthCm),
        }),
      })

      setChildForm(initialChildForm)
      await loadChildren()
      setSelectedChildId(child.id)
      navigate('dashboard')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Tidak bisa menyimpan data anak.',
      )
    } finally {
      setIsSavingChild(false)
    }
  }

  async function handleCreateMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedChildId) {
      return
    }

    setIsSavingMeasurement(true)
    setError(null)

    try {
      await apiRequest<Measurement>(
        `/api/children/${selectedChildId}/measurements`,
        {
          method: 'POST',
          body: JSON.stringify({
            measuredAt: measurementForm.measuredAt,
            weightKg: numberOrUndefined(measurementForm.weightKg),
            heightCm: numberOrUndefined(measurementForm.heightCm),
            headCircumferenceCm: numberOrUndefined(
              measurementForm.headCircumferenceCm,
            ),
            notes: measurementForm.notes || undefined,
          }),
        },
      )

      setMeasurementForm(initialMeasurementForm)
      await loadChildDetail(selectedChildId)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Tidak bisa menyimpan pengukuran.',
      )
    } finally {
      setIsSavingMeasurement(false)
    }
  }

  async function handleToggleReminder(reminder: Reminder) {
    if (!selectedChildId) {
      return
    }

    setError(null)

    try {
      await apiRequest<Reminder>(
        `/api/children/${selectedChildId}/reminders/${reminder.id}/done`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isDone: !reminder.isDone }),
        },
      )
      await loadChildDetail(selectedChildId)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Tidak bisa mengubah reminder.',
      )
    }
  }

  function renderChildForm(mode: 'setup' | 'sidebar') {
    return (
      <form
        className={mode === 'setup' ? 'panel form-grid' : 'panel form-grid'}
        onSubmit={handleCreateChild}
      >
        <div>
          <p className="eyebrow">Profil Si Kecil</p>
          <h2>
            {mode === 'setup'
              ? 'Tambahkan Data Anak Pertama'
              : 'Tambah Profil Anak'}
          </h2>
        </div>
        <label>
          Nama Lengkap
          <input
            onChange={(event) =>
              setChildForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            placeholder="Contoh: Natasha"
            required
            type="text"
            value={childForm.fullName}
          />
        </label>
        <div className="two-cols">
          <label>
            Jenis Kelamin
            <select
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  gender: event.target.value as Gender,
                }))
              }
              value={childForm.gender}
            >
              <option value="FEMALE">Perempuan (Pink)</option>
              <option value="MALE">Laki-laki (Blue)</option>
            </select>
          </label>
          <label>
            Tanggal Lahir
            <input
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }))
              }
              required
              type="date"
              value={childForm.birthDate}
            />
          </label>
        </div>
        <div className="two-cols">
          <label>
            Berat Lahir (kg)
            <input
              min="0"
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  birthWeightKg: event.target.value,
                }))
              }
              placeholder="Contoh: 3.2"
              step="0.01"
              type="number"
              value={childForm.birthWeightKg}
            />
          </label>
          <label>
            Panjang Lahir (cm)
            <input
              min="0"
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  birthLengthCm: event.target.value,
                }))
              }
              placeholder="Contoh: 49.5"
              step="0.01"
              type="number"
              value={childForm.birthLengthCm}
            />
          </label>
        </div>
        <button className="primary-button" disabled={isSavingChild}>
          {isSavingChild
            ? 'Menyimpan...'
            : mode === 'setup'
              ? 'Simpan & Mulai Pantau'
              : 'Simpan Anak'}
        </button>
      </form>
    )
  }

  if (route === 'landing') {
    return (
      <main className="marketing-page">
        {/* Navigation */}
        <nav className="marketing-nav">
          <button
            className="brand brand-button"
            onClick={() => navigate('landing')}
            type="button"
          >
            <img
              src={babyIconSquare}
              alt="Nata Baby Logo"
              className="brand-logo-img"
            />
            <span>
              <strong>Nata Baby</strong>
              <small>Pemantauan Tumbuh Kembang</small>
            </span>
          </button>
          <div className="nav-actions">
            <a href="#features">Fitur</a>
            <a href="#tips">Tips</a>
            <a href="#milestones">Milestone</a>
            <button
              className="primary-button"
              onClick={() => navigate('dashboard')}
            >
              Buka Dashboard
            </button>
            {currentUser && isAdminUser(currentUser) ? (
              <span className="admin-role-badge">
                Admin: {currentUser.fullName.split(' ')[0]}
              </span>
            ) : (
              <button
                className="ghost-button"
                onClick={() => navigate('login')}
              >
                Login Admin
              </button>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Aplikasi Tumbuh Kembang Anak</p>
            <h1>
              Tumbuh Kembang Si Kecil Terpantau Lebih{' '}
              <span className="highlight">Tenang & Teratur.</span>
            </h1>
            <p>
              Nata Baby memudahkan pencatatan berat, tinggi badan, lingkar
              kepala, pemantauan milestone, dan pengingat imunisasi secara
              lengkap dalam satu ekosistem web dan mobile.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => navigate('dashboard')}
              >
                Buka Dashboard
              </button>
              <a className="secondary-link" href="#features">
                Pelajari Fitur ↓
              </a>
            </div>
          </div>

          {/* Hero Showcase with Mobile Visuals */}
          <div className="hero-mobile-preview" aria-label="Preview Nata Baby">
            <div className="hero-speech-bubble">
              <div className="hero-bubble-text">
                <h3>Halo, Mama! ✨</h3>
                <p>Yuk, cek perkembangan si kecil hari ini.</p>
              </div>
            </div>

            <div className="hero-baby-visual">
              <img
                src={girlBabySource}
                alt="Ilustrasi Bayi Nata Baby"
              />
            </div>

            <div className="hero-stat-badges">
              <div className="hero-stat-badge green">
                <span>Berat Badan</span>
                <strong>7.8 kg</strong>
                <small className="muted">+0.3 kg</small>
              </div>
              <div className="hero-stat-badge blue">
                <span>Tinggi Badan</span>
                <strong>68.5 cm</strong>
                <small className="muted">+1.2 cm</small>
              </div>
              <div className="hero-stat-badge pink">
                <span>Milestone</span>
                <strong>5</strong>
                <small className="muted">Pencapaian</small>
              </div>
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="tips-banner-section" id="tips">
          <div className="tips-banner-card">
            <div className="tips-banner-content">
              <span className="tips-badge-tag">Tips Hari Ini</span>
              <h2>Ajak si kecil bermain tummy time 15 menit setiap hari.</h2>
              <p>
                Aktivitas tummy time melatih kekuatan otot leher, punggung, dan
                bahu bayi, serta merangsang koordinasi motorik untuk persiapan
                merangkak dan duduk.
              </p>
            </div>
            <div className="tips-banner-image">
              <img src={crawlingBabySource} alt="Tummy Time Baby" />
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="feature-section" id="features">
          <div className="section-title">
            <p className="eyebrow">Keunggulan Sistem</p>
            <h2>Satu Platform untuk Orang Tua & Admin Layanan</h2>
          </div>
          <div className="feature-grid">
            <article>
              <div className="feature-icon-badge">📊</div>
              <h3>Pencatatan Berkala</h3>
              <p>
                Simpan data berat, tinggi, dan lingkar kepala secara akurat
                sesuai tanggal kunjungan posyandu atau klinik.
              </p>
            </article>
            <article>
              <div className="feature-icon-badge">⭐</div>
              <h3>Milestone Perkembangan</h3>
              <p>
                Pantau perkembangan kemampuan motorik kasar, motorik halus, dan
                bahasa si kecil sesuai tahapan usianya.
              </p>
            </article>
            <article>
              <div className="feature-icon-badge">📱</div>
              <h3>Sinkron Web & Mobile</h3>
              <p>
                Terhubung langsung dengan backend API yang sama untuk akses web
                dashboard dan aplikasi mobile Expo React Native.
              </p>
            </article>
          </div>
        </section>

        {/* Milestones Showcase */}
        <section className="milestone-section" id="milestones">
          <div className="section-title">
            <p className="eyebrow">Pencapaian Milestone</p>
            <h2>Rayakan Setiap Langkah Kecilnya</h2>
          </div>
          <div className="milestones-showcase">
            <div className="trophy-spotlight">
              <img src={trophyPastelSource} alt="Trophy Milestone" />
              <h3>Hebat!</h3>
              <p>Si kecil terus aktif berkembang dan mencapai milestone baru.</p>
            </div>
            <div className="milestones-cards-list">
              <div className="milestone-preview-card">
                <img src={milestoneGreenSource} alt="Milestone Motorik Kasar" />
                <div>
                  <strong>Mengangkat kepala dalam posisi tengkurap</strong>
                  <span>Usia 6 bulan · Motorik Kasar</span>
                </div>
              </div>
              <div className="milestone-preview-card">
                <img src={milestoneBlueSource} alt="Milestone Duduk" />
                <div>
                  <strong>Duduk tanpa bantuan beberapa detik</strong>
                  <span>Usia 7 bulan · Keseimbangan</span>
                </div>
              </div>
              <div className="milestone-preview-card">
                <img src={milestoneYellowSource} alt="Milestone Meraih Benda" />
                <div>
                  <strong>Meraih benda dengan kedua tangan</strong>
                  <span>Usia 7 bulan · Motorik Halus</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Promo Banner */}
        <section className="mobile-app-banner">
          <div className="mobile-app-banner-content">
            <h2>Tersedia Aplikasi Mobile Nata Baby</h2>
            <p>
              Orang tua dapat memantau perkembangan harian langsung dari genggaman
              dengan aplikasi mobile React Native & Expo yang dirancang ramah dan
              interaktif.
            </p>
            <div className="mobile-app-badges">
              <span className="mobile-app-badge-pill">📱 Expo SDK 54</span>
              <span className="mobile-app-badge-pill">🍏 iOS Support</span>
              <span className="mobile-app-badge-pill">🤖 Android Support</span>
            </div>
          </div>
          <div className="mobile-app-banner-visual">
            <img src={babyIconSquare} alt="Nata Baby App Icon" />
          </div>
        </section>

        {/* Footer */}
        <footer className="marketing-footer">
          <div className="marketing-footer-illustration">
            <img src={bottomBabySource} alt="Nata Baby Footer" />
          </div>
          <strong>Nata Baby Ecosystem</strong>
          <p>© 2026 Nata Baby · Dikembangkan oleh @ijdasugab</p>
        </footer>
      </main>
    )
  }

  if (route === 'login') {
    return (
      <main className="login-shell">
        <div className="login-card">
          <div className="login-header">
            <img
              src={babyIconSquare}
              alt="Nata Baby Logo"
              className="login-brand-logo"
            />
            <span className="login-role-pill">Portal Administrator</span>
            <h1>Masuk Dashboard Admin</h1>
            <p className="login-subtitle">
              Halaman ini khusus untuk Administrator Nata Baby. Masukkan akun
              admin Anda untuk mengelola data pemantauan tumbuh kembang anak.
            </p>
          </div>

          {loginError ? <div className="alert">{loginError}</div> : null}

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Email Administrator
              <input
                autoComplete="email"
                disabled={isLoggingIn}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="bagus@natababy.local"
                required
                type="email"
                value={loginEmail}
              />
            </label>

            <label>
              Kata Sandi
              <input
                autoComplete="current-password"
                disabled={isLoggingIn}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={loginPassword}
              />
            </label>

            <button
              className="primary-button login-submit-btn"
              disabled={isLoggingIn}
              type="submit"
            >
              {isLoggingIn ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <div className="login-footer">
            <button
              className="back-link"
              onClick={() => {
                setLoginError(null)
                navigate('landing')
              }}
              type="button"
            >
              ← Kembali ke Beranda
            </button>
            <p className="login-hint">
              🔒 <strong>Akses Terbatas:</strong> Hanya pengguna dengan peran{' '}
              <strong>ADMIN</strong> atau <strong>SUPER_ADMIN</strong> yang
              diizinkan masuk ke dashboard ini.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={`admin-shell theme-${dashboardGender.toLowerCase()}`}>
      <aside className="sidebar" aria-label="Dashboard admin">
        <div className="brand">
          <img
            src={babyIconSquare}
            alt="Nata Baby Logo"
            className="brand-logo-img"
          />
          <div>
            <strong>Nata Baby</strong>
            <small>Dashboard Pemantauan</small>
          </div>
        </div>

        {currentUser ? (
          <div className="admin-user-card">
            <div className="admin-user-avatar">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-info">
              <strong>{currentUser.fullName}</strong>
              <small>{currentUser.email}</small>
              <span className="admin-role-badge">
                {currentUser.roles.includes('SUPER_ADMIN')
                  ? 'Super Admin'
                  : 'Admin'}
              </span>
            </div>
            <button
              className="admin-logout-btn"
              onClick={() => void handleLogout()}
              title="Keluar dari akun admin"
              type="button"
            >
              Keluar
            </button>
          </div>
        ) : (
          <div className="guest-login-card">
            <div>
              <strong style={{ fontSize: '13px', display: 'block' }}>
                Akses Publik
              </strong>
              <small>Pemantauan & Input Data</small>
            </div>
            <button
              className="guest-login-btn"
              onClick={() => {
                setLoginModalError(null)
                setShowLoginModal(true)
              }}
              type="button"
            >
              🔐 Login Admin
            </button>
          </div>
        )}

        <nav className="admin-menu" aria-label="Menu navigasi">
          <button
            className={dashboardTab === 'monitoring' ? 'active' : ''}
            onClick={() => setDashboardTab('monitoring')}
            type="button"
          >
            📊 Monitoring Anak
          </button>
          <button
            className={dashboardTab === 'admin-edit' ? 'active' : ''}
            onClick={() => {
              if (currentUser && isAdminUser(currentUser)) {
                if (selectedChild) {
                  handleOpenEditChild(selectedChild)
                } else {
                  setDashboardTab('admin-edit')
                }
              } else {
                setLoginModalError(
                  'Fitur ini khusus untuk Administrator. Silakan login untuk mengedit dan mengelola data anak.',
                )
                setShowLoginModal(true)
              }
            }}
            type="button"
          >
            ✏️ Edit & Kelola Data Anak{' '}
            {currentUser && isAdminUser(currentUser) ? '✓' : '🔒'}
          </button>
          <button
            className={dashboardTab === 'milestones' ? 'active' : ''}
            onClick={() => setDashboardTab('milestones')}
            type="button"
          >
            ⭐ Milestone
          </button>
          <button
            className={dashboardTab === 'immunizations' ? 'active' : ''}
            onClick={() => setDashboardTab('immunizations')}
            type="button"
          >
            💉 Imunisasi
          </button>
          <button
            className={dashboardTab === 'master-data' ? 'active' : ''}
            onClick={() => setDashboardTab('master-data')}
            type="button"
          >
            📋 Master Data
          </button>
        </nav>

        <section className="panel">
          <div className="section-heading">
            <h2>Daftar Anak</h2>
            <span>{children.length}</span>
          </div>

          <div className="child-list">
            {isLoading ? (
              <p className="muted">Memuat data...</p>
            ) : children.length === 0 ? (
              <p className="muted">Belum ada data anak.</p>
            ) : (
              children.map((child) => (
                <button
                  className={
                    child.id === selectedChildId
                      ? 'child-item active'
                      : 'child-item'
                  }
                  key={child.id}
                  onClick={() => {
                    setSelectedChildId(child.id)
                    if (dashboardTab === 'admin-edit' && currentUser && isAdminUser(currentUser)) {
                      handleOpenEditChild(child)
                    }
                  }}
                  type="button"
                >
                  <img
                    src={babyAvatarSource}
                    alt="Avatar"
                    className="child-avatar-sm"
                  />
                  <div className="child-item-info">
                    <strong>{child.fullName}</strong>
                    <small>
                      {child.gender === 'FEMALE' ? 'Perempuan' : 'Laki-laki'} ·{' '}
                      {calculateAge(child.birthDate)}
                    </small>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {renderChildForm('sidebar')}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
          }}
        >
          <button className="back-link" onClick={() => navigate('landing')}>
            ← Kembali ke Beranda
          </button>
          {currentUser ? (
            <button
              className="admin-logout-btn"
              onClick={() => void handleLogout()}
              type="button"
            >
              Keluar
            </button>
          ) : (
            <button
              className="guest-login-btn"
              onClick={() => {
                setLoginModalError(null)
                setShowLoginModal(true)
              }}
              type="button"
            >
              Login Admin
            </button>
          )}
        </div>
      </aside>

      <section className="content">
        {error ? <div className="alert">{error}</div> : null}

        {dashboardTab === 'admin-edit' ? (
          <section className="admin-management-panel">
            <header className="profile-header">
              <div>
                <p className="eyebrow">Panel Khusus Administrator</p>
                <h2>✏️ Kelola & Edit Data Anak</h2>
                <p>
                  Ubah profil identitas anak, tanggal lahir, berat lahir, atau
                  hapus data anak yang tidak diperlukan.
                </p>
              </div>
              <button
                className="edit-child-button"
                onClick={() => setDashboardTab('monitoring')}
                type="button"
              >
                ← Kembali ke Monitoring
              </button>
            </header>

            {editSuccessMsg ? (
              <div className="alert-success">{editSuccessMsg}</div>
            ) : null}
            {editErrorMsg ? <div className="alert">{editErrorMsg}</div> : null}

            {editingChild ? (
              <form className="panel form-grid" onSubmit={handleUpdateChild}>
                <h2>Formulir Edit Profil Anak</h2>
                <label>
                  Nama Lengkap
                  <input
                    onChange={(e) =>
                      setEditingChild((c) =>
                        c ? { ...c, fullName: e.target.value } : null,
                      )
                    }
                    required
                    type="text"
                    value={editingChild.fullName}
                  />
                </label>
                <div className="two-cols">
                  <label>
                    Jenis Kelamin
                    <select
                      onChange={(e) =>
                        setEditingChild((c) =>
                          c ? { ...c, gender: e.target.value as Gender } : null,
                        )
                      }
                      value={editingChild.gender}
                    >
                      <option value="FEMALE">Perempuan (Pink)</option>
                      <option value="MALE">Laki-laki (Blue)</option>
                    </select>
                  </label>
                  <label>
                    Tanggal Lahir
                    <input
                      onChange={(e) =>
                        setEditingChild((c) =>
                          c ? { ...c, birthDate: e.target.value } : null,
                        )
                      }
                      required
                      type="date"
                      value={editingChild.birthDate}
                    />
                  </label>
                </div>
                <div className="two-cols">
                  <label>
                    Berat Lahir (kg)
                    <input
                      min="0"
                      onChange={(e) =>
                        setEditingChild((c) =>
                          c ? { ...c, birthWeightKg: e.target.value } : null,
                        )
                      }
                      step="0.01"
                      type="number"
                      value={editingChild.birthWeightKg}
                    />
                  </label>
                  <label>
                    Panjang Lahir (cm)
                    <input
                      min="0"
                      onChange={(e) =>
                        setEditingChild((c) =>
                          c ? { ...c, birthLengthCm: e.target.value } : null,
                        )
                      }
                      step="0.01"
                      type="number"
                      value={editingChild.birthLengthCm}
                    />
                  </label>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    className="primary-button"
                    disabled={isSavingEdit}
                    type="submit"
                  >
                    {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                  <button
                    className="delete-child-button"
                    disabled={isSavingEdit}
                    onClick={() => void handleDeleteChild(editingChild.id)}
                    type="button"
                  >
                    🗑️ Hapus Anak Ini
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => setDashboardTab('monitoring')}
                    type="button"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : null}

            <section className="panel">
              <div className="section-heading">
                <h2>Pilih Anak untuk Diedit</h2>
                <span>{children.length} Anak Terdaftar</span>
              </div>
              <div className="table-wrap">
                <table className="children-manage-table">
                  <thead>
                    <tr>
                      <th>Nama Lengkap</th>
                      <th>Jenis Kelamin</th>
                      <th>Tanggal Lahir</th>
                      <th>Berat Lahir</th>
                      <th>Panjang Lahir</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {children.length === 0 ? (
                      <tr>
                        <td colSpan={6}>Belum ada data anak.</td>
                      </tr>
                    ) : (
                      children.map((child) => (
                        <tr key={child.id}>
                          <td>
                            <strong>{child.fullName}</strong>
                          </td>
                          <td>
                            {child.gender === 'FEMALE'
                              ? 'Perempuan'
                              : 'Laki-laki'}
                          </td>
                          <td>{formatDate(child.birthDate)}</td>
                          <td>{formatDecimal(child.birthWeightKg)} kg</td>
                          <td>{formatDecimal(child.birthLengthCm)} cm</td>
                          <td>
                            <button
                              className="edit-child-button"
                              onClick={() => handleOpenEditChild(child)}
                              type="button"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        ) : dashboardTab === 'milestones' ? (
          <section className="panel">
            <h2>⭐ Milestone Perkembangan Si Kecil</h2>
            <p className="muted">
              Fitur katalog milestone perkembangan anak sesuai tahapan umur dari
              Kemenkes & WHO.
            </p>
          </section>
        ) : dashboardTab === 'immunizations' ? (
          <section className="panel">
            <h2>💉 Jadwal & Riwayat Imunisasi</h2>
            <p className="muted">
              Daftar vaksin wajib (HB0, BCG, Polio, DPT-HB-Hib, PCV, Rotavirus,
              Campak Rubella).
            </p>
          </section>
        ) : dashboardTab === 'master-data' ? (
          <section className="panel">
            <h2>📋 Master Data Standar Pertumbuhan</h2>
            <p className="muted">
              Tabel z-score antropometri WHO standar pemantauan posyandu dan
              klinik anak.
            </p>
          </section>
        ) : selectedChild ? (
          <>
            <header className="profile-header">
              <div className="profile-header-left">
                <img
                  src={babyAvatarSource}
                  alt={selectedChild.fullName}
                  className="profile-avatar-large"
                />
                <div>
                  <p className="eyebrow">Profil Terpilih</p>
                  <h2>
                    {selectedChild.fullName}
                    <span className="heart-icon">♥</span>
                  </h2>
                  <p>
                    {selectedChild.gender === 'FEMALE'
                      ? 'Perempuan'
                      : 'Laki-laki'}
                    {' · '}
                    Lahir {formatDate(selectedChild.birthDate)}
                  </p>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <button
                  className="edit-child-button"
                  onClick={() => handleOpenEditChild(selectedChild)}
                  title="Edit profil anak (khusus admin)"
                  type="button"
                >
                  ✏️ Edit Data Anak
                </button>
                <div className="age-pill">
                  {calculateAge(selectedChild.birthDate)}
                </div>
              </div>
            </header>

            <section className="stats-grid">
              <article className="stat-card tone-green">
                <span>Berat Badan Terakhir</span>
                <strong>
                  {formatDecimal(latestMeasurement?.weightKg)} kg
                </strong>
                <small>Pengukuran berkala</small>
              </article>
              <article className="stat-card tone-blue">
                <span>Tinggi Badan Terakhir</span>
                <strong>
                  {formatDecimal(latestMeasurement?.heightCm)} cm
                </strong>
                <small>Pertumbuhan fisik</small>
              </article>
              <article className="stat-card tone-pink">
                <span>Jadwal Pengingat</span>
                <strong>{upcomingReminders.length}</strong>
                <small>Reminder aktif</small>
              </article>
            </section>

            <section className="workspace-grid">
              <form
                className="panel form-grid"
                onSubmit={handleCreateMeasurement}
              >
                <h2>Catat Pengukuran Baru</h2>
                <label>
                  Tanggal Pengukuran
                  <input
                    onChange={(event) =>
                      setMeasurementForm((current) => ({
                        ...current,
                        measuredAt: event.target.value,
                      }))
                    }
                    required
                    type="date"
                    value={measurementForm.measuredAt}
                  />
                </label>
                <div className="three-cols">
                  <label>
                    Berat (kg)
                    <input
                      min="0"
                      onChange={(event) =>
                        setMeasurementForm((current) => ({
                          ...current,
                          weightKg: event.target.value,
                        }))
                      }
                      placeholder="Contoh: 4.1"
                      step="0.01"
                      type="number"
                      value={measurementForm.weightKg}
                    />
                  </label>
                  <label>
                    Tinggi (cm)
                    <input
                      min="0"
                      onChange={(event) =>
                        setMeasurementForm((current) => ({
                          ...current,
                          heightCm: event.target.value,
                        }))
                      }
                      placeholder="Contoh: 53.0"
                      step="0.01"
                      type="number"
                      value={measurementForm.heightCm}
                    />
                  </label>
                  <label>
                    Lingkar Kepala (cm)
                    <input
                      min="0"
                      onChange={(event) =>
                        setMeasurementForm((current) => ({
                          ...current,
                          headCircumferenceCm: event.target.value,
                        }))
                      }
                      placeholder="Contoh: 36.5"
                      step="0.01"
                      type="number"
                      value={measurementForm.headCircumferenceCm}
                    />
                  </label>
                </div>
                <label>
                  Catatan Tambahan
                  <textarea
                    onChange={(event) =>
                      setMeasurementForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Contoh: Bayi ceria, nafsu makan baik."
                    rows={3}
                    value={measurementForm.notes}
                  />
                </label>
                <button
                  className="primary-button"
                  disabled={isSavingMeasurement}
                >
                  {isSavingMeasurement
                    ? 'Menyimpan...'
                    : 'Simpan Data Pengukuran'}
                </button>
              </form>

              <section className="panel">
                <div className="section-heading">
                  <h2>Pengingat & Jadwal</h2>
                  <span>{selectedChild.reminders.length}</span>
                </div>
                <div className="stack-list">
                  {selectedChild.reminders.length === 0 ? (
                    <p className="muted">Belum ada pengingat kontrol.</p>
                  ) : (
                    selectedChild.reminders.map((reminder) => (
                      <button
                        className={
                          reminder.isDone ? 'reminder done' : 'reminder'
                        }
                        key={reminder.id}
                        onClick={() => void handleToggleReminder(reminder)}
                        type="button"
                      >
                        <div>
                          <span>{reminder.title}</span>
                          <small className="muted" style={{ display: 'block' }}>
                            {formatDate(reminder.reminderDate)}
                          </small>
                        </div>
                        <span className="reminder-checkbox">
                          {reminder.isDone ? '✓' : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h2>Riwayat Pemeriksaan Pertumbuhan</h2>
                <span>{selectedChild.measurements.length} Data</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Berat</th>
                      <th>Tinggi</th>
                      <th>Lingkar Kepala</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChild.measurements.length === 0 ? (
                      <tr>
                        <td colSpan={5}>Belum ada riwayat pengukuran.</td>
                      </tr>
                    ) : (
                      selectedChild.measurements.map((measurement) => (
                        <tr key={measurement.id}>
                          <td>{formatDate(measurement.measuredAt)}</td>
                          <td>
                            <strong>
                              {formatDecimal(measurement.weightKg)} kg
                            </strong>
                          </td>
                          <td>{formatDecimal(measurement.heightCm)} cm</td>
                          <td>
                            {formatDecimal(measurement.headCircumferenceCm)} cm
                          </td>
                          <td>{measurement.notes ?? '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : isLoading ? (
          <div className="empty-state-card">
            <img src={sleepBabySource} alt="Memuat data..." />
            <h3>Memuat Data Nata Baby...</h3>
            <p>Sedang menghubungkan ke server untuk mengambil profil anak.</p>
          </div>
        ) : (
          <div className="empty-state-card">
            <img src={sleepBabySource} alt="Si kecil sedang istirahat" />
            <h3>Belum Ada Data Anak</h3>
            <p>
              Silakan tambahkan data si kecil melalui form di samping kiri untuk
              mulai mencatat grafik pertumbuhan dan reminder.
            </p>
          </div>
        )}
      </section>

      {/* Modal Login Admin */}
      {showLoginModal ? (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setShowLoginModal(false)}
              type="button"
            >
              ✕
            </button>
            <div className="login-header">
              <img
                src={babyIconSquare}
                alt="Nata Baby Logo"
                className="login-brand-logo"
              />
              <span className="login-role-pill">Portal Administrator</span>
              <h1>Login Admin</h1>
              <p className="login-subtitle">
                Masuk dengan akun admin Anda untuk mengedit dan mengelola data anak.
              </p>
            </div>

            {loginModalError ? (
              <div className="alert">{loginModalError}</div>
            ) : null}

            <form className="login-form" onSubmit={handleLoginModalSubmit}>
              <label>
                Email Administrator
                <input
                  autoComplete="email"
                  disabled={isLoggingInModal}
                  onChange={(event) => setLoginModalEmail(event.target.value)}
                  placeholder="bagus@natababy.local"
                  required
                  type="email"
                  value={loginModalEmail}
                />
              </label>

              <label>
                Kata Sandi
                <input
                  autoComplete="current-password"
                  disabled={isLoggingInModal}
                  onChange={(event) =>
                    setLoginModalPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  required
                  type="password"
                  value={loginModalPassword}
                />
              </label>

              <button
                className="primary-button login-submit-btn"
                disabled={isLoggingInModal}
                type="submit"
              >
                {isLoggingInModal ? 'Memverifikasi...' : 'Masuk sebagai Admin'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
