const storage = require('./storage')

const STATUS_META = {
  pending: { label: '待审核', tone: 'pending' },
  processing: { label: '处理中', tone: 'processing' },
  resolved: { label: '已解决', tone: 'resolved' },
  rejected: { label: '已拒绝', tone: 'rejected' },
  cancelled: { label: '用户已撤销', tone: 'cancelled' }
}

const ACTIVE_STATUSES = ['pending', 'processing']
const ELIGIBLE_STATUS_MAP = {
  shipped: true,
  delivered: true,
  picked_up: true,
  completed: true,
  '已发货': true,
  '已送出': true,
  '已送达': true,
  '已自提': true,
  '已完成': true
}

function firstValue(values, fallback) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value !== '' && value !== null && typeof value !== 'undefined') {
      return value
    }
  }
  return fallback || ''
}

function toNumber(value) {
  const number = Number(value)
  return isNaN(number) || number < 0 ? 0 : number
}

function parseDate(value) {
  if (!value) {
    return null
  }
  const date = new Date(String(value).replace(/-/g, '/'))
  return isNaN(date.getTime()) ? null : date
}

function getUserId(config) {
  return storage.getCurrentOpenid(config) || 'local-user'
}

function getOrderUserId(order, config) {
  return String(firstValue([
    order.userId,
    order.openid,
    order._openid
  ], getUserId(config)))
}

function belongsToCurrentUser(order, config) {
  return getOrderUserId(order, config) === getUserId(config)
}

function getOrderById(orderId) {
  const target = String(orderId || '')
  return storage.getOrders().find(function (item) {
    return String(item.id || '') === target || String(item.orderNo || '') === target
  }) || null
}

function getReceivedTime(order) {
  return firstValue([
    order.receivedAt,
    order.deliveredAt,
    order.signedAt,
    order.pickedUpAt,
    order.completedAt
  ], '')
}

function getConfig() {
  const config = storage.getConfig()
  return Object.assign({}, config.afterSale || {}, {
    applicationWindowHours: Number((config.afterSale || {}).applicationWindowHours) || 24,
    evidenceMinCount: Number((config.afterSale || {}).evidenceMinCount) || 1,
    evidenceMaxCount: Number((config.afterSale || {}).evidenceMaxCount) || 6,
    descriptionMaxLength: Number((config.afterSale || {}).descriptionMaxLength) || 300
  })
}

function getActiveAfterSale(orderId) {
  return storage.getAfterSales().find(function (item) {
    return String(item.orderId) === String(orderId) && ACTIVE_STATUSES.indexOf(item.status) >= 0
  }) || null
}

function getLatestAfterSale(orderId) {
  return storage.getAfterSales().find(function (item) {
    return String(item.orderId) === String(orderId)
  }) || null
}

function isEligibleOrderStatus(status) {
  return ELIGIBLE_STATUS_MAP[String(status || '').trim()] === true
}

function checkDeadline(order, now) {
  const config = getConfig()
  const receivedTime = getReceivedTime(order)
  const receivedDate = parseDate(receivedTime)
  if (!receivedDate) {
    return {
      ok: false,
      code: 'missing_received_time',
      message: '订单暂未记录签收或自提时间，请先联系客服处理。',
      receivedTime: ''
    }
  }
  const current = now instanceof Date ? now : new Date()
  const deadline = new Date(receivedDate.getTime() + config.applicationWindowHours * 60 * 60 * 1000)
  if (current.getTime() > deadline.getTime()) {
    return {
      ok: false,
      code: 'expired',
      message: '已超过售后申请时限，请联系客服说明具体情况。',
      receivedTime: receivedTime,
      deadline: storage.formatTime(deadline)
    }
  }
  return {
    ok: true,
    receivedTime: receivedTime,
    deadline: storage.formatTime(deadline)
  }
}

function validateApplication(orderId, payload, options) {
  const settings = options || {}
  const order = getOrderById(orderId)
  const config = storage.getConfig()
  const afterSaleConfig = getConfig()
  if (!order) {
    return { ok: false, code: 'order_not_found', message: '订单不存在或已被删除。' }
  }
  if (!settings.admin && !belongsToCurrentUser(order, config)) {
    return { ok: false, code: 'not_owner', message: '该订单不属于当前用户。' }
  }
  if (!settings.admin && !isEligibleOrderStatus(order.orderStatus)) {
    return { ok: false, code: 'status_not_allowed', message: '当前订单状态不能申请商品售后。' }
  }
  const active = getActiveAfterSale(order.id)
  if (active) {
    return {
      ok: false,
      code: 'duplicate',
      message: '该订单已有进行中的售后申请。',
      afterSale: active
    }
  }
  if (!settings.admin) {
    const deadlineResult = checkDeadline(order, settings.now)
    if (!deadlineResult.ok) {
      return deadlineResult
    }
  }
  const source = payload || {}
  const description = String(source.description || '').trim()
  const images = Array.isArray(source.evidenceImages) ? source.evidenceImages : []
  if (!settings.admin && !description) {
    return { ok: false, code: 'description_required', message: '请填写问题描述。' }
  }
  if (description.length > afterSaleConfig.descriptionMaxLength) {
    return { ok: false, code: 'description_too_long', message: '问题描述超过长度限制。' }
  }
  if (!settings.admin && images.length < afterSaleConfig.evidenceMinCount) {
    return { ok: false, code: 'evidence_required', message: '请至少上传1张问题凭证。' }
  }
  if (images.length > afterSaleConfig.evidenceMaxCount) {
    return { ok: false, code: 'evidence_too_many', message: '凭证图片最多上传6张。' }
  }
  return { ok: true, order: order }
}

