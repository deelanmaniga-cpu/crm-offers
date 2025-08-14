import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import dayjs from 'dayjs'

const emptyFilters = {
  vertical: '',
  settle: '',
  rateMin: '',
  rateMax: '',
  volumeMin: '',
  volumeMax: '',
  dateFrom: '',
  dateTo: '',
  title: '',
  insurance: 'any' // any | yes | no
}

function useOffers(filters) {
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      let q = supabase.from('offers').select('*').order('date', { ascending: false }).order('id', { ascending: false })

      if (filters.vertical) q = q.ilike('vertical', `%${filters.vertical}%`)
      if (filters.settle) q = q.ilike('settle', `%${filters.settle}%`)
      if (filters.title) q = q.ilike('title', `%${filters.title}%`)

      if (filters.rateMin !== '') q = q.gte('rate', Number(filters.rateMin))
      if (filters.rateMax !== '') q = q.lte('rate', Number(filters.rateMax))

      if (filters.volumeMin !== '') q = q.gte('volume', Number(filters.volumeMin))
      if (filters.volumeMax !== '') q = q.lte('volume', Number(filters.volumeMax))

      if (filters.dateFrom) q = q.gte('date', filters.dateFrom)
      if (filters.dateTo) q = q.lte('date', filters.dateTo)

      if (filters.insurance === 'yes') q = q.eq('insurance', true)
      if (filters.insurance === 'no') q = q.eq('insurance', false)

      const { data, error } = await q
      if (error) throw error
      setOffers(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [JSON.stringify(filters)])

  return { offers, loading, error, refetch: fetchData }
}

function numberOrDash(val) {
  if (val === null || val === undefined) return '—'
  if (val === '') return '—'
  return Number(val).toLocaleString()
}

