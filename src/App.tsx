import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

// P2-2: klien HTTP dan formatter dipindah ke src/lib/ supaya bisa diuji
// tanpa React, dan supaya App.tsx tidak lagi memuat semuanya.
import {
  apiRequest,
  clearStoredAuth,
  getStoredAuth,
  saveStoredAuth,
} from './lib/api'
import {
  formatAge,
  formatDate,
  formatDecimal,
  formatHeight,
  formatWeight,
  toNumber,
} from './lib/format'

import babyAvatarSource from './assets/app-icon-baby.png'
import babyIconSquare from './assets/app-icon-square.png'
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
  armCircumferenceCm?: ApiDecimal | null
  armCircumferenceStatus?: string | null
  growthTrend?: string | null
  weightForAgeStatus?: string | null
  heightForAgeStatus?: string | null
  weightForHeightStatus?: string | null
  headCircumferenceStatus?: string | null
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
  armCircumferenceCm: string
  notes: string
}

type ImmunizationScheduleItem = {
  masterId: string
  vaccineName: string
  recommendedAgeMonth: number
  targetDate: string
  description: string | null
  isCompleted: boolean
  status: 'COMPLETED' | 'DUE' | 'OVERDUE' | 'UPCOMING'
  diffDays: number
  recordId: string | null
  givenDate: string | null
  location: string | null
  batchNumber: string | null
  administeredBy: string | null
  notes: string | null
}

type ImmunizationScheduleResponse = {
  childId: string
  childName: string
  birthDate: string
  ageInMonthsToday: number
  summary: {
    total: number
    completed: number
    due: number
    overdue: number
    upcoming: number
    hasActionRequired: boolean
  }
  schedule: ImmunizationScheduleItem[]
}

type MilestoneMasterItem = {
  id: string
  ageMonth: number
  category: string | null
  milestoneText: string
}

type ChildMilestoneItem = {
  id: string
  childId: string
  milestoneMasterId: string
  achieved: boolean | null
  achievedDate: string | null
  notes: string | null
  milestoneMaster?: MilestoneMasterItem
}

type VaccineModalData = {
  masterId: string
  vaccineName: string
  recordId: string | null
  givenDate: string
  location: string
  batchNumber: string
  administeredBy: string
  notes: string
}


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
  armCircumferenceCm: '',
  notes: '',
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



function numberOrUndefined(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  const cleaned = String(value).trim().replace(',', '.')
  if (cleaned === '') return undefined
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : undefined
}