function createId() {
  return 'AS' + Date.now() + Math.floor(Math.random() * 900 + 100)
}

function getOrderSnapshot(order) {
  const guiweiWeight = toNumber(order.guiweiWeight)
  const nuomiciWeight = toNumber(order.nuomiciWeight)
  const totalWeight = toNumber(order.totalWeight) || Math.round((guiweiWeight + nuomiciWeight) * 10) / 10
  return {
    orderNo: order.orderNo || order.id || '',
    productName: firstValue([order.skuName, order.productName, order.productTitle, order.variety], '荔枝'),
    specText: firstValue([order.spec, order.fruitWeightText, order.specText], order.customWeightOrder ? '自定义斤数' : '待确认'),
    guiweiWeight: guiweiWeight,
    nuomiciWeight: nuomiciWeight,
    totalWeight: totalWeight,
    quantity: Number(order.quantity || order.count) || 1,
    deliveryMethod: firstValue([order.deliveryMethod, order.deliveryType], '客服确认'),
    receivedAt: getReceivedTime(order),
    customerName: firstValue([order.recipientName, order.buyerName, order.pickupName, order.name, order.wechatId], '未填写'),
    customerPhone: firstValue([order.recipientPhone, order.buyerPhone, order.phone], '未填写')
  }
}

function syncOrderMarker(record) {
  storage.updateOrder(record.orderId, {
    hasAfterSale: true,
    afterSaleStatus: record.status,
    afterSaleId: record.afterSaleId
  })
}

function createAfterSale(orderId, payload, options) {
  const settings = options || {}
  const validation = validateApplication(orderId, payload, settings)
  if (!validation.ok) {
    return validation
  }
  const order = validation.order
  const now = storage.formatTime(new Date())
  const snapshot = getOrderSnapshot(order)
  const record = Object.assign({
    afterSaleId: createId(),
    orderId: order.id,
    orderNo: snapshot.orderNo,
    userId: getOrderUserId(order, storage.getConfig()),
    status: settings.admin ? 'processing' : 'pending',
    submittedAt: now,
    reviewedAt: settings.admin ? now : '',
    updatedAt: now,
    createdByAdmin: settings.admin === true,
    withinDeadline: settings.admin ? null : true,
    resultType: '',
    approvedAmount: '',
    replacementInfo: '',
    adminReply: '',
    rejectReason: '',
    offlineRefundStatus: '',
    inventoryCheckStatus: '',
    inventoryAdjusted: false,
    communicationLogs: []
  }, snapshot, payload || {}, {
    evidenceImages: Array.isArray((payload || {}).evidenceImages) ? payload.evidenceImages.slice() : []
  })
  storage.saveAfterSale(record)
  syncOrderMarker(record)
  return { ok: true, record: record }
}

function updateAfterSale(afterSaleId, patch) {
  const record = storage.getAfterSaleById(afterSaleId)
  if (!record) {
    return { ok: false, message: '售后记录不存在。' }
  }
  const nextRecord = Object.assign({}, record, patch || {}, {
    updatedAt: storage.formatTime(new Date())
  })
  storage.saveAfterSale(nextRecord)
  syncOrderMarker(nextRecord)
  return { ok: true, record: nextRecord }
}

