const err = (msg, code) => Object.assign(new Error(msg), { statusCode: code })

const pad2 = (n) => (n < 10 ? `0${n}` : String(n))

const normalizeTime = (time) => {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(time).trim())
  if (!m) throw err('Time must be HH:MM or HH:MM:SS', 400)
  const h = Number(m[1])
  const min = Number(m[2])
  const sec = Number(m[3] || 0)
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
    throw err('Invalid time value', 400)
  }
  return `${pad2(h)}:${pad2(min)}`
}

const parseIsoDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim())
  if (!m) throw err('Date must be YYYY-MM-DD', 400)
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0)
  if (Number.isNaN(d.getTime())) throw err('Invalid date value', 400)
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), iso: `${m[1]}-${m[2]}-${m[3]}` }
}

const combineDateTime = (isoDate, timeStr) => {
  const { year, month, day } = parseIsoDate(isoDate)
  const hm = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(normalizeTime(timeStr))
  return new Date(year, month - 1, day, Number(hm[1]), Number(hm[2]), Number(hm[3] || 0), 0)
}

const formatIsoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

const formatTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`

const formatLongDate = (d) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const formatAmPm = (d) =>
  d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })

const buildValidityText = (start, end) =>
  `From ${formatLongDate(start)}, ${formatAmPm(start)} to ${formatLongDate(end)}, ${formatAmPm(end)}.`

const resolveVisitorWindow = (input) => {
  if (input.fromDate && input.toDate && input.fromTime && input.toTime) {
    const fromDate = parseIsoDate(input.fromDate).iso
    const toDate = parseIsoDate(input.toDate).iso
    const fromTime = normalizeTime(input.fromTime)
    const toTime = normalizeTime(input.toTime)
    const validFrom = combineDateTime(fromDate, fromTime)
    const validUntil = combineDateTime(toDate, toTime)

    if (validUntil.getTime() <= validFrom.getTime()) {
      throw err('End date/time must be after start date/time', 400)
    }

    const durationMs = validUntil.getTime() - validFrom.getTime()
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

    return {
      fromDate,
      toDate,
      fromTime,
      toTime,
      validFrom,
      validUntil,
      visitDate: fromDate,
      visitTime: fromTime,
      durationHours,
      durationMinutes,
      validityText: buildValidityText(validFrom, validUntil),
    }
  }

  if (input.visitDate && input.visitTime) {
    const fromDate = parseIsoDate(input.visitDate).iso
    const fromTime = normalizeTime(input.visitTime)
    const validFrom = combineDateTime(fromDate, fromTime)
    const validUntil = new Date(validFrom)
    validUntil.setHours(validUntil.getHours() + (input.durationHours ?? 1))
    validUntil.setMinutes(validUntil.getMinutes() + (input.durationMinutes ?? 0))

    if (validUntil.getTime() <= validFrom.getTime()) {
      throw err('Visit duration must be greater than zero', 400)
    }

    const toDate = formatIsoDate(validUntil)
    const toTime = formatTime(validUntil)

    return {
      fromDate,
      toDate,
      fromTime,
      toTime,
      validFrom,
      validUntil,
      visitDate: fromDate,
      visitTime: fromTime,
      durationHours: input.durationHours ?? 1,
      durationMinutes: input.durationMinutes ?? 0,
      validityText: buildValidityText(validFrom, validUntil),
    }
  }

  throw err('Provide either fromDate/toDate/fromTime/toTime or visitDate/visitTime', 400)
}

const formatVisitor = (row) => {
  if (!row) return null

  const id = row._id || row.id
  const fromDate = row.fromDate
    ? formatIsoDate(new Date(row.fromDate))
    : row.visitDate
      ? formatIsoDate(new Date(row.visitDate))
      : null
  const toDate = row.toDate
    ? formatIsoDate(new Date(row.toDate))
    : null
  const fromTime = row.fromTime || row.visitTime || null
  const toTime = row.toTime || null

  let validFrom = row.validFrom ? new Date(row.validFrom) : null
  let validUntil = row.validUntil ? new Date(row.validUntil) : null
  let validityText = row.validityText || null

  if (!validFrom && fromDate && fromTime) {
    try {
      validFrom = combineDateTime(fromDate, fromTime)
    } catch {
      validFrom = null
    }
  }

  if (!validUntil && toDate && toTime) {
    try {
      validUntil = combineDateTime(toDate, toTime)
    } catch {
      validUntil = null
    }
  } else if (!validUntil && validFrom && row.durationHours != null) {
    validUntil = new Date(validFrom)
    validUntil.setHours(validUntil.getHours() + (row.durationHours || 0))
    validUntil.setMinutes(validUntil.getMinutes() + (row.durationMinutes || 0))
  }

  if (!validityText && validFrom && validUntil) {
    validityText = buildValidityText(validFrom, validUntil)
  }

  return {
    id,
    invitedBy: row.invitedBy ?? row.invited_by ?? null,
    visitorName: row.visitorName ?? row.visitor_name,
    visitorPhone: row.visitorPhone ?? row.visitor_phone,
    visitorCarNumber: row.visitorCarNumber ?? row.visitor_car_number ?? '',
    purpose: row.purpose,
    fromDate,
    toDate,
    fromTime,
    toTime,
    validFrom: validFrom ? validFrom.toISOString() : null,
    validUntil: validUntil ? validUntil.toISOString() : null,
    validityText,
    visitDate: fromDate,
    visitTime: fromTime,
    durationHours: row.durationHours ?? row.duration_hours ?? null,
    durationMinutes: row.durationMinutes ?? row.duration_minutes ?? null,
    trackingNumber: row.trackingNumber ?? row.tracking_number,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
  }
}

module.exports = {
  resolveVisitorWindow,
  formatVisitor,
  combineDateTime,
  formatIsoDate,
}
