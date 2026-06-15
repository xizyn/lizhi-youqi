const storage = require('./storage')
const afterSaleService = require('./afterSaleService')

const MAX_CONTENT_LENGTH = 200
const MAX_IMAGE_COUNT = 6

const ROLE_META = {
  user: { label: '用户补充', tone: 'user' },
  admin: { label: '客服处理', tone: 'admin' },
  system: { label: '系统记录', tone: 'system' }
}

const ADMIN_RECORD_TYPES = [
  '处理中说明',
  '补发说明',
  '退款说明',
  '拒绝原因',
  '其他'
]

function createLogId() {
  return 'ASLOG' + Date.now() + Math.floor(Math.random() * 900 + 100)
}

function normalizeLog(log, record) {
  const source = log || {}
  const role = ROLE_META[source.role] ? source.role : 'system'
  const meta = ROLE_META[role]
  return Object.assign({
    id: '',
    afterSaleId: (record || {}).afterSaleId || '',
    orderId: (record || {}).orderId || '',
    role: role,
    type: 'text',
    recordType: '',
    content: '',
    images: [],
    createdAt: '',
    operatorName: meta.label
  }, source, {
    role: role,
    roleLabel: meta.label,
    roleTone: meta.tone,
    images: Array.isArray(source.images) ? source.images.slice(0, MAX_IMAGE_COUNT) : []
  })
}

function getLogs(afterSaleId) {
  const record = storage.getAfterSaleById(afterSaleId)
  if (!record) {
    return []
  }
  return (record.communicationLogs || [])
    .map(function (log) { return normalizeLog(log, record) })
    .sort(function (a, b) {
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
    })
}

function appendLog(afterSaleId, payload, options) {
  const record = storage.getAfterSaleById(afterSaleId)
  if (!record) {
    return { ok: false, message: '售后记录不存在。' }
  }

  const settings = options || {}
  const role = settings.role === 'admin' ? 'admin' : 'user'
  if (role === 'user') {
    const currentUserId = afterSaleService.getUserId(storage.getConfig())
    if (record.userId && record.userId !== currentUserId) {
      return { ok: false, message: '该售后记录不属于当前用户。' }
    }
  }

  const source = payload || {}
  const content = String(source.content || '').trim()
  const images = Array.isArray(source.images) ? source.images.slice(0, MAX_IMAGE_COUNT) : []
  if (!content && !images.length) {
    return { ok: false, message: '请填写补充说明或选择图片。' }
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return { ok: false, message: '补充说明最多200字。' }
  }

  const now = storage.formatTime(new Date())
  const log = normalizeLog({
    id: createLogId(),
    afterSaleId: record.afterSaleId,
    orderId: record.orderId,
    role: role,
    type: images.length ? (content ? 'text_image' : 'image') : 'text',
    recordType: String(source.recordType || '').trim(),
    content: content,
    images: images,
    createdAt: now,
    operatorName: role === 'admin' ? '客服' : '用户'
  }, record)
  // Local repository boundary: replace this write with a cloud/database adapter for cross-device sync.
  const nextRecord = storage.saveAfterSale(Object.assign({}, record, {
    communicationLogs: (record.communicationLogs || []).concat([log]),
    updatedAt: now
  }))
  return { ok: true, log: log, record: nextRecord }
}

function persistImages(paths, afterSaleId) {
  return afterSaleService.persistEvidenceImages(paths, 'log-' + afterSaleId)
}

module.exports = {
  MAX_CONTENT_LENGTH,
  MAX_IMAGE_COUNT,
  ROLE_META,
  ADMIN_RECORD_TYPES,
  getLogs,
  appendLog,
  persistImages
}