function processAfterSale(afterSaleId, payload) {
  const source = payload || {}
  const action = source.action
  const record = storage.getAfterSaleById(afterSaleId)
  if (!record) {
    return { ok: false, message: '售后记录不存在。' }
  }
  if (!String(source.adminReply || '').trim() && action !== 'reject') {
    return { ok: false, message: '请填写处理说明。' }
  }
  if (action === 'reject' && !String(source.rejectReason || '').trim()) {
    return { ok: false, message: '请填写拒绝原因。' }
  }
  const now = storage.formatTime(new Date())
  const patch = {
    reviewedAt: record.reviewedAt || now,
    adminReply: String(source.adminReply || '').trim(),
    rejectReason: String(source.rejectReason || '').trim(),
    approvedAmount: source.approvedAmount === '' ? '' : toNumber(source.approvedAmount),
    replacementInfo: String(source.replacementInfo || '').trim()
  }
  if (action === 'processing') {
    patch.status = 'processing'
    patch.resultType = '处理中'
  } else if (action === 'reject') {
    patch.status = 'rejected'
    patch.resultType = '拒绝申请'
    patch.resolvedAt = now
  } else if (action === '线下处理完成') {
    patch.status = 'resolved'
    patch.resultType = record.resultType || '其他协商方案'
    patch.resolvedAt = now
    if (record.offlineRefundStatus) {
      patch.offlineRefundStatus = '线下处理已确认'
    }
  } else {
    patch.status = 'processing'
    patch.resultType = action
    if (action === '部分退款' || action === '全额退款') {
      patch.offlineRefundStatus = '待线下处理'
    }
    if (action === '补发') {
      const availability = checkReplacementAvailability(record)
      if (!availability.ok) {
        return availability
      }
      patch.inventoryCheckStatus = availability.message
      patch.inventoryAdjusted = false
    }
  }
  return updateAfterSale(afterSaleId, patch)
}

function checkReplacementAvailability(record) {
  const order = getOrderById(record.orderId)
  const config = storage.getConfig()
  if (!order) {
    return { ok: false, message: '关联订单不存在，无法校验补发库存。' }
  }
  if (config.salesStatus === 'sold_out') {
    return { ok: false, message: '当前销售状态为已售罄，不能确认补发。' }
  }
  const skuId = order.skuId || order.productId || ''
  const skuStatus = (config.skuStatusMap || {})[skuId]
  if (skuStatus && (skuStatus.isListed === false || skuStatus.isSoldOut === true)) {
    return { ok: false, message: '关联商品已下架或售罄，请先核实库存。' }
  }
  return {
    ok: true,
    message: skuId
      ? '已校验商品可售状态，补发数量仍需人工登记库存扣减'
      : '自定义斤数订单无数量库存台账，补发重量需人工核实并登记'
  }
}

function cancelAfterSale(afterSaleId) {
  const record = storage.getAfterSaleById(afterSaleId)
  if (!record || record.status !== 'pending') {
    return { ok: false, message: '当前售后状态不能撤销。' }
  }
  return updateAfterSale(afterSaleId, {
    status: 'cancelled',
    cancelledAt: storage.formatTime(new Date())
  })
}

function getUserAfterSales() {
  const config = storage.getConfig()
  const userId = getUserId(config)
  return storage.getAfterSales().filter(function (item) {
    return item.userId === userId
  })
}

function getStatusMeta(status) {
  return STATUS_META[status] || { label: '状态待确认', tone: 'default' }
}

function buildTimeline(record) {
  const status = record.status
  return [
    { label: '申请已提交', time: record.submittedAt || '', done: true },
    { label: '管理员审核', time: record.reviewedAt || '', done: ['processing', 'resolved', 'rejected'].indexOf(status) >= 0 },
    { label: status === 'rejected' ? '申请已拒绝' : '处理中', time: status === 'processing' ? record.updatedAt : '', done: ['processing', 'resolved', 'rejected'].indexOf(status) >= 0 },
    { label: status === 'rejected' ? '处理结束' : '已解决', time: record.resolvedAt || '', done: ['resolved', 'rejected'].indexOf(status) >= 0 }
  ]
}

function persistEvidenceImages(paths, afterSaleId) {
  const list = Array.isArray(paths) ? paths : []
  if (!list.length || !wx.getFileSystemManager || !wx.env || !wx.env.USER_DATA_PATH) {
    return Promise.resolve(list.slice())
  }
  const fs = wx.getFileSystemManager()
  const prefix = afterSaleId || createId()
  return Promise.all(list.map(function (srcPath, index) {
    if (String(srcPath).indexOf(wx.env.USER_DATA_PATH) === 0) {
      return Promise.resolve(srcPath)
    }
    const matched = String(srcPath).match(/(\.[a-zA-Z0-9]+)(?:\?|$)/)
    const extension = matched ? matched[1] : '.jpg'
    const destPath = wx.env.USER_DATA_PATH + '/' + prefix + '-' + index + '-' + Date.now() + extension
    return new Promise(function (resolve, reject) {
      fs.copyFile({
        srcPath: srcPath,
        destPath: destPath,
        success: function () { resolve(destPath) },
        fail: reject
      })
    })
  }))
}

module.exports = {
  STATUS_META,
  ACTIVE_STATUSES,
  getConfig,
  getUserId,
  getOrderById,
  getOrderSnapshot,
  getReceivedTime,
  getActiveAfterSale,
  getLatestAfterSale,
  getUserAfterSales,
  getStatusMeta,
  buildTimeline,
  isEligibleOrderStatus,
  belongsToCurrentUser,
  checkDeadline,
  validateApplication,
  createAfterSale,
  updateAfterSale,
  processAfterSale,
  checkReplacementAvailability,
  cancelAfterSale,
  persistEvidenceImages
}
