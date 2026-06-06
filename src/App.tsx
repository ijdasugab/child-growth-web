import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Route = 'landing' | 'dashboard'
type Gender = 'MALE' | 'FEMALE'
type ApiDecimal = string | number | { s: number; e: number; d: number[] }

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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Request gagal (${response.status})`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

function getRoute(): Route {
  return window.location.pathname.startsWith('/dashboard')
    ? 'dashboard'
    : 'landing'
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
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [selectedChild, setSelectedChild] = useState<ChildDetail | null>(null)
  const [childForm, setChildForm] = useState<ChildForm>(initialChildForm)
  const [measurementForm, setMeasurementForm] = useState<MeasurementForm>(
    initialMeasurementForm,
  )
  const [isLoading, setIsLoading] = useState(true)
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
    const path = nextRoute === 'dashboard' ? '/dashboard' : '/'
    window.history.pushState({}, '', path)
    setRoute(nextRoute)
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

  useEffect(() => {
    void loadChildren()
  }, [])

  useEffect(() => {
    function handlePopState() {
      setRoute(getRoute())
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
        className={mode === 'setup' ? 'setup-card form-grid' : 'panel form-grid'}
        onSubmit={handleCreateChild}
      >
        <div>
          <p className="eyebrow">Profil anak</p>
          <h2>
            {mode === 'setup'
              ? 'Buat data anak untuk memulai'
              : 'Tambah Data Anak'}
          </h2>
        </div>
        <label>
          Nama lengkap
          <input
            onChange={(event) =>
              setChildForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            placeholder="Contoh: Alya Putri"
            required
            type="text"
            value={childForm.fullName}
          />
        </label>
        <div className="two-cols">
          <label>
            Jenis kelamin
            <select
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  gender: event.target.value as Gender,
                }))
              }
              value={childForm.gender}
            >
              <option value="MALE">Laki-laki</option>
              <option value="FEMALE">Perempuan</option>
            </select>
          </label>
          <label>
            Tanggal lahir
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
            Berat lahir
            <input
              min="0"
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  birthWeightKg: event.target.value,
                }))
              }
              placeholder="kg"
              step="0.01"
              type="number"
              value={childForm.birthWeightKg}
            />
          </label>
          <label>
            Panjang lahir
            <input
              min="0"
              onChange={(event) =>
                setChildForm((current) => ({
                  ...current,
                  birthLengthCm: event.target.value,
                }))
              }
              placeholder="cm"
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
              ? 'Buat Profil Anak'
              : 'Simpan Anak'}
        </button>
      </form>
    )
  }

  if (route === 'landing') {
    return (
      <main className="marketing-page">
        <nav className="marketing-nav">
          <button
            className="brand brand-button"
            onClick={() => navigate('landing')}
            type="button"
          >
            <span className="brand-mark">CG</span>
            <span>
              <strong>Child Growth</strong>
              <small>Parent care platform</small>
            </span>
          </button>
          <div className="nav-actions">
            <a href="#features">Fitur</a>
            <a href="#workflow">Alur</a>
            <button className="ghost-button" onClick={() => navigate('dashboard')}>
              Dashboard Admin
            </button>
          </div>
        </nav>

        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Aplikasi tumbuh kembang anak</p>
            <h1>Monitoring anak lebih tenang untuk orang tua dan admin layanan.</h1>
            <p>
              Catat profil anak, pengukuran rutin, dan reminder kontrol dalam
              satu sistem yang siap dipakai sebagai dashboard web dan fondasi
              aplikasi mobile.
            </p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => navigate('dashboard')}>
                Buka Dashboard
              </button>
              <a className="secondary-link" href="#features">
                Lihat Fitur
              </a>
            </div>
          </div>
          <div className="hero-product" aria-label="Preview dashboard">
            <div className="preview-topbar">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="preview-profile">
              <span className="preview-avatar">A</span>
              <div>
                <strong>Alya Putri</strong>
                <small>Perempuan · 2 tahun 4 bulan</small>
              </div>
            </div>
            <div className="preview-stats">
              <article>
                <small>Berat</small>
                <strong>11.2 kg</strong>
              </article>
              <article>
                <small>Tinggi</small>
                <strong>86 cm</strong>
              </article>
              <article>
                <small>Reminder</small>
                <strong>2</strong>
              </article>
            </div>
            <div className="preview-chart">
              <span style={{ height: '42%' }}></span>
              <span style={{ height: '58%' }}></span>
              <span style={{ height: '52%' }}></span>
              <span style={{ height: '74%' }}></span>
              <span style={{ height: '68%' }}></span>
            </div>
          </div>
        </section>

        <section className="feature-section" id="features">
          <div className="section-title">
            <p className="eyebrow">Untuk web dan mobile</p>
            <h2>Satu backend, dua pengalaman produk.</h2>
          </div>
          <div className="feature-grid">
            <article>
              <span>01</span>
              <h3>Landing page publik</h3>
              <p>
                Halaman perkenalan produk, manfaat, dan pintu masuk menuju
                dashboard admin.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Dashboard admin</h3>
              <p>
                Kelola data anak, pantau pengukuran, dan lihat reminder dari
                API yang sama.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Siap untuk mobile</h3>
              <p>
                Flow onboarding dan monitoring bisa diadaptasi ke Expo React
                Native tanpa mengganti backend.
              </p>
            </article>
          </div>
        </section>

        <section className="workflow-section" id="workflow">
          <div>
            <p className="eyebrow">Alur produk</p>
            <h2>Orang tua mulai dari profil anak, admin memantau dari web.</h2>
          </div>
          <ol>
            <li>Buat atau pilih data anak.</li>
            <li>Catat berat, tinggi, dan lingkar kepala.</li>
            <li>Pantau riwayat dan reminder kontrol.</li>
          </ol>
        </section>
      </main>
    )
  }

  return (
    <main className={`admin-shell theme-${dashboardGender.toLowerCase()}`}>
      <aside className="sidebar" aria-label="Dashboard admin">
        <div className="brand">
          <span className="brand-mark">CG</span>
          <div>
            <strong>Child Growth Admin</strong>
            <small>Dashboard monitoring</small>
          </div>
        </div>

        <nav className="admin-menu" aria-label="Menu admin">
          <button className="active" type="button">
            Monitoring
          </button>
          <button type="button">Data Anak</button>
          <button type="button">Reminder</button>
          <button type="button">Master Data</button>
        </nav>

        <section className="panel">
          <div className="section-heading">
            <h1>Data Anak</h1>
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
                  onClick={() => setSelectedChildId(child.id)}
                  type="button"
                >
                  <span>{child.fullName}</span>
                  <small>{calculateAge(child.birthDate)}</small>
                </button>
              ))
            )}
          </div>
        </section>

        {renderChildForm('sidebar')}

        <button className="back-link" onClick={() => navigate('landing')}>
          Kembali ke landing page
        </button>
      </aside>

      <section className="content">
        {error ? <div className="alert">{error}</div> : null}

        {selectedChild ? (
          <>
            <header className="profile-header">
              <div>
                <p className="eyebrow">Monitoring anak</p>
                <h2>{selectedChild.fullName}</h2>
                <p>
                  {selectedChild.gender === 'FEMALE' ? 'Perempuan' : 'Laki-laki'}
                  {' · '}
                  Lahir {formatDate(selectedChild.birthDate)}
                </p>
              </div>
              <div className="age-pill">{calculateAge(selectedChild.birthDate)}</div>
            </header>

            <section className="stats-grid">
              <article>
                <span>Berat terakhir</span>
                <strong>{formatDecimal(latestMeasurement?.weightKg)} kg</strong>
              </article>
              <article>
                <span>Tinggi terakhir</span>
                <strong>{formatDecimal(latestMeasurement?.heightCm)} cm</strong>
              </article>
              <article>
                <span>Reminder aktif</span>
                <strong>{upcomingReminders.length}</strong>
              </article>
            </section>

            <section className="workspace-grid">
              <form className="panel form-grid" onSubmit={handleCreateMeasurement}>
                <h2>Catat Pengukuran</h2>
                <label>
                  Tanggal ukur
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
                    Berat
                    <input
                      min="0"
                      onChange={(event) =>
                        setMeasurementForm((current) => ({
                          ...current,
                          weightKg: event.target.value,
                        }))
                      }
                      placeholder="kg"
                      step="0.01"
                      type="number"
                      value={measurementForm.weightKg}
                    />
                  </label>
                  <label>
                    Tinggi
                    <input
                      min="0"
                      onChange={(event) =>
                        setMeasurementForm((current) => ({
                          ...current,
                          heightCm: event.target.value,
                        }))
                      }
                      placeholder="cm"
                      step="0.01"
                      type="number"
                      value={measurementForm.heightCm}
                    />
                  </label>
                  <label>
                    Lingkar kepala
                    <input
                      min="0"
                      onChange={(event) =>
                        setMeasurementForm((current) => ({
                          ...current,
                          headCircumferenceCm: event.target.value,
                        }))
                      }
                      placeholder="cm"
                      step="0.01"
                      type="number"
                      value={measurementForm.headCircumferenceCm}
                    />
                  </label>
                </div>
                <label>
                  Catatan
                  <textarea
                    onChange={(event) =>
                      setMeasurementForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                    value={measurementForm.notes}
                  />
                </label>
                <button className="primary-button" disabled={isSavingMeasurement}>
                  {isSavingMeasurement ? 'Menyimpan...' : 'Simpan Pengukuran'}
                </button>
              </form>

              <section className="panel">
                <div className="section-heading">
                  <h2>Reminder</h2>
                  <span>{selectedChild.reminders.length}</span>
                </div>
                <div className="stack-list">
                  {selectedChild.reminders.length === 0 ? (
                    <p className="muted">Belum ada reminder.</p>
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
                        <span>{reminder.title}</span>
                        <small>{formatDate(reminder.reminderDate)}</small>
                      </button>
                    ))
                  )}
                </div>
              </section>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h2>Riwayat Pengukuran</h2>
                <span>{selectedChild.measurements.length}</span>
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
                        <td colSpan={5}>Belum ada data pengukuran.</td>
                      </tr>
                    ) : (
                      selectedChild.measurements.map((measurement) => (
                        <tr key={measurement.id}>
                          <td>{formatDate(measurement.measuredAt)}</td>
                          <td>{formatDecimal(measurement.weightKg)} kg</td>
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
          <section className="setup-loading">
            <div className="brand setup-brand">
              <span className="brand-mark">CG</span>
              <div>
                <strong>Child Growth Admin</strong>
                <small>Dashboard monitoring</small>
              </div>
            </div>
            <p className="eyebrow">Mohon tunggu</p>
            <h1>Menyiapkan data dashboard...</h1>
          </section>
        ) : (
          <section className="setup-layout">
            <div className="setup-copy">
              <p className="eyebrow">Data awal</p>
              <h1>Tambahkan data anak sebelum mulai monitoring.</h1>
              <p>
                Dashboard admin membutuhkan minimal satu profil anak untuk
                menampilkan pengukuran, reminder, dan riwayat monitoring.
              </p>
            </div>
            {renderChildForm('setup')}
          </section>
        )}
      </section>
    </main>
  )
}

export default App
