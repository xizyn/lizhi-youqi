const mockData = require('./mockData')

const KEYS = {
  config: 'lizhi_youqi_config_v3',
  orders: 'lizhi_youqi_orders_v3',
  adminCoupons: 'lizhi_youqi_admin_coupons_v1',
  userCoupons: 'lizhi_youqi_user_coupons_v1',
  pointRecords: 'lizhi_youqi_point_records_v1',
  orderDraft: 'lizhi_youqi_order_draft_v1',
  saleReminders: 'lizhi_youqi_sale_reminders_v1',
  afterSales: 'lizhi_youqi_after_sales_v1',
  addresses: 'lizhi_youqi_addresses_v1',
  orderFilter: 'lizhi_youqi_order_filter_v1',
  adminSession: 'lizhi_youqi_admin_authed',
  legacyConfig: 'lizhi_youqi_config_v2'
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function safeGet(key, fallback) {
  try {
    const value = wx.getStorageSync(key)
    if (value === '' || value === null || typeof value === 'undefined') {
      return clone(fallback)
    }
    return value
  } catch (error) {
    return clone(fallback)
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (error) {
    return false
  }
}

function safeRemove(key) {
  try {
    wx.removeStorageSync(key)
    return true
  } catch (error) {
    return false
  }
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function mergeConfig(config) {
  const source = config || {}
  const prices = Object.assign({}, clone(mockData.defaultPrices), source.prices || {})
  const pickupTimeSlots = Array.isArray(source.pickupTimeSlots) && source.pickupTimeSlots.length ? source.pickupTimeSlots : clone(mockData.defaultConfig.pickupTimeSlots)
  const skuStatusMap = Object.assign({}, clone(mockData.defaultSkuStatusMap || {}), source.skuStatusMap || {})
  const defaultExpressDelivery = clone(mockData.defaultExpressDeliveryConfig || {})
  const sourceExpressDelivery = source.expressDelivery || {}
  const expressDelivery = Object.assign({}, defaultExpressDelivery, sourceExpressDelivery, {
    shippingFeeRanges: Object.assign({}, defaultExpressDelivery.shippingFeeRanges || {}, sourceExpressDelivery.shippingFeeRanges || {}),
    remoteShippingFeeRanges: Object.assign({}, defaultExpressDelivery.remoteShippingFeeRanges || {}, sourceExpressDelivery.remoteShippingFeeRanges || {}),
    remoteRegions: Array.isArray(sourceExpressDelivery.remoteRegions)
      ? sourceExpressDelivery.remoteRegions.slice()
      : (defaultExpressDelivery.remoteRegions || [])
  })
  const defaultNearbyDelivery = clone(mockData.defaultNearbyDeliveryConfig || {})
  const sourceNearbyDelivery = source.nearbyDelivery || {}
  const nearbyDelivery = Object.assign({}, defaultNearbyDelivery, sourceNearbyDelivery, {
    supportedAreas: Array.isArray(sourceNearbyDelivery.supportedAreas)
      ? sourceNearbyDelivery.supportedAreas.slice()
      : (defaultNearbyDelivery.supportedAreas || []),
    areaOptions: Array.isArray(sourceNearbyDelivery.areaOptions)
      ? sourceNearbyDelivery.areaOptions.slice()
      : (defaultNearbyDelivery.areaOptions || []),
    areaLabels: Object.assign({}, defaultNearbyDelivery.areaLabels || {}, sourceNearbyDelivery.areaLabels || {})
  })
  const defaultOrchardLocation = clone(mockData.orchardLocation || mockData.defaultConfig.orchardLocation || {})
  const sourceOrchardLocation = source.orchardLocation || {}
  const orchardLocation = Object.assign({}, defaultOrchardLocation, sourceOrchardLocation, {
    maps: Array.isArray(sourceOrchardLocation.maps) && sourceOrchardLocation.maps.length
      ? sourceOrchardLocation.maps.map(function (item, index) {
        const fallback = (defaultOrchardLocation.maps || [])[index] || {}
        return Object.assign({}, fallback, item, {
          markers: Array.isArray(item.markers)
            ? item.markers.slice()
            : (fallback.markers || []).slice()
        })
      })
      : clone(defaultOrchardLocation.maps || [])
  })
  const defaultSaleReminder = clone(mockData.defaultSaleReminderConfig || {})
  const sourceSaleReminder = source.saleReminder || {}
  const saleReminder = Object.assign({}, defaultSaleReminder, sourceSaleReminder, {
    varieties: Array.isArray(sourceSaleReminder.varieties)
      ? sourceSaleReminder.varieties.slice()
      : (defaultSaleReminder.varieties || []).slice(),
    orchardUpdates: Array.isArray(sourceSaleReminder.orchardUpdates)
      ? sourceSaleReminder.orchardUpdates.slice()
      : (defaultSaleReminder.orchardUpdates || []).slice()
  })
  const defaultAfterSale = clone(mockData.defaultAfterSaleConfig || {})
  const sourceAfterSale = source.afterSale || {}
  const afterSale = Object.assign({}, defaultAfterSale, sourceAfterSale, {
    types: Array.isArray(sourceAfterSale.types)
      ? sourceAfterSale.types.slice()
      : (defaultAfterSale.types || []).slice(),
    requestMethods: Array.isArray(sourceAfterSale.requestMethods)
      ? sourceAfterSale.requestMethods.slice()
      : (defaultAfterSale.requestMethods || []).slice()
  })
  if (source.giftBoxRuleVersion !== '2026-06-04' && Number(prices.giftBox10) === 6) {
    prices.giftBox10 = 5
  }
  return Object.assign({}, clone(mockData.defaultConfig), source, {
    giftBoxRuleVersion: source.giftBoxRuleVersion || '2026-06-04',
    prices: prices,
    shippingFees: Object.assign({}, clone(mockData.defaultShippingFees), source.shippingFees || {}),
    expressDelivery: expressDelivery,
    nearbyDelivery: nearbyDelivery,
    orchardLocation: orchardLocation,
    saleReminder: saleReminder,
    afterSale: afterSale,
    pickupTimeSlots: pickupTimeSlots,
    skuStatusMap: skuStatusMap
  })
}

function formatTime(date) {
  const pad = function (value) {
    return value < 10 ? '0' + value : '' + value
  }
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join(':')
}

function formatDate(date) {
  const pad = function (value) {
    return value < 10 ? '0' + value : '' + value
  }
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-')
}

function addMonths(date, count) {
  const nextDate = new Date(date.getTime())
  nextDate.setMonth(nextDate.getMonth() + count)
  return nextDate
}

function toMoney(value) {
  const number = Number(value)
  if (isNaN(number) || number < 0) {
    return 0
  }
  return Math.round(number * 100) / 100
}

function formatOrderNo(date) {
  const pad = function (value) {
    return value < 10 ? '0' + value : '' + value
  }
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('')
  return 'LY' + stamp + Math.floor(Math.random() * 900 + 100)
}

function initMockData() {
  const config = safeGet(KEYS.config, null)
  if (!config) {
    const legacyConfig = safeGet(KEYS.legacyConfig, null)
    safeSet(KEYS.config, mergeConfig(legacyConfig || mockData.defaultConfig))
  }

  const orders = safeGet(KEYS.orders, null)
  if (!Array.isArray(orders)) {
    safeSet(KEYS.orders, [])
  }

  const adminCoupons = safeGet(KEYS.adminCoupons, null)
  if (!Array.isArray(adminCoupons)) {
    safeSet(KEYS.adminCoupons, clone(mockData.adminCoupons))
  }

  const userCoupons = safeGet(KEYS.userCoupons, null)
  if (!Array.isArray(userCoupons)) {
    safeSet(KEYS.userCoupons, clone(mockData.userCoupons))
  }

  const pointRecords = safeGet(KEYS.pointRecords, null)
  if (!Array.isArray(pointRecords)) {
    safeSet(KEYS.pointRecords, clone(mockData.pointRecords))
  }

  const saleReminders = safeGet(KEYS.saleReminders, null)
  if (!Array.isArray(saleReminders)) {
    safeSet(KEYS.saleReminders, [])
  }

  const afterSales = safeGet(KEYS.afterSales, null)
  if (!Array.isArray(afterSales)) {
    safeSet(KEYS.afterSales, [])
  }

  const addresses = safeGet(KEYS.addresses, null)
  if (!Array.isArray(addresses)) {
    safeSet(KEYS.addresses, [])
  }
}

function getConfig() {
  return mergeConfig(safeGet(KEYS.config, mockData.defaultConfig))
}

function saveConfig(config) {
  const nextConfig = mergeConfig(config)
  safeSet(KEYS.config, nextConfig)
  return nextConfig
}

function normalizeOpenidList(list) {
  if (typeof list === 'string') {
    return list.split(/[\n,，]/).map(function (item) {
      return item.trim()
    }).filter(function (item) {
      return !!item
    })
  }
  if (!Array.isArray(list)) {
    return []
  }
  return list.map(function (item) {
    return String(item || '').trim()
  }).filter(function (item) {
    return !!item
  })
}

function getCurrentMockOpenid(config) {
  const source = mergeConfig(config || getConfig())
  return String(source.mockOpenid || '').trim()
}

function getCurrentOpenid(config) {
  try {
    const app = getApp()
    const runtimeOpenid = app && app.globalData ? app.globalData.openid : ''
    if (runtimeOpenid) {
      return String(runtimeOpenid).trim()
    }
  } catch (error) {
    // Unit tests and early app startup may not expose getApp yet.
  }
  return getCurrentMockOpenid(config)
}

function getAdminAuthMode(config) {
  const source = mergeConfig(config || getConfig())
  return source.adminAuthMode === 'openid' ? 'openid' : 'mock'
}

function isOpenidInAdminWhitelist(config, openid) {
  const source = mergeConfig(config || getConfig())
  const currentOpenid = String(openid || getCurrentOpenid(source)).trim()
  const whitelist = normalizeOpenidList(source.adminOpenidWhitelist)
  return !!currentOpenid && whitelist.indexOf(currentOpenid) >= 0
}

function isAdminMockEnabled(config) {
  const source = mergeConfig(config || getConfig())
  return source.isAdminMock === true || source.isAdminMock === 'true'
}

function isAdminUser(config, openid) {
  const source = mergeConfig(config || getConfig())
  if (isAdminMockEnabled(source)) {
    return true
  }
  return getAdminAuthMode(source) === 'openid' && isOpenidInAdminWhitelist(source, openid)
}

function requiresAdminPassword(config) {
  return isAdminMockEnabled(config)
}

function grantAdminSession(config) {
  const source = mergeConfig(config || getConfig())
  safeSet(KEYS.adminSession, {
    role: 'superAdmin',
    authMode: getAdminAuthMode(source),
    authorizedAt: formatTime(new Date())
  })
  return true
}

function clearAdminSession() {
  try {
    wx.removeStorageSync(KEYS.adminSession)
  } catch (error) {
    safeSet(KEYS.adminSession, false)
  }
}

function authorizeAdminWithPassword(config, password) {
  const source = mergeConfig(config || getConfig())
  if (!isAdminUser(source) || !requiresAdminPassword(source)) {
    return false
  }
  if (String(password || '') !== String(source.adminPassword || '')) {
    return false
  }
  return grantAdminSession(source)
}

function hasAdminAccess(config, openid) {
  const source = mergeConfig(config || getConfig())
  if (!isAdminUser(source, openid)) {
    return false
  }
  if (!requiresAdminPassword(source)) {
    return true
  }
  const session = safeGet(KEYS.adminSession, false)
  return session === true || !!(session && session.role === 'superAdmin')
}

function getUserRole(config, openid) {
  return isAdminUser(config, openid) ? 'superAdmin' : 'user'
}

function getSalesStatus() {
  const config = getConfig()
  return mockData.salesStatuses.find(function (item) {
    return item.value === config.salesStatus
  }) || mockData.salesStatuses[0]
}

function shouldBlockNewOrders(statusValue) {
  return statusValue === 'paused' || statusValue === 'sold_out'
}

function getDashboard() {
  return {
    config: getConfig(),
    salesStatus: getSalesStatus(),
    orders: getOrders()
  }
}

function getOrders() {
  const orders = safeGet(KEYS.orders, [])
  if (!Array.isArray(orders)) {
    safeSet(KEYS.orders, [])
    return []
  }
  return orders.filter(function (item) {
    return isPlainObject(item)
  })
}

function normalizeAfterSaleRecord(record) {
  const source = record || {}
  const communicationLogs = Array.isArray(source.communicationLogs)
    ? source.communicationLogs.filter(isPlainObject).map(function (log) {
      return Object.assign({
        id: '',
        afterSaleId: source.afterSaleId || '',
        orderId: source.orderId || '',
        role: 'system',
        type: 'text',
        recordType: '',
        content: '',
        images: [],
        createdAt: '',
        operatorName: '系统'
      }, log || {}, {
        images: Array.isArray((log || {}).images) ? log.images.slice(0, 6) : []
      })
    })
    : []
  return Object.assign({
    afterSaleId: '',
    orderId: '',
    orderNo: '',
    userId: '',
    type: '',
    requestMethod: '',
    description: '',
    evidenceImages: [],
    status: 'pending',
    submittedAt: '',
    reviewedAt: '',
    resolvedAt: '',
    resultType: '',
    approvedAmount: '',
    replacementInfo: '',
    adminReply: '',
    rejectReason: '',
    cancelledAt: '',
    createdByAdmin: false,
    withinDeadline: null,
    offlineRefundStatus: '',
    inventoryCheckStatus: '',
    inventoryAdjusted: false,
    communicationLogs: [],
    updatedAt: ''
  }, source, {
    evidenceImages: Array.isArray(source.evidenceImages) ? source.evidenceImages.slice() : [],
    communicationLogs: communicationLogs
  })
}

function getAfterSales() {
  const records = safeGet(KEYS.afterSales, [])
  if (!Array.isArray(records)) {
    safeSet(KEYS.afterSales, [])
    return []
  }
  return records.filter(isPlainObject).map(normalizeAfterSaleRecord)
}

function saveAfterSales(records) {
  const nextRecords = Array.isArray(records) ? records.map(normalizeAfterSaleRecord) : []
  safeSet(KEYS.afterSales, nextRecords)
  return nextRecords
}

function getAfterSaleById(afterSaleId) {
  return getAfterSales().find(function (item) {
    return item.afterSaleId === afterSaleId
  }) || null
}

function saveAfterSale(record) {
  const records = getAfterSales()
  const normalized = normalizeAfterSaleRecord(record)
  const index = records.findIndex(function (item) {
    return item.afterSaleId === normalized.afterSaleId
  })
  if (index >= 0) {
    records.splice(index, 1, normalized)
  } else {
    records.unshift(normalized)
  }
  saveAfterSales(records)
  return normalized
}

function saveOrderDraft(payload) {
  const draft = isPlainObject(payload) ? Object.assign({}, payload) : {}
  safeSet(KEYS.orderDraft, draft)
  return draft
}

function getOrderDraft() {
  const draft = safeGet(KEYS.orderDraft, {})
  return isPlainObject(draft) ? draft : {}
}

function clearOrderDraft() {
  return safeRemove(KEYS.orderDraft)
}

function normalizePointRecord(record) {
  const source = record || {}
  const points = Number(source.points || source.value) || 0
  return Object.assign({
    id: '',
    title: '',
    time: '',
    points: points,
    value: points > 0 ? '+' + points : String(points),
    reason: '',
    type: 'manual',
    orderId: '',
    orderNo: '',
    expiresAt: ''
  }, source, {
    points: points,
    value: source.value || (points > 0 ? '+' + points : String(points))
  })
}

function getPointRecords() {
  const records = safeGet(KEYS.pointRecords, mockData.pointRecords)
  if (!Array.isArray(records)) {
    safeSet(KEYS.pointRecords, clone(mockData.pointRecords))
    return clone(mockData.pointRecords).map(normalizePointRecord)
  }
  return records.filter(function (item) {
    return isPlainObject(item)
  }).map(normalizePointRecord)
}

function savePointRecords(records) {
  const nextRecords = Array.isArray(records) ? records.map(normalizePointRecord) : []
  safeSet(KEYS.pointRecords, nextRecords)
  return nextRecords
}

function isPointExpired(record) {
  if (!record.expiresAt || record.points < 0) {
    return false
  }
  return record.expiresAt < formatDate(new Date())
}

function getPointSummary() {
  const records = getPointRecords()
  const availablePoints = records.reduce(function (total, record) {
    if (record.points > 0 && isPointExpired(record)) {
      return total
    }
    return total + record.points
  }, 0)
  const earnedPoints = records.reduce(function (total, record) {
    return total + (record.points > 0 ? record.points : 0)
  }, 0)
  const usedPoints = records.reduce(function (total, record) {
    return total + (record.points < 0 ? Math.abs(record.points) : 0)
  }, 0)

  return {
    availablePoints: Math.max(0, availablePoints),
    earnedPoints: earnedPoints,
    usedPoints: usedPoints,
    rules: mockData.pointRules,
    records: records.map(function (record) {
      return Object.assign({}, record, {
        expired: isPointExpired(record),
        valueText: record.points > 0 ? '+' + record.points : String(record.points),
        expireText: record.expiresAt ? '有效期至 ' + record.expiresAt : '无固定有效期'
      })
    })
  }
}

function buildPointRecord(payload) {
  const now = new Date()
  const points = Number(payload.points) || 0
  const expiresAt = points > 0 ? formatDate(addMonths(now, 12)) : ''
  return normalizePointRecord(Object.assign({
    id: 'PT' + Date.now() + Math.floor(Math.random() * 900 + 100),
    title: points > 0 ? '积分增加' : '积分扣减',
    time: formatTime(now),
    points: points,
    reason: '',
    type: 'manual_adjust',
    expiresAt: expiresAt
  }, payload || {}, {
    points: points,
    value: points > 0 ? '+' + points : String(points),
    expiresAt: payload && typeof payload.expiresAt !== 'undefined' ? payload.expiresAt : expiresAt
  }))
}

function addPointRecord(payload) {
  const records = getPointRecords()
  const record = buildPointRecord(payload)
  records.unshift(record)
  savePointRecords(records)
  return record
}

function redeemOrderPoints(points, order) {
  const pointValue = Math.max(0, Math.floor(Number(points) || 0))
  if (!pointValue) {
    return { ok: true, record: null }
  }

  const summary = getPointSummary()
  if (summary.availablePoints < pointValue) {
    return { ok: false, message: '可用积分不足' }
  }

  const source = order || {}
  const record = addPointRecord({
    title: '订单积分抵扣',
    points: -pointValue,
    reason: '订单号：' + (source.orderNo || source.id || '未生成'),
    type: 'order_redeem',
    orderId: source.id || '',
    orderNo: source.orderNo || ''
  })
  return { ok: true, record: record }
}

function adjustPoints(points, reason) {
  const pointValue = Number(points) || 0
  if (!pointValue) {
    return { ok: false, message: '请输入积分数量' }
  }
  const record = addPointRecord({
    title: pointValue > 0 ? '后台手动增加积分' : '后台手动扣减积分',
    points: pointValue,
    reason: reason || '后台手动调整',
    type: pointValue > 0 ? 'manual_add' : 'manual_subtract'
  })
  return { ok: true, record: record }
}

function getOrderProductAmount(order) {
  const productAmount = toMoney(order.productAmount)
  if (productAmount > 0) {
    return productAmount
  }
  const totalAmount = toMoney(order.totalAmount || order.payAmount || order.amount || order.price)
  const giftBoxFee = toMoney(order.giftBoxFee)
  const shippingFee = toMoney(order.shippingFee || order.freightAmount || order.estimatedShippingFee || order.actualShippingFee)
  return Math.max(0, totalAmount - giftBoxFee - shippingFee)
}

function calculateOrderPoints(order) {
  return Math.floor(getOrderProductAmount(order))
}

function shouldDeductOrderPoints(order) {
  return order.orderStatus === '已取消' || toMoney(order.refundAmount) > 0
}

function buildOrderPointRecord(order, points, title, type) {
  return buildPointRecord({
    title: title,
    points: points,
    reason: '订单号：' + (order.orderNo || order.id || '未生成') + '，仅按荔枝商品金额计算积分',
    type: type,
    orderId: order.id || '',
    orderNo: order.orderNo || ''
  })
}

function awardReminderPoints() {
  const records = getPointRecords()
  const existed = records.some(function (item) {
    return item.type === 'subscribe_reminder'
  })
  if (existed) {
    return { ok: true, awarded: false, message: '已领取过开售提醒积分' }
  }
  const record = addPointRecord({
    title: '首次订阅开售提醒',
    points: 20,
    reason: '首次订阅2027年开售提醒',
    type: 'subscribe_reminder'
  })
  return { ok: true, awarded: true, record: record }
}

function getSaleReminderUserId(config) {
  return getCurrentOpenid(config) || 'local-user'
}

function normalizeSaleReminderRecord(record) {
  const source = record || {}
  return Object.assign({
    id: '',
    userId: '',
    reservationYear: 2027,
    varieties: [],
    reservedAt: '',
    notificationAuth: 'not_requested',
    notificationMessage: '',
    status: 'active',
    updatedAt: ''
  }, source, {
    varieties: Array.isArray(source.varieties) ? source.varieties.slice() : []
  })
}

function getSaleReminderRecords() {
  const records = safeGet(KEYS.saleReminders, [])
  if (!Array.isArray(records)) {
    safeSet(KEYS.saleReminders, [])
    return []
  }
  return records.filter(isPlainObject).map(normalizeSaleReminderRecord)
}

function getSaleReminderRecord(year, config) {
  const userId = getSaleReminderUserId(config)
  const targetYear = Number(year) || Number(getConfig().saleReminder.reservationYear) || 2027
  return getSaleReminderRecords().find(function (item) {
    return item.userId === userId && Number(item.reservationYear) === targetYear
  }) || null
}

function upsertSaleReminder(payload, config) {
  const records = getSaleReminderRecords()
  const now = formatTime(new Date())
  const source = payload || {}
  const userId = getSaleReminderUserId(config)
  const reservationYear = Number(source.reservationYear) || Number(getConfig().saleReminder.reservationYear) || 2027
  const index = records.findIndex(function (item) {
    return item.userId === userId && Number(item.reservationYear) === reservationYear
  })
  const previous = index >= 0 ? records[index] : {}
  const record = normalizeSaleReminderRecord(Object.assign({}, previous, source, {
    id: previous.id || ('SR' + Date.now()),
    userId: userId,
    reservationYear: reservationYear,
    reservedAt: previous.reservedAt || now,
    status: source.status || 'active',
    updatedAt: now
  }))

  if (index >= 0) {
    records.splice(index, 1, record)
  } else {
    records.unshift(record)
  }
  safeSet(KEYS.saleReminders, records)
  return record
}

function cancelSaleReminder(year, config) {
  const record = getSaleReminderRecord(year, config)
  if (!record) {
    return null
  }
  return upsertSaleReminder(Object.assign({}, record, {
    status: 'cancelled'
  }), config)
}

function getAddressList() {
  const addresses = safeGet(KEYS.addresses, [])
  if (!Array.isArray(addresses)) {
    safeSet(KEYS.addresses, [])
    return []
  }
  return addresses.filter(isPlainObject).map(function (item) {
    return Object.assign({
      id: '',
      name: '',
      phone: '',
      region: [],
      regionText: '',
      detailAddress: '',
      isDefault: false,
      updatedAt: ''
    }, item, {
      region: Array.isArray(item.region) ? item.region.slice() : []
    })
  })
}

function saveAddress(payload) {
  const addresses = getAddressList()
  const source = payload || {}
  const id = source.id || ('ADDR' + Date.now() + Math.floor(Math.random() * 100000))
  const now = formatTime(new Date())
  const index = addresses.findIndex(function (item) {
    return item.id === id
  })
  const record = Object.assign({}, index >= 0 ? addresses[index] : {}, source, {
    id: id,
    updatedAt: now
  })

  if (record.isDefault || addresses.length === 0) {
    addresses.forEach(function (item) {
      item.isDefault = false
    })
    record.isDefault = true
  }
  if (index >= 0) {
    addresses.splice(index, 1, record)
  } else {
    addresses.unshift(record)
  }
  safeSet(KEYS.addresses, addresses)
  return record
}

function deleteAddress(id) {
  const addresses = getAddressList()
  const wasDefault = addresses.some(function (item) {
    return item.id === id && item.isDefault
  })
  const nextAddresses = addresses.filter(function (item) {
    return item.id !== id
  })
  if (wasDefault && nextAddresses.length) {
    nextAddresses[0].isDefault = true
  }
  safeSet(KEYS.addresses, nextAddresses)
  return nextAddresses
}

function setDefaultAddress(id) {
  const addresses = getAddressList().map(function (item) {
    return Object.assign({}, item, {
      isDefault: item.id === id
    })
  })
  safeSet(KEYS.addresses, addresses)
  return addresses
}

function getDefaultAddress() {
  const addresses = getAddressList()
  return addresses.find(function (item) {
    return item.isDefault
  }) || addresses[0] || null
}

function setOrderFilter(filter) {
  safeSet(KEYS.orderFilter, filter || 'all')
}

function consumeOrderFilter() {
  const filter = safeGet(KEYS.orderFilter, '')
  safeRemove(KEYS.orderFilter)
  return filter
}

function saveOrder(payload) {
  const config = getConfig()
  const status = getSalesStatus()

  if (shouldBlockNewOrders(config.salesStatus)) {
    return {
      ok: false,
      message: status.label + '，当前不能提交新订单'
    }
  }

  const orders = getOrders()
  const now = new Date()
  const record = Object.assign({}, payload, {
    id: Date.now() + '-' + Math.floor(Math.random() * 100000),
    orderNo: formatOrderNo(now),
    createdAt: formatTime(now),
    userId: payload.userId || payload.openid || getCurrentOpenid(config) || 'local-user',
    orderStatus: payload.orderStatus || '已提交'
  })

  orders.unshift(record)
  safeSet(KEYS.orders, orders)

  return {
    ok: true,
    record: record
  }
}

function updateOrder(id, patch) {
  const orders = getOrders()
  const pointRecords = getPointRecords()
  const pointChanges = []
  const nextOrders = orders.map(function (item) {
    if (item.id !== id) {
      return item
    }
    const nextOrder = Object.assign({}, item, patch)
    const points = calculateOrderPoints(nextOrder)

    if (nextOrder.orderStatus === '已完成' && !nextOrder.pointsAwarded && points > 0) {
      pointChanges.push(buildOrderPointRecord(nextOrder, points, '订单完成获得积分', 'order_complete'))
      nextOrder.pointsAwarded = true
      nextOrder.pointsAwardedValue = points
      nextOrder.pointsAwardedAt = formatTime(new Date())
    }

    if (shouldDeductOrderPoints(nextOrder) && nextOrder.pointsAwarded && !nextOrder.pointsDeducted) {
      const deductPoints = Number(nextOrder.pointsAwardedValue) || points
      if (deductPoints > 0) {
        pointChanges.push(buildOrderPointRecord(nextOrder, -deductPoints, '订单取消/退款扣回积分', 'order_refund_deduct'))
        nextOrder.pointsDeducted = true
        nextOrder.pointsDeductedValue = deductPoints
        nextOrder.pointsDeductedAt = formatTime(new Date())
      }
    }

    return nextOrder
  })
  safeSet(KEYS.orders, nextOrders)
  if (pointChanges.length) {
    savePointRecords(pointChanges.concat(pointRecords))
  }
  return nextOrders
}

function clearOrders() {
  return safeSet(KEYS.orders, [])
}

function normalizeAdminCoupon(coupon) {
  return Object.assign({
    couponId: '',
    couponName: '',
    couponType: '满减券',
    thresholdAmount: '',
    discountAmount: '',
    discountRate: '',
    applyScene: '全部',
    validStart: '',
    validEnd: '',
    totalCount: 0,
    issuedCount: 0,
    usedCount: 0,
    status: '未上架'
  }, coupon || {})
}

function normalizeUserCoupon(coupon) {
  return Object.assign({
    recordId: '',
    couponId: '',
    couponName: '',
    couponType: '满减券',
    thresholdAmount: '',
    discountAmount: '',
    discountRate: '',
    applyScene: '全部',
    validStart: '',
    validEnd: '',
    status: '可用',
    receivedAt: ''
  }, coupon || {})
}

function getAdminCoupons() {
  const coupons = safeGet(KEYS.adminCoupons, mockData.adminCoupons)
  if (!Array.isArray(coupons)) {
    safeSet(KEYS.adminCoupons, clone(mockData.adminCoupons))
    return clone(mockData.adminCoupons)
  }
  return coupons.filter(function (item) {
    return isPlainObject(item)
  }).map(normalizeAdminCoupon)
}

function saveAdminCoupons(coupons) {
  const nextCoupons = Array.isArray(coupons) ? coupons.map(normalizeAdminCoupon) : []
  safeSet(KEYS.adminCoupons, nextCoupons)
  return nextCoupons
}

function createCouponId() {
  const date = new Date()
  return 'CP' + [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ].map(function (value) {
    return value < 10 ? '0' + value : '' + value
  }).join('') + Math.floor(Math.random() * 90 + 10)
}

function addAdminCoupon(payload) {
  const coupons = getAdminCoupons()
  const record = normalizeAdminCoupon(Object.assign({}, payload, {
    couponId: payload.couponId || createCouponId(),
    issuedCount: Number(payload.issuedCount) || 0,
    usedCount: Number(payload.usedCount) || 0,
    totalCount: Number(payload.totalCount) || 0
  }))
  coupons.unshift(record)
  saveAdminCoupons(coupons)
  return record
}

function updateAdminCoupon(couponId, patch) {
  const coupons = getAdminCoupons()
  const nextCoupons = coupons.map(function (item) {
    if (item.couponId !== couponId) {
      return item
    }
    return normalizeAdminCoupon(Object.assign({}, item, patch))
  })
  return saveAdminCoupons(nextCoupons)
}

function getUserCoupons() {
  const coupons = safeGet(KEYS.userCoupons, mockData.userCoupons)
  if (!Array.isArray(coupons)) {
    safeSet(KEYS.userCoupons, clone(mockData.userCoupons))
    return clone(mockData.userCoupons)
  }
  return coupons.filter(function (item) {
    return isPlainObject(item)
  }).map(normalizeUserCoupon)
}

function saveUserCoupons(coupons) {
  const nextCoupons = Array.isArray(coupons) ? coupons.map(normalizeUserCoupon) : []
  safeSet(KEYS.userCoupons, nextCoupons)
  return nextCoupons
}

function useUserCoupon(recordId, order) {
  if (!recordId) {
    return { ok: true, coupon: null }
  }

  let usedCoupon = null
  let couponFound = false
  let couponAvailable = false
  const userCoupons = getUserCoupons()
  const nextCoupons = userCoupons.map(function (item) {
    if (item.recordId !== recordId) {
      return item
    }
    couponFound = true
    if (item.status !== '可用') {
      return item
    }
    couponAvailable = true
    usedCoupon = normalizeUserCoupon(Object.assign({}, item, {
      status: '已使用',
      usedAt: formatTime(new Date()),
      orderId: order && order.id ? order.id : '',
      orderNo: order && order.orderNo ? order.orderNo : ''
    }))
    return usedCoupon
  })

  if (!couponFound) {
    return { ok: false, message: '优惠券不存在' }
  }
  if (!couponAvailable || !usedCoupon) {
    return { ok: false, message: '优惠券不可用' }
  }

  saveUserCoupons(nextCoupons)
  const adminCoupon = getAdminCoupons().find(function (item) {
    return item.couponId === usedCoupon.couponId
  })
  if (adminCoupon) {
    updateAdminCoupon(adminCoupon.couponId, {
      usedCount: Number(adminCoupon.usedCount) + 1
    })
  }
  return { ok: true, coupon: usedCoupon }
}

function buildUserCouponRecord(coupon, sourceText) {
  return normalizeUserCoupon({
    recordId: 'UC' + Date.now() + Math.floor(Math.random() * 900 + 100),
    couponId: coupon.couponId,
    couponName: coupon.couponName,
    couponType: coupon.couponType,
    thresholdAmount: coupon.thresholdAmount,
    discountAmount: coupon.discountAmount,
    discountRate: coupon.discountRate,
    applyScene: coupon.applyScene,
    validStart: coupon.validStart,
    validEnd: coupon.validEnd,
    status: '可用',
    receivedAt: formatTime(new Date()),
    sourceText: sourceText || '用户主动领取'
  })
}

function canIssueCoupon(coupon) {
  if (!coupon) {
    return '优惠券不存在'
  }
  if (coupon.status !== '已上架') {
    return '优惠券未上架'
  }
  if (Number(coupon.totalCount) > 0 && Number(coupon.issuedCount) >= Number(coupon.totalCount)) {
    return '优惠券已发完'
  }
  return ''
}

function claimCoupon(couponId) {
  const coupons = getAdminCoupons()
  const coupon = coupons.find(function (item) {
    return item.couponId === couponId
  })
  const error = canIssueCoupon(coupon)
  if (error) {
    return { ok: false, message: error }
  }

  const userCoupons = getUserCoupons()
  const existed = userCoupons.some(function (item) {
    return item.couponId === couponId && item.status !== '已过期'
  })
  if (existed) {
    return { ok: false, message: '已领取该优惠券' }
  }

  const record = buildUserCouponRecord(coupon, '用户主动领取')
  userCoupons.unshift(record)
  saveUserCoupons(userCoupons)
  updateAdminCoupon(couponId, {
    issuedCount: Number(coupon.issuedCount) + 1
  })
  return { ok: true, record: record }
}

function simulateIssueCoupon(couponId) {
  const coupons = getAdminCoupons()
  const coupon = coupons.find(function (item) {
    return item.couponId === couponId
  })
  const error = canIssueCoupon(coupon)
  if (error) {
    return { ok: false, message: error }
  }

  const userCoupons = getUserCoupons()
  const record = buildUserCouponRecord(coupon, '后台模拟发放')
  userCoupons.unshift(record)
  saveUserCoupons(userCoupons)
  updateAdminCoupon(couponId, {
    issuedCount: Number(coupon.issuedCount) + 1
  })
  return { ok: true, record: record }
}

function getPriceKey(variety, spec) {
  const varietyMap = {
    '桂味': 'guiwei',
    '糯米糍': 'nuomici',
    '混装': 'mixed'
  }
  const specKey = spec === '10斤装' ? '10' : '5'
  return (varietyMap[variety] || 'guiwei') + specKey
}

function getProductPrice(config, variety, spec) {
  const prices = mergeConfig(config).prices
  const key = getPriceKey(variety, spec)
  return Number(prices[key]) || Number(mockData.defaultPrices[key]) || 0
}

function getGiftBoxUnitFee(config, spec) {
  const prices = mergeConfig(config).prices
  return Number(prices[spec === '10斤装' ? 'giftBox10' : 'giftBox5']) || 0
}

function getShippingFeeKey(thirdPartyMethod, spec) {
  const methodKey = thirdPartyMethod === '同城快送' ? 'city' : 'sf'
  const specKey = spec === '10斤装' ? '10' : '5'
  return methodKey + specKey
}

function getEstimatedShippingFee(config, thirdPartyMethod, spec) {
  const shippingFees = mergeConfig(config).shippingFees
  return Number(shippingFees[getShippingFeeKey(thirdPartyMethod, spec)]) || 0
}

function getExpressDeliveryConfig(config) {
  return mergeConfig(config).expressDelivery
}

function getReferenceShippingRange(config, spec, region) {
  const merged = mergeConfig(config)
  const deliveryConfig = merged.expressDelivery || {}
  const regionText = Array.isArray(region) ? region.join(' ') : String(region || '')
  const remoteRegions = Array.isArray(deliveryConfig.remoteRegions) ? deliveryConfig.remoteRegions : []
  const isRemote = remoteRegions.some(function (item) {
    return item && regionText.indexOf(item) >= 0
  })
  const ranges = isRemote ? deliveryConfig.remoteShippingFeeRanges : deliveryConfig.shippingFeeRanges
  const fallbackRanges = deliveryConfig.shippingFeeRanges || {}
  const range = (ranges && ranges[spec]) || fallbackRanges[spec] || { min: 0, max: 0 }
  const legacyFee = getEstimatedShippingFee(merged, '顺丰快递', spec)
  const min = legacyFee > 0 && !isRemote ? legacyFee : Number(range.min) || 0
  const max = legacyFee > 0 && !isRemote ? legacyFee : Math.max(min, Number(range.max) || min)

  return {
    min: min,
    max: max,
    isRemote: isRemote,
    text: min === max ? '约 ¥' + min.toFixed(2) : '约 ¥' + min.toFixed(2) + '-' + max.toFixed(2)
  }
}

function getRecords(type) {
  if (type === 'orders') {
    return getOrders()
  }
  return []
}

function saveReservation(type, channel, payload) {
  return saveOrder(payload)
}

function saveRecord(type, payload) {
  return saveOrder(payload)
}

function updateRecord(type, id, patch) {
  return updateOrder(id, patch)
}

function clearRecords(type) {
  if (type === 'orders') {
    return clearOrders()
  }
  return true
}

module.exports = {
  KEYS,
  initMockData,
  getConfig,
  saveConfig,
  isAdminUser,
  isAdminMockEnabled,
  isOpenidInAdminWhitelist,
  getAdminAuthMode,
  requiresAdminPassword,
  authorizeAdminWithPassword,
  grantAdminSession,
  clearAdminSession,
  hasAdminAccess,
  getUserRole,
  getCurrentOpenid,
  getCurrentMockOpenid,
  getSalesStatus,
  getDashboard,
  shouldBlockNewOrders,
  getOrders,
  getAfterSales,
  saveAfterSales,
  getAfterSaleById,
  saveAfterSale,
  saveOrderDraft,
  getOrderDraft,
  clearOrderDraft,
  saveOrder,
  updateOrder,
  clearOrders,
  getAdminCoupons,
  saveAdminCoupons,
  addAdminCoupon,
  updateAdminCoupon,
  getUserCoupons,
  saveUserCoupons,
  useUserCoupon,
  claimCoupon,
  simulateIssueCoupon,
  getPointRecords,
  savePointRecords,
  getPointSummary,
  addPointRecord,
  redeemOrderPoints,
  adjustPoints,
  awardReminderPoints,
  getSaleReminderRecords,
  getSaleReminderRecord,
  upsertSaleReminder,
  cancelSaleReminder,
  getAddressList,
  saveAddress,
  deleteAddress,
  setDefaultAddress,
  getDefaultAddress,
  setOrderFilter,
  consumeOrderFilter,
  calculateOrderPoints,
  formatTime,
  getPriceKey,
  getProductPrice,
  getGiftBoxUnitFee,
  getEstimatedShippingFee,
  getExpressDeliveryConfig,
  getReferenceShippingRange,
  getRecords,
  saveReservation,
  saveRecord,
  updateRecord,
  clearRecords
}