export default function App() {
  const [filters, setFilters] = useState(emptyFilters)
  const [form, setForm] = useState({ vertical:'', settle:'', rate:'', volume:'', date:'', title:'', insurance:false })
  const { offers, loading, error, refetch } = useOffers(filters)

  const clearFilters = () => setFilters(emptyFilters)

  const totals = useMemo(() => {
    const total = offers.length
    const vol = offers.reduce((acc,o)=>acc + (Number(o.volume)||0),0)
    const avgRate = offers.length ? offers.reduce((a,o)=>a + (Number(o.rate)||0),0)/offers.length : 0
    return { total, vol, avgRate }
  }, [offers])

  const saveOffer = async (e) => {
    e.preventDefault()
    const payload = {
      vertical: form.vertical?.trim() || null,
      settle: form.settle?.trim() || null,
      rate: form.rate === '' ? null : Number(form.rate),
      volume: form.volume === '' ? null : Number(form.volume),
      date: form.date || dayjs().format('YYYY-MM-DD'),
      title: form.title?.trim() || null,
      insurance: !!form.insurance
    }
    const { error } = await supabase.from('offers').insert(payload)
    if (error) { alert('Ошибка: ' + error.message); return }
    setForm({ vertical:'', settle:'', rate:'', volume:'', date:'', title:'', insurance:false })
    await refetch()
  }

  const deleteOffer = async (id) => {
    if (!confirm('Удалить оффер #' + id + '?')) return
    const { error } = await supabase.from('offers').delete().eq('id', id)
    if (error) { alert('Ошибка: ' + error.message); return }
    await refetch()
  }

  return (
    <div className="app">
      <header>
        <h1>CRM офферов</h1>
        <div className="right">
          <span className="pill">Онлайн • Supabase</span>
          <a className="linklike" href="https://supabase.com/docs/guides/getting-started" target="_blank" rel="noreferrer">Документация</a>
        </div>
      </header>

      <div className="container">
        {/* Filters */}
        <div className="panel filters">
          <div className="row" style={{justifyContent:'space-between'}}>
            <strong>Фильтры</strong>
            <button className="secondary" onClick={clearFilters}>Сброс</button>
          </div>

          <div className="field">
            <label>Вертикаль</label>
            <input placeholder="например, Gambling" value={filters.vertical} onChange={e=>setFilters(f=>({...f, vertical:e.target.value}))} />
          </div>
          <div className="field">
            <label>Сеттл</label>
            <input placeholder="например, Net7" value={filters.settle} onChange={e=>setFilters(f=>({...f, settle:e.target.value}))} />
          </div>

          <div className="row">
            <div className="field" style={{flex:1}}>
              <label>Ставка от</label>
              <input type="number" inputMode="decimal" value={filters.rateMin} onChange={e=>setFilters(f=>({...f, rateMin:e.target.value}))} />
            </div>
            <div className="field" style={{flex:1}}>
              <label>Ставка до</label>
              <input type="number" inputMode="decimal" value={filters.rateMax} onChange={e=>setFilters(f=>({...f, rateMax:e.target.value}))} />
            </div>
          </div>

          <div className="row">
            <div className="field" style={{flex:1}}>
              <label>Объём от</label>
              <input type="number" inputMode="numeric" value={filters.volumeMin} onChange={e=>setFilters(f=>({...f, volumeMin:e.target.value}))} />
            </div>
            <div className="field" style={{flex:1}}>
              <label>Объём до</label>
              <input type="number" inputMode="numeric" value={filters.volumeMax} onChange={e=>setFilters(f=>({...f, volumeMax:e.target.value}))} />
            </div>
          </div>

          <div className="row">
            <div className="field" style={{flex:1}}>
              <label>Дата с</label>
              <input type="date" value={filters.dateFrom} onChange={e=>setFilters(f=>({...f, dateFrom:e.target.value}))} />
            </div>
            <div className="field" style={{flex:1}}>
              <label>Дата по</label>
              <input type="date" value={filters.dateTo} onChange={e=>setFilters(f=>({...f, dateTo:e.target.value}))} />
            </div>
          </div>

          <div className="field">
            <label>Название (поиск)</label>
            <input placeholder="введите часть названия" value={filters.title} onChange={e=>setFilters(f=>({...f, title:e.target.value}))} />
          </div>

          <div className="field">
            <label>Страховой</label>
            <select value={filters.insurance} onChange={e=>setFilters(f=>({...f, insurance:e.target.value}))}>
              <option value="any">Любой</option>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </select>
          </div>

          <div className="help">
            Подсказка: фильтры применяются сразу. Нажми <span className="badge">Сброс</span> чтобы очистить.
          </div>
        </div>

        {/* Content */}
        <div className="content">
          <div className="panel">
            <strong>Добавить оффер</strong>
            <form className="form-grid" onSubmit={saveOffer} style={{marginTop:10}}>
              <div className="field">
                <label>Вертикаль</label>
                <input value={form.vertical} onChange={e=>setForm(s=>({...s, vertical:e.target.value}))} placeholder="Gambling / Nutra / Finance" />
              </div>
              <div className="field">
                <label>Сеттл</label>
                <input value={form.settle} onChange={e=>setForm(s=>({...s, settle:e.target.value}))} placeholder="Net7 / Net15 / RevShare" />
              </div>
              <div className="field">
                <label>Ставка</label>
                <input type="number" inputMode="decimal" value={form.rate} onChange={e=>setForm(s=>({...s, rate:e.target.value}))} placeholder="например, 250" />
              </div>
              <div className="field">
                <label>Объём</label>
                <input type="number" inputMode="numeric" value={form.volume} onChange={e=>setForm(s=>({...s, volume:e.target.value}))} placeholder="например, 1000" />
              </div>
              <div className="field">
                <label>Дата</label>
                <input type="date" value={form.date} onChange={e=>setForm(s=>({...s, date:e.target.value}))} />
              </div>
              <div className="field">
                <label>Название</label>
                <input value={form.title} onChange={e=>setForm(s=>({...s, title:e.target.value}))} placeholder="Краткое название оффера" />
              </div>
              <div className="field">
                <label>Страховой</label>
                <select value={form.insurance ? 'yes' : 'no'} onChange={e=>setForm(s=>({...s, insurance: e.target.value === 'yes'}))}>
                  <option value="no">Нет</option>
                  <option value="yes">Да</option>
                </select>
              </div>
              <div className="spacer"></div>
              <div className="row" style={{justifyContent:'flex-end', gap:8}}>
                <button type="button" className="secondary" onClick={()=>setForm({ vertical:'', settle:'', rate:'', volume:'', date:'', title:'', insurance:false })}>Очистить</button>
                <button type="submit" className="primary">Сохранить</button>
              </div>
            </form>
          </div>

          <div className="kpis">
            <div className="kpi"><div className="label">Найдено офферов</div><div className="value">{loading ? '...' : totals.total}</div></div>
            <div className="kpi"><div className="label">Суммарный объём</div><div className="value">{loading ? '...' : numberOrDash(totals.vol)}</div></div>
            <div className="kpi"><div className="label">Средняя ставка</div><div className="value">{loading ? '...' : totals.avgRate.toFixed(2)}</div></div>
          </div>

          <div className="panel table">
            {error && <div style={{padding:10,color:'salmon'}}>Ошибка: {error}</div>}
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Дата</th>
                  <th>Название</th>
                  <th>Вертикаль</th>
                  <th>Сеттл</th>
                  <th>Ставка</th>
                  <th>Объём</th>
                  <th>Страховой</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {!loading && offers.length === 0 && (
                  <tr><td colSpan="9" className="muted">Нет данных. Добавь первый оффер сверху.</td></tr>
                )}
                {offers.map(o => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.date ? dayjs(o.date).format('YYYY-MM-DD') : '—'}</td>
                    <td>{o.title || '—'}</td>
                    <td><span className="badge">{o.vertical || '—'}</span></td>
                    <td>{o.settle || '—'}</td>
                    <td>{numberOrDash(o.rate)}</td>
                    <td>{numberOrDash(o.volume)}</td>
                    <td>{o.insurance ? 'Да' : 'Нет'}</td>
                    <td><button className="danger" onClick={()=>deleteOffer(o.id)}>Удалить</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="footer">© CRM офферов • React + Supabase</div>
        </div>
      </div>
    </div>
  )
}