function App() {
  const [route, setRoute] = useState<Route>(getRoute)
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('monitoring')
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    () => getStoredAuth().user as AuthUser | null,
  )
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginModalEmail, setLoginModalEmail] = useState('')
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

  // Smart Reminder & Imunisasi Buku KIA
  const [immunizationSchedule, setImmunizationSchedule] =
    useState<ImmunizationScheduleResponse | null>(null)
  const [vaccineFilter, setVaccineFilter] = useState<
    'all' | 'action_needed' | 'completed'
  >('all')
  const [vaccineModalData, setVaccineModalData] =
    useState<VaccineModalData | null>(null)
  const [isSavingVaccine, setIsSavingVaccine] = useState(false)
  const [vaccineMsg, setVaccineMsg] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Milestone & KPSP Buku KIA
  const [masterMilestones, setMasterMilestones] = useState<
    MilestoneMasterItem[]
  >([])
  const [childMilestones, setChildMilestones] = useState<ChildMilestoneItem[]>(
    [],
  )
  const [milestoneAgeFilter, setMilestoneAgeFilter] = useState<
    number | 'all'
  >('all')
  const [isUpdatingMilestone, setIsUpdatingMilestone] = useState(false)
  const [showLilaModal, setShowLilaModal] = useState(false)

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

  async function loadImmunizationSchedule(childId: string) {
    try {
      const data = await apiRequest<ImmunizationScheduleResponse>(
        `/api/children/${childId}/immunizations/schedule`,
      )
      setImmunizationSchedule(data)
    } catch {
      setImmunizationSchedule(null)
    }
  }

  async function loadMilestones(childId: string) {
    try {
      const [masters, given] = await Promise.all([
        apiRequest<MilestoneMasterItem[]>('/api/master-data/milestones'),
        apiRequest<ChildMilestoneItem[]>(`/api/children/${childId}/milestones`),
      ])
      setMasterMilestones(masters)
      setChildMilestones(given)
    } catch {
      // diamkan
    }
  }

  async function loadChildDetail(childId: string) {
    setError(null)

    try {
      const data = await apiRequest<ChildDetail>(`/api/children/${childId}`)
      setSelectedChild(data)
      void loadImmunizationSchedule(childId)
      void loadMilestones(childId)
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
      if (token && isAdminUser(user as AuthUser | null)) {
        apiRequest<AuthUser>('/api/auth/me')
          .then((verifiedUser) => {
            if (isAdminUser(verifiedUser)) {
              setCurrentUser(verifiedUser)
              saveStoredAuth(token, getStoredAuth().refreshToken, verifiedUser)
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
      if (token && isAdminUser(user as AuthUser | null)) {
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

    const parsedWeight = toNumber(target.birthWeightKg)
    const parsedLength = toNumber(target.birthLengthCm)

    setEditingChild({
      id: target.id,
      fullName: target.fullName,
      gender: target.gender,
      birthDate: target.birthDate ? target.birthDate.slice(0, 10) : '',
      birthWeightKg: parsedWeight !== null ? String(parsedWeight) : '',
      birthLengthCm: parsedLength !== null ? String(parsedLength) : '',
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

      saveStoredAuth(data.accessToken, data.refreshToken, data.user)
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

      saveStoredAuth(data.accessToken, data.refreshToken, data.user)
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
      const refreshToken = getStoredAuth().refreshToken
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
            armCircumferenceCm: numberOrUndefined(
              measurementForm.armCircumferenceCm,
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

  async function handleSaveVaccine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedChildId || !vaccineModalData) return

    setIsSavingVaccine(true)
    setVaccineMsg(null)

    try {
      if (vaccineModalData.recordId) {
        await apiRequest(
          `/api/children/${selectedChildId}/immunizations/${vaccineModalData.recordId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              immunizationMasterId: vaccineModalData.masterId,
              givenDate: vaccineModalData.givenDate || undefined,
              location: vaccineModalData.location || undefined,
              batchNumber: vaccineModalData.batchNumber || undefined,
              administeredBy: vaccineModalData.administeredBy || undefined,
              notes: vaccineModalData.notes || undefined,
            }),
          },
        )
      } else {
        await apiRequest(
          `/api/children/${selectedChildId}/immunizations`,
          {
            method: 'POST',
            body: JSON.stringify({
              immunizationMasterId: vaccineModalData.masterId,
              givenDate: vaccineModalData.givenDate || undefined,
              location: vaccineModalData.location || undefined,
              batchNumber: vaccineModalData.batchNumber || undefined,
              administeredBy: vaccineModalData.administeredBy || undefined,
              notes: vaccineModalData.notes || undefined,
            }),
          },
        )
      }

      setVaccineMsg({
        type: 'success',
        text: `Imunisasi ${vaccineModalData.vaccineName} berhasil dicatat!`,
      })
      await loadImmunizationSchedule(selectedChildId)
      setTimeout(() => {
        setVaccineModalData(null)
        setVaccineMsg(null)
      }, 900)
    } catch (err) {
      setVaccineMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mencatat imunisasi.',
      })
    } finally {
      setIsSavingVaccine(false)
    }
  }

  async function handleToggleMilestone(
    masterId: string,
    currentAchieved: boolean,
  ) {
    if (!selectedChildId || isUpdatingMilestone) return
    setIsUpdatingMilestone(true)

    try {
      const existing = childMilestones.find(
        (m) => String(m.milestoneMasterId) === String(masterId),
      )
      if (existing) {
        await apiRequest(
          `/api/children/${selectedChildId}/milestones/${existing.id}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              achieved: !currentAchieved,
              achievedDate: !currentAchieved
                ? new Date().toISOString().slice(0, 10)
                : null,
            }),
          },
        )
      } else {
        await apiRequest(`/api/children/${selectedChildId}/milestones`, {
          method: 'POST',
          body: JSON.stringify({
            milestoneMasterId: masterId,
            achieved: true,
            achievedDate: new Date().toISOString().slice(0, 10),
          }),
        })
      }
      await loadMilestones(selectedChildId)
    } catch {
      // toleransi kegagalan jaringan
    } finally {
      setIsUpdatingMilestone(false)
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
            <a href="#kia-standards">Panduan Buku KIA</a>
            <a href="#features">Fitur</a>
            <a href="#milestones">Milestone</a>
            <a href="#tips">Tips</a>
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
            <p className="eyebrow">🛡️ Panduan Resmi Buku KIA</p>
            <h1>
              Kawal Tumbuh Kembang Si Kecil dengan{' '}
              <span className="highlight">Buku KIA.</span>
            </h1>
            <p>
              Aplikasi pemantauan tumbuh kembang anak berbasis Buku KIA.
              Pantau kurva pertumbuhan WHO, skrining Lingkar Lengan Atas
              (LiLA), 21 jadwal imunisasi nasional, dan deteksi dini KPSP
              dalam satu aplikasi modern.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => navigate('dashboard')}
              >
                Buka Dashboard Pemantauan
              </button>
              <a className="secondary-link" href="#kia-standards">
                Pelajari Buku KIA ↓
              </a>
            </div>
          </div>

          {/* Hero Showcase with Buku KIA */}
          <div className="hero-kia-preview" aria-label="Buku KIA">
            <div className="hero-kia-book-card">
              <div className="kia-book-badge">
                <span className="kia-pill-tag">BUKU KIA</span>
                <span className="kia-pink-dot"></span>
                <span>Panduan Pelayanan Posyandu & Fasyankes</span>
              </div>
              <img
                src="/kia/kia-cover-banner.png"
                alt="Buku Kesehatan Ibu dan Anak"
                className="hero-kia-book-cover"
              />
              <div className="hero-stat-badges">
                <div className="hero-stat-badge green">
                  <span>Imunisasi Lengkap</span>
                  <strong>21 Vaksin</strong>
                  <small className="muted">PCV, RV, JE Lengkap</small>
                </div>
                <div className="hero-stat-badge pink">
                  <span>Skrining LiLA</span>
                  <strong>&ge; 12.5 cm</strong>
                  <small className="muted">Standar Pita Gizi</small>
                </div>
                <div className="hero-stat-badge blue">
                  <span>Deteksi KPSP</span>
                  <strong>Standar WHO</strong>
                  <small className="muted">Motorik & Bahasa</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Buku KIA Section */}
        <section className="kia-standards-section" id="kia-standards">
          <div className="section-title">
            <p className="eyebrow">Panduan Resmi Posyandu & Fasyankes</p>
            <h2>Panduan Buku KIA untuk Tumbuh Kembang Optimal</h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '16px',
                maxWidth: '720px',
                margin: '8px auto 0',
              }}
            >
              Buku KIA adalah panduan penting untuk mengawal kelangsungan
              hidup, tumbuh kembang, dan perlindungan anak dari risiko gangguan gizi
              sejak awal kehidupan.
            </p>
          </div>

          <div className="kia-cards-grid">
            <article className="kia-standard-card">
              <div className="kia-card-img-wrap">
                <img
                  src="/kia/kia-1000hpk.png"
                  alt="1000 Hari Pertama Kehidupan"
                />
              </div>
              <div className="kia-card-content">
                <span className="kia-card-tag">Pondasi Emas Anak</span>
                <h3>1000 Hari Pertama Kehidupan (1000 HPK)</h3>
                <p>
                  Masa paling krusial bagi perkembangan otak dan organ vital:
                  270 hari masa kandungan dan 730 hari awal kehidupan.
                  Kekurangan nutrisi pada fase ini berdampak permanen, sehingga
                  pemantauan berkala wajib dilakukan.
                </p>
              </div>
            </article>

            <article className="kia-standard-card">
              <div className="kia-card-img-wrap">
                <img
                  src="/kia/kia-lila-guide.png"
                  alt="Panduan Pita LiLA Buku KIA"
                />
              </div>
              <div className="kia-card-content">
                <span className="kia-card-tag">Deteksi Gizi Akut</span>
                <h3>Pita Lingkar Lengan Atas (LiLA)</h3>
                <p>
                  Skrining cepat malnutrisi dan stunting pada balita usia 6-59
                  bulan sesuai standar Posyandu: Merah (&lt;11.5 cm) Gizi Buruk,
                  Kuning (11.5 - 12.4 cm) Gizi Kurang, dan Hijau (&ge;12.5 cm)
                  Gizi Baik.
                </p>
              </div>
            </article>

            <article className="kia-standard-card">
              <div className="kia-card-img-wrap">
                <img
                  src="/kia/kia-newborn.png"
                  alt="Perawatan Bayi Baru Lahir"
                />
              </div>
              <div className="kia-card-content">
                <span className="kia-card-tag">Usia 0 - 28 Hari</span>
                <h3>Perawatan Bayi & Tanda Bahaya</h3>
                <p>
                  Panduan esensial perawatan tali pusat, ASI eksklusif, serta
                  deteksi dini tanda bahaya neonatal (napas cepat, kejang,
                  aktivitas lemah, demam, kulit kuning) untuk rujukan faskes
                  segera.
                </p>
              </div>
            </article>
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
            <h2>Empat Pilar Buku KIA untuk Ibu & Anak</h2>
          </div>
          <div className="feature-grid">
            <article>
              <div className="feature-icon-badge">📊</div>
              <h3>Antropometri WHO & LiLA</h3>
              <p>
                Hitung Z-Score status gizi (BB/U, TB/U, BB/TB, LK/U) dan status
                LiLA balita secara otomatis dengan indikator tren pertumbuhan Naik
                (N) atau Tidak Naik (T).
              </p>
            </article>
            <article>
              <div className="feature-icon-badge">💉</div>
              <h3>21 Jadwal Imunisasi Lengkap</h3>
              <p>
                Lengkap dengan imunisasi dasar dan lanjutan (PCV, Rotavirus, JE,
                booster) disertai Smart Reminder otomatis berdasarkan tanggal
                lahir bayi.
              </p>
            </article>
            <article>
              <div className="feature-icon-badge">⭐</div>
              <h3>Skrining KPSP Balita</h3>
              <p>
                Checklist kuesioner pra-skrining perkembangan motorik, bicara,
                dan sosialisasi sesuai kelompok umur 3 sampai 24 bulan di Buku
                KIA.
              </p>
            </article>
            <article>
              <div className="feature-icon-badge">🤰</div>
              <h3>Persiapan Pilar Ibu Hamil</h3>
              <p>
                Fondasi pencatatan kunjungan ANC dokter/bidan, konsumsi Tablet
                Tambah Darah (TTD), dan perencanaan persalinan aman (P4K).
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <div className="kia-book-badge">
                <span className="kia-pill-tag">BUKU KIA</span>
                <span className="kia-pink-dot"></span>
                <span>Portal Administrator</span>
              </div>
            </div>
            <img
              src={babyIconSquare}
              alt="Nata Baby Logo"
              className="login-brand-logo"
            />
            <h1>Masuk Dashboard Admin</h1>
            <p className="login-subtitle">
              Kelola data pemantauan tumbuh kembang anak, antropometri LiLA, checklist KPSP, dan 21 jadwal imunisasi nasional.
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
                placeholder="email@contoh.com"
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
              🔒 <strong>Akses Administrator:</strong> Gunakan akun admin kamu (<code>bagus@natabay.local</code> / <code>bagus@natababy.local</code>).
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
            <small>Buku KIA</small>
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
                      {formatAge(child.birthDate)}
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
                          <td>{formatWeight(child.birthWeightKg)}</td>
                          <td>{formatHeight(child.birthLengthCm)}</td>
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
            <div className="section-heading">
              <div>
                <h2>⭐ Deteksi Dini Tumbuh Kembang (KPSP Buku KIA)</h2>
                <p className="muted">
                  {selectedChild
                    ? `Kuesioner Pra-Skrining Perkembangan untuk ${selectedChild.fullName} (${formatAge(selectedChild.birthDate)})`
                    : 'Pilih profil anak di panel samping untuk melihat checklist perkembangan.'}
                </p>
              </div>
            </div>

            {selectedChild ? (
              <>
                <div className="filter-bar">
                  <button
                    className={`filter-btn ${milestoneAgeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setMilestoneAgeFilter('all')}
                    type="button"
                  >
                    Semua Usia ({masterMilestones.length})
                  </button>
                  {[3, 6, 9, 12, 18, 24].map((age) => (
                    <button
                      className={`filter-btn ${milestoneAgeFilter === age ? 'active' : ''}`}
                      key={age}
                      onClick={() => setMilestoneAgeFilter(age)}
                      type="button"
                    >
                      {age} Bulan
                    </button>
                  ))}
                </div>

                <div className="milestone-grid">
                  {masterMilestones
                    .filter((m) =>
                      milestoneAgeFilter === 'all'
                        ? true
                        : m.ageMonth <= milestoneAgeFilter,
                    )
                    .map((item) => {
                      const record = childMilestones.find(
                        (cm) => String(cm.milestoneMasterId) === String(item.id),
                      )
                      const isAchieved = Boolean(record && record.achieved)

                      return (
                        <div
                          className={`milestone-card ${isAchieved ? 'achieved' : ''}`}
                          key={item.id}
                        >
                          <input
                            checked={isAchieved}
                            disabled={isUpdatingMilestone}
                            onChange={() =>
                              void handleToggleMilestone(item.id, isAchieved)
                            }
                            type="checkbox"
                          />
                          <div className="milestone-info">
                            <div>
                              <span className="milestone-category-pill">
                                {item.category ?? 'Perkembangan'} · Usia{' '}
                                {item.ageMonth} Bln
                              </span>
                            </div>
                            <div className="milestone-text">
                              {item.milestoneText}
                            </div>
                            {isAchieved && record?.achievedDate && (
                              <div className="milestone-date">
                                ✓ Tercapai pada {formatDate(record.achievedDate)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            ) : (
              <div className="empty-state-card">
                <img src={sleepBabySource} alt="Pilih anak" />
                <h3>Pilih Anak Terlebih Dahulu</h3>
                <p>
                  Pilih profil anak dari daftar di sebelah kiri untuk melihat
                  checklist KPSP.
                </p>
              </div>
            )}
          </section>
        ) : dashboardTab === 'immunizations' ? (
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>💉 Jadwal & Smart Reminder Imunisasi (Buku KIA)</h2>
                <p className="muted">
                  {selectedChild
                    ? `Program Imunisasi Nasional untuk ${selectedChild.fullName} (Lahir: ${formatDate(selectedChild.birthDate)})`
                    : 'Pilih profil anak di panel samping untuk melihat jadwal dan pengingat imunisasi.'}
                </p>
              </div>
            </div>

            {selectedChild && immunizationSchedule ? (
              <>
                {/* Summary Chips */}
                <div className="reminder-summary-chips">
                  <div className="summary-chip">
                    📋 Total: {immunizationSchedule.summary.total} Vaksin
                  </div>
                  <div className="summary-chip success">
                    ✓ Lengkap: {immunizationSchedule.summary.completed}
                  </div>
                  <div className="summary-chip warning">
                    ⚠️ Jatuh Tempo: {immunizationSchedule.summary.due}
                  </div>
                  <div className="summary-chip danger">
                    🔴 Terlewat: {immunizationSchedule.summary.overdue}
                  </div>
                  <div className="summary-chip">
                    ⏳ Akan Datang: {immunizationSchedule.summary.upcoming}
                  </div>
                </div>

                {/* In-App Alert Reminder Banner */}
                {immunizationSchedule.summary.hasActionRequired && (
                  <div
                    className={`reminder-alert-banner ${
                      immunizationSchedule.summary.overdue > 0 ? 'danger' : ''
                    }`}
                  >
                    <div className="reminder-banner-content">
                      <h4>
                        {immunizationSchedule.summary.overdue > 0
                          ? '🔴 Ada Imunisasi yang Terlewat (Perlu Imunisasi Kejar)'
                          : '⚠️ Imunisasi Jatuh Tempo Bulan Ini'}
                      </h4>
                      <p>
                        Sesuai pedoman Buku KIA, si kecil perlu segera
                        mendapatkan imunisasi di Posyandu atau fasilitas
                        kesehatan terdekat.
                      </p>
                    </div>
                  </div>
                )}

                {/* Filter Pills */}
                <div className="filter-bar">
                  <button
                    className={`filter-btn ${vaccineFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setVaccineFilter('all')}
                    type="button"
                  >
                    Semua Vaksin ({immunizationSchedule.schedule.length})
                  </button>
                  <button
                    className={`filter-btn ${vaccineFilter === 'action_needed' ? 'active' : ''}`}
                    onClick={() => setVaccineFilter('action_needed')}
                    type="button"
                  >
                    Perlu Tindakan (
                    {immunizationSchedule.summary.due +
                      immunizationSchedule.summary.overdue}
                    )
                  </button>
                  <button
                    className={`filter-btn ${vaccineFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setVaccineFilter('completed')}
                    type="button"
                  >
                    Sudah Diberikan ({immunizationSchedule.summary.completed})
                  </button>
                </div>

                {/* Vaccine Cards Grid */}
                <div className="vaccine-grid">
                  {immunizationSchedule.schedule
                    .filter((item) => {
                      if (vaccineFilter === 'completed') return item.isCompleted
                      if (vaccineFilter === 'action_needed')
                        return item.status === 'DUE' || item.status === 'OVERDUE'
                      return true
                    })
                    .map((item) => (
                      <div className="vaccine-card" key={item.masterId}>
                        <div>
                          <div className="vaccine-card-header">
                            <span className="vaccine-age-badge">
                              {item.recommendedAgeMonth === 0
                                ? '0-24 Jam'
                                : `${item.recommendedAgeMonth} Bulan`}
                            </span>
                            <span
                              className={`status-badge ${item.status.toLowerCase()}`}
                            >
                              {item.status === 'COMPLETED'
                                ? '✓ Selesai'
                                : item.status === 'DUE'
                                  ? '⚠️ Jatuh Tempo'
                                  : item.status === 'OVERDUE'
                                    ? '🔴 Terlewat'
                                    : '⏳ Belum Waktunya'}
                            </span>
                          </div>
                          <h3 className="vaccine-name">{item.vaccineName}</h3>
                          <p className="vaccine-target-date">
                            Target Jadwal: {formatDate(item.targetDate)}
                          </p>
                          {item.description && (
                            <p className="vaccine-description">
                              {item.description}
                            </p>
                          )}
                          {item.isCompleted && (
                            <div className="vaccine-record-details">
                              <p>
                                <strong>Disuntik:</strong>{' '}
                                {formatDate(item.givenDate)}
                              </p>
                              {item.location && (
                                <p>
                                  <strong>Lokasi:</strong> {item.location}
                                </p>
                              )}
                              {item.batchNumber && (
                                <p>
                                  <strong>No. Batch:</strong> {item.batchNumber}
                                </p>
                              )}
                              {item.administeredBy && (
                                <p>
                                  <strong>Petugas:</strong> {item.administeredBy}
                                </p>
                              )}
                              {item.notes && (
                                <p>
                                  <strong>Catatan:</strong> {item.notes}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="vaccine-actions">
                          <button
                            className="btn-record-vaccine"
                            onClick={() =>
                              setVaccineModalData({
                                masterId: item.masterId,
                                vaccineName: item.vaccineName,
                                recordId: item.recordId,
                                givenDate:
                                  item.givenDate ||
                                  new Date().toISOString().slice(0, 10),
                                location:
                                  item.location || 'Posyandu / Puskesmas',
                                batchNumber: item.batchNumber || '',
                                administeredBy: item.administeredBy || '',
                                notes: item.notes || '',
                              })
                            }
                            type="button"
                          >
                            {item.isCompleted
                              ? '✏️ Ubah Catatan'
                              : '+ Catat Imunisasi'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="empty-state-card">
                <img src={sleepBabySource} alt="Pilih anak" />
                <h3>Pilih Anak Terlebih Dahulu</h3>
                <p>
                  Pilih profil anak dari daftar di sebelah kiri untuk melihat
                  jadwal imunisasi dan smart reminder.
                </p>
              </div>
            )}
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
                  {formatAge(selectedChild.birthDate)}
                </div>
              </div>
            </header>

            {/* In-App Smart Reminder Banner */}
            {immunizationSchedule?.summary.hasActionRequired && (
              <div
                className={`reminder-alert-banner ${
                  immunizationSchedule.summary.overdue > 0 ? 'danger' : ''
                }`}
              >
                <div className="reminder-banner-content">
                  <h4>
                    {immunizationSchedule.summary.overdue > 0
                      ? '🔴 Ada Imunisasi yang Terlewat (Perlu Imunisasi Kejar)'
                      : '⚠️ Imunisasi Jatuh Tempo Bulan Ini'}
                  </h4>
                  <p>
                    {selectedChild.fullName} memiliki{' '}
                    {immunizationSchedule.summary.due > 0 &&
                      `${immunizationSchedule.summary.due} vaksin jatuh tempo`}
                    {immunizationSchedule.summary.due > 0 &&
                      immunizationSchedule.summary.overdue > 0 &&
                      ' dan '}
                    {immunizationSchedule.summary.overdue > 0 &&
                      `${immunizationSchedule.summary.overdue} vaksin terlewat`}
                    {' '}sesuai Buku KIA.
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setDashboardTab('immunizations')}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  type="button"
                >
                  Lihat Jadwal Imunisasi →
                </button>
              </div>
            )}

            <section className="stats-grid">
              <article className="stat-card tone-green">
                <span>Berat Badan Terakhir</span>
                <strong>
                  {formatWeight(latestMeasurement?.weightKg)}
                </strong>
                <small>Pengukuran berkala</small>
              </article>
              <article className="stat-card tone-blue">
                <span>Tinggi Badan Terakhir</span>
                <strong>
                  {formatHeight(latestMeasurement?.heightCm)}
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
                <div className="four-cols">
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
                  <label>
                    LiLA (cm) - Posyandu
                    <input
                      min="0"
                      onChange={(event) =>
                        setMeasurementForm((current) => ({
                          ...current,
                          armCircumferenceCm: event.target.value,
                        }))
                      }
                      placeholder="Contoh: 12.5"
                      step="0.1"
                      type="number"
                      value={measurementForm.armCircumferenceCm}
                    />
                  </label>
                </div>

                <div className="lila-hint-banner">
                  <div className="lila-hint-text">
                    <strong>💡 Standar Pita LiLA Buku KIA (Usia 6-59 Bulan):</strong>
                    <div className="lila-pills-row">
                      <span className="lila-pill-green">🟢 &ge; 12.5 cm: Normal / Gizi Baik</span>
                      <span className="lila-pill-yellow">🟡 11.5 - 12.4 cm: Waspada Gizi Kurang</span>
                      <span className="lila-pill-red">🔴 &lt; 11.5 cm: Gizi Buruk</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="lila-guide-toggle-btn"
                    onClick={() => setShowLilaModal(true)}
                  >
                    📖 Buka Panduan Visual Pita LiLA
                  </button>
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
                  type="submit"
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
                      <th>Berat & Tren</th>
                      <th>Tinggi & Status</th>
                      <th>Lingkar Kepala</th>
                      <th>LiLA (cm)</th>
                      <th>Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChild.measurements.length === 0 ? (
                      <tr>
                        <td colSpan={6}>Belum ada riwayat pengukuran.</td>
                      </tr>
                    ) : (
                      selectedChild.measurements.map((measurement) => (
                        <tr key={measurement.id}>
                          <td>{formatDate(measurement.measuredAt)}</td>
                          <td>
                            <strong>
                              {formatDecimal(measurement.weightKg)} kg
                            </strong>
                            {measurement.growthTrend && (
                              <span
                                className={`status-badge ${
                                  measurement.growthTrend === 'N'
                                    ? 'completed'
                                    : 'overdue'
                                }`}
                                style={{ marginLeft: '6px' }}
                                title={
                                  measurement.growthTrend === 'N'
                                    ? 'Naik (pertumbuhan baik)'
                                    : 'Tidak Naik (perlu perhatian)'
                                }
                              >
                                {measurement.growthTrend === 'N'
                                  ? '↑ Naik'
                                  : '— Tetap'}
                              </span>
                            )}
                          </td>
                          <td>
                            {formatDecimal(measurement.heightCm)} cm
                            {measurement.heightForAgeStatus && (
                              <small
                                className="muted"
                                style={{ display: 'block' }}
                              >
                                {measurement.heightForAgeStatus}
                              </small>
                            )}
                          </td>
                          <td>
                            {formatDecimal(measurement.headCircumferenceCm)} cm
                          </td>
                          <td>
                            {measurement.armCircumferenceCm
                              ? `${formatDecimal(measurement.armCircumferenceCm)} cm`
                              : '-'}
                            {measurement.armCircumferenceStatus && (
                              <small
                                className="muted"
                                style={{ display: 'block' }}
                              >
                                {measurement.armCircumferenceStatus}
                              </small>
                            )}
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
                  placeholder="email@contoh.com"
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

      {/* Modal Catat Imunisasi (Buku KIA) */}
      {vaccineModalData ? (
        <div
          className="modal-overlay"
          onClick={() => setVaccineModalData(null)}
        >
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <button
              className="modal-close-btn"
              onClick={() => setVaccineModalData(null)}
              type="button"
            >
              ✕
            </button>
            <div className="login-header">
              <span className="login-role-pill">Buku KIA</span>
              <h2>💉 Catat Imunisasi</h2>
              <p className="login-subtitle">
                {vaccineModalData.vaccineName} untuk {selectedChild?.fullName}
              </p>
            </div>

            {vaccineMsg ? (
              <div
                className={`alert ${
                  vaccineMsg.type === 'success' ? 'alert-success' : ''
                }`}
              >
                {vaccineMsg.text}
              </div>
            ) : null}

            <form className="login-form" onSubmit={handleSaveVaccine}>
              <label>
                Tanggal Penyuntikan
                <input
                  disabled={isSavingVaccine}
                  onChange={(event) =>
                    setVaccineModalData({
                      ...vaccineModalData,
                      givenDate: event.target.value,
                    })
                  }
                  required
                  type="date"
                  value={vaccineModalData.givenDate}
                />
              </label>

              <label>
                Lokasi / Fasilitas Kesehatan
                <input
                  disabled={isSavingVaccine}
                  onChange={(event) =>
                    setVaccineModalData({
                      ...vaccineModalData,
                      location: event.target.value,
                    })
                  }
                  placeholder="Contoh: Posyandu Melati / Puskesmas"
                  type="text"
                  value={vaccineModalData.location}
                />
              </label>

              <div className="two-cols">
                <label>
                  Nomor Batch Vaksin
                  <input
                    disabled={isSavingVaccine}
                    onChange={(event) =>
                      setVaccineModalData({
                        ...vaccineModalData,
                        batchNumber: event.target.value,
                      })
                    }
                    placeholder="Contoh: PCV-01-X"
                    type="text"
                    value={vaccineModalData.batchNumber}
                  />
                </label>
                <label>
                  Petugas / Bidan
                  <input
                    disabled={isSavingVaccine}
                    onChange={(event) =>
                      setVaccineModalData({
                        ...vaccineModalData,
                        administeredBy: event.target.value,
                      })
                    }
                    placeholder="Contoh: Bidan Siti"
                    type="text"
                    value={vaccineModalData.administeredBy}
                  />
                </label>
              </div>

              <label>
                Catatan Tambahan (KIPI / Reaksi Pasca Suntik)
                <textarea
                  disabled={isSavingVaccine}
                  onChange={(event) =>
                    setVaccineModalData({
                      ...vaccineModalData,
                      notes: event.target.value,
                    })
                  }
                  placeholder="Contoh: Agak hangat sedikit setelah imunisasi."
                  rows={2}
                  value={vaccineModalData.notes}
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  marginTop: '10px',
                }}
              >
                <button
                  className="ghost-button"
                  onClick={() => setVaccineModalData(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="primary-button"
                  disabled={isSavingVaccine}
                  type="submit"
                >
                  {isSavingVaccine ? 'Menyimpan...' : 'Simpan Imunisasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showLilaModal ? (
        <div className="modal-backdrop" onClick={() => setShowLilaModal(false)}>
          <div
            className="modal-card lila-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="login-role-pill">Panduan Buku KIA</span>
                <h3 style={{ margin: '6px 0 0', fontSize: '18px' }}>
                  Panduan Pengukuran Lingkar Lengan Atas (LiLA)
                </h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowLilaModal(false)}
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="lila-modal-body">
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  margin: '8px 0 14px',
                  lineHeight: '1.5',
                }}
              >
                Pengukuran LiLA dilakukan di lengan yang tidak aktif (biasanya lengan kiri)
                pada balita usia 6-59 bulan untuk skrining gizi dan rujukan cepat di Posyandu/Fasilitas Kesehatan.
              </p>
              <img
                src="/kia/kia-lila-guide.png"
                alt="Panduan Pita LiLA Buku KIA"
                className="lila-modal-img"
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '16px',
              }}
            >
              <button
                className="primary-button"
                onClick={() => setShowLilaModal(false)}
                type="button"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
