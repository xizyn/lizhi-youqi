const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const ORDERS_COLLECTION = 'orders'
const STOCK_COLLECTION = 'varietyStock'
const CONFIG_COLLECTION = 'config'
const DEFAULT_CONFIG_ID = 'default'

const DEFAULT_CONFIG = {
  adminOpenids: [],
  adminOpenidWhitelist: [],
  prices: {
    guiweiPickupNearbyUnit: 24,
    nuomiciPickupNearbyUnit: 34,
    giftBox5: 3,
    giftBox10: 5,
    guiwei5: 120,
    guiwei10: 220,
    nuomici5: 170,
    nuomici10: 270,
    mixed5: 150,
    mixed10: 245
  },
  nearbyDelivery: {
    deliveryFee: 0
  },
  shippingFees: {
    sf5: 0,
    sf10: 0,
    city5: 0,
    city10: 0
  }
}

function ok(data) {
  return Object.assign({ ok: true }, data || {})
}

function fail(code, message, extra) {
  return Object.assign({
    ok: false,
    code: code,
    message: message
  }, extra || {})
}

function pad(value) {
  return value < 10 ? '0' + value : '' + value
}

function formatTime(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join(':')
}

function formatOrderNo(date) {
  return 'LY' + [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('') + Math.floor(Math.random() * 900 + 100)
}

function toNumber(value) {
  const numberValue = Number(value)
  if (!isFinite(numberValue) || numberValue < 0) {
    return 0
  }
  return Math.round(numberValue * 10) / 10
}

function toMoney(value) {
  const numberValue = Number(value)
  if (!isFinite(numberValue) || numberValue < 0) {
    return 0
  }
  return Math.round(numberValue * 100) / 100
}

function mergeConfig(config) {
  const source = config || {}
  return Object.assign({}, DEFAULT_CONFIG, source, {
    prices: Object.assign({}, DEFAULT_CONFIG.prices, source.prices || {}),
    nearbyDelivery: Object.assign({}, DEFAULT_CONFIG.nearbyDelivery, source.nearbyDelivery || {}),
    shippingFees: Object.assign({}, DEFAULT_CONFIG.shippingFees, source.shippingFees || {})
  })
}

async function getConfig() {
  try {
    const result = await db.collection(CONFIG_COLLECTION).doc(DEFAULT_CONFIG_ID).get()
    return mergeConfig(result.data || {})
  } catch (error) {
    return mergeConfig(DEFAULT_CONFIG)
  }
}

function getAdminOpenids(config) {
  const adminOpenids = Array.isArray(config.adminOpenids) ? config.adminOpenids : []
  const whitelist = Array.isArray(config.adminOpenidWhitelist) ? config.adminOpenidWhitelist : []
  return adminOpenids.concat(whitelist).map(function (item) {
    return String(item || '').trim()
  }).filter(function (item, index, list) {
    return item && list.indexOf(item) === index
  })
}

function assertAdmin(openid, config) {
  const adminOpenids = getAdminOpenids(config)
  if (adminOpenids.indexOf(openid) < 0) {
    throw new Error('NO_ADMIN_PERMISSION')
  }
}

function getSpecWeight(spec) {
  const text = String(spec || '')
  if (text.indexOf('10') >= 0) {
    return 10
  }
  if (text.indexOf('5') >= 0) {
    return 5
  }
  return 0
}

function getPriceKey(variety, spec) {
  const specKey = getSpecWeight(spec) === 10 ? '10' : '5'
  if (variety === '糯米糍') {
    return 'nuomici' + specKey
  }
  if (variety === '混装') {
    return 'mixed' + specKey
  }
  return 'guiwei' + specKey
}

function extractWeights(payload) {
  const source = payload || {}
  let guiweiWeight = toNumber(source.guiweiWeight || source.guiweiJin || source.guiweiQuantity)
  let nuomiciWeight = toNumber(source.nuomiciWeight || source.nuomiciJin || source.nuomiciQuantity)
  const items = Array.isArray(source.items) ? source.items : []

  items.forEach(function (item) {
    const variety = item.variety || item.productVariety || item.name || item.productName || ''
    const quantity = Math.max(1, Number(item.quantity || item.count || 1) || 1)
    const itemWeight = toNumber(item.weight || item.jin || item.weightJin || item.totalWeight) || getSpecWeight(item.spec) * quantity
    if (String(variety).indexOf('桂味') >= 0) {
      guiweiWeight += itemWeight
    } else if (String(variety).indexOf('糯米糍') >= 0) {
      nuomiciWeight += itemWeight
    } else if (String(variety).indexOf('混装') >= 0) {
      guiweiWeight += itemWeight / 2
      nuomiciWeight += itemWeight / 2
    }
  })

  return {
    guiweiWeight: toNumber(guiweiWeight),
    nuomiciWeight: toNumber(nuomiciWeight),
    totalWeight: toNumber(guiweiWeight + nuomiciWeight)
  }
}

function calculateItemGoodsAmount(payload, config) {
  const items = Array.isArray(payload.items) ? payload.items : []
  if (!items.length) {
    return 0
  }
  return items.reduce(function (total, item) {
    const quantity = Math.max(1, Number(item.quantity || item.count || 1) || 1)
    const priceKey = item.priceKey || getPriceKey(item.variety || item.productVariety || item.name || item.productName, item.spec)
    const unitPrice = toMoney(config.prices[priceKey])
    return total + unitPrice * quantity
  }, 0)
}

function calculateAmounts(payload, config, weights) {
  const source = payload || {}
  let goodsAmount = calculateItemGoodsAmount(source, config)
  if (!goodsAmount) {
    goodsAmount = weights.guiweiWeight * toMoney(config.prices.guiweiPickupNearbyUnit) +
      weights.nuomiciWeight * toMoney(config.prices.nuomiciPickupNearbyUnit)
  }

  const giftBox5Count = Math.floor(Number(source.giftBox5Count || source.giftBox5Quantity || 0) || 0)
  const giftBox10Count = Math.floor(Number(source.giftBox10Count || source.giftBox10Quantity || 0) || 0)
  const giftBoxFee = toMoney(giftBox5Count * toMoney(config.prices.giftBox5) + giftBox10Count * toMoney(config.prices.giftBox10))
  const deliveryType = source.deliveryType || source.deliveryMethod || source.channel || ''
  const specWeight = getSpecWeight(source.spec || source.productSpec || (source.selectedSku && source.selectedSku.spec))
  const specKey = specWeight === 10 ? '10' : '5'
  let freightFee = 0

  if (deliveryType === 'localDelivery' || deliveryType === '附近送' || deliveryType === '附近送货') {
    freightFee = toMoney(config.nearbyDelivery.deliveryFee)
  } else if (deliveryType === 'express' || deliveryType === '顺丰快递' || deliveryType === '顺丰冷运') {
    freightFee = toMoney(config.shippingFees['sf' + specKey])
  } else if (deliveryType === 'cityExpress' || deliveryType === '同城快送') {
    freightFee = toMoney(config.shippingFees['city' + specKey])
  }

  return {
    goodsAmount: toMoney(goodsAmount),
    giftBoxFee: giftBoxFee,
    freightFee: freightFee,
    totalAmount: toMoney(goodsAmount + giftBoxFee + freightFee)
  }
}

function buildStockOccupations(weights) {
  const occupations = []
  if (weights.guiweiWeight > 0) {
    occupations.push({ variety: 'guiwei', varietyName: '桂味', weight: weights.guiweiWeight })
  }
  if (weights.nuomiciWeight > 0) {
    occupations.push({ variety: 'nuomici', varietyName: '糯米糍', weight: weights.nuomiciWeight })
  }
  return occupations
}

async function getStockDoc(transaction, variety) {
  try {
    const result = await transaction.collection(STOCK_COLLECTION).doc(variety).get()
    return result.data || null
  } catch (error) {
    return null
  }
}

function assertStockAvailable(stock, occupation) {
  const total = stock && typeof stock.totalWeight !== 'undefined' && stock.totalWeight !== ''
    ? Number(stock.totalWeight)
    : null
  if (total === null || !isFinite(total)) {
    return
  }
  if (total <= 0) {
    throw new Error('STOCK_SOLD_OUT:' + occupation.varietyName)
  }
  const occupied = Number(stock.occupiedWeight || 0)
  if (occupied + occupation.weight > total) {
    throw new Error('STOCK_NOT_ENOUGH:' + occupation.varietyName)
  }
}

async function occupyStock(transaction, occupations) {
  for (let index = 0; index < occupations.length; index += 1) {
    const occupation = occupations[index]
    const stock = await getStockDoc(transaction, occupation.variety)
    assertStockAvailable(stock, occupation)
    if (stock) {
      await transaction.collection(STOCK_COLLECTION).doc(occupation.variety).update({
        data: {
          occupiedWeight: _.inc(occupation.weight),
          updatedAt: new Date()
        }
      })
    } else {
      await transaction.collection(STOCK_COLLECTION).doc(occupation.variety).set({
        data: {
          variety: occupation.variety,
          varietyName: occupation.varietyName,
          totalWeight: '',
          occupiedWeight: occupation.weight,
          updatedAt: new Date()
        }
      })
    }
  }
}

async function releaseStock(occupations) {
  const list = Array.isArray(occupations) ? occupations : []
  for (let index = 0; index < list.length; index += 1) {
    const occupation = list[index]
    if (!occupation || !occupation.variety || !occupation.weight) {
      continue
    }
    await db.collection(STOCK_COLLECTION).doc(occupation.variety).update({
      data: {
        occupiedWeight: _.inc(-Math.abs(Number(occupation.weight) || 0)),
        updatedAt: new Date()
      }
    }).catch(function () {})
  }
}

async function createOrder(event, openid) {
  const payload = event.payload || {}
  const config = await getConfig()
  const weights = extractWeights(payload)
  if (weights.totalWeight <= 0 && !(Array.isArray(payload.items) && payload.items.length)) {
    return fail('EMPTY_ORDER', '订单商品为空')
  }
  const amounts = calculateAmounts(payload, config, weights)
  const occupations = buildStockOccupations(weights)
  const now = new Date()
  const record = Object.assign({}, payload, amounts, weights, {
    _openid: openid,
    userOpenid: openid,
    orderNo: formatOrderNo(now),
    orderStatus: '待付款',
    createdAt: formatTime(now),
    createdAtDate: now,
    stockOccupations: occupations,
    stockReleased: false,
    cloudOrderVersion: 1
  })

  const result = await db.runTransaction(async function (transaction) {
    await occupyStock(transaction, occupations)
    const added = await transaction.collection(ORDERS_COLLECTION).add({
      data: record
    })
    return added
  })

  return ok({
    record: Object.assign({}, record, {
      _id: result._id,
      id: result._id
    })
  })
}

async function listMine(event, openid) {
  const options = event.options || {}
  const limit = Math.min(Number(options.limit) || 50, 100)
  const result = await db.collection(ORDERS_COLLECTION)
    .where({ userOpenid: openid })
    .orderBy('createdAtDate', 'desc')
    .limit(limit)
    .get()
  return ok({ orders: result.data || [] })
}

async function getOrderDetail(event, openid) {
  const id = event.id || (event.options && event.options.id)
  if (!id) {
    return fail('MISSING_ORDER_ID', '缺少订单ID')
  }
  const config = await getConfig()
  const result = await db.collection(ORDERS_COLLECTION).doc(id).get()
  const order = result.data || null
  if (!order) {
    return fail('ORDER_NOT_FOUND', '订单不存在')
  }
  const isOwner = order.userOpenid === openid || order._openid === openid
  const isAdmin = getAdminOpenids(config).indexOf(openid) >= 0
  if (!isOwner && !isAdmin) {
    return fail('NO_PERMISSION', '无权查看该订单')
  }
  return ok({ order: order })
}

async function adminList(event, openid) {
  const config = await getConfig()
  assertAdmin(openid, config)
  const options = event.options || {}
  const limit = Math.min(Number(options.limit) || 100, 200)
  let query = db.collection(ORDERS_COLLECTION)
  if (options.status) {
    query = query.where({ orderStatus: options.status })
  }
  const result = await query.orderBy('createdAtDate', 'desc').limit(limit).get()
  return ok({ orders: result.data || [] })
}

async function adminUpdate(event, openid) {
  const config = await getConfig()
  assertAdmin(openid, config)
  const payload = event.payload || {}
  const id = payload.id || payload._id
  if (!id) {
    return fail('MISSING_ORDER_ID', '缺少订单ID')
  }
  const patch = Object.assign({}, payload.patch || payload)
  delete patch.id
  delete patch._id
  delete patch.patch
  delete patch.goodsAmount
  delete patch.freightFee
  delete patch.totalAmount
  delete patch.stockOccupations
  delete patch.userOpenid
  delete patch._openid
  patch.updatedAt = formatTime(new Date())
  const previous = await db.collection(ORDERS_COLLECTION).doc(id).get().then(function (res) {
    return res.data || null
  })
  if (!previous) {
    return fail('ORDER_NOT_FOUND', '订单不存在')
  }
  if (previous.orderStatus === '已取消' && patch.orderStatus && patch.orderStatus !== '已取消') {
    return fail('CANCELLED_ORDER_LOCKED', '已取消订单不允许恢复')
  }
  if (patch.orderStatus === '已取消' && !previous.stockReleased) {
    await releaseStock(previous.stockOccupations)
    patch.stockReleased = true
    patch.cancelledAt = patch.cancelledAt || formatTime(new Date())
  }
  await db.collection(ORDERS_COLLECTION).doc(id).update({ data: patch })
  return ok({ id: id, patch: patch })
}

async function cancelMine(event, openid) {
  const id = event.id || (event.payload && event.payload.id)
  if (!id) {
    return fail('MISSING_ORDER_ID', '缺少订单ID')
  }
  const result = await db.collection(ORDERS_COLLECTION).doc(id).get()
  const order = result.data || null
  if (!order) {
    return fail('ORDER_NOT_FOUND', '订单不存在')
  }
  if (order.userOpenid !== openid && order._openid !== openid) {
    return fail('NO_PERMISSION', '无权取消该订单')
  }
  if (order.orderStatus === '已取消') {
    return ok({ id: id, alreadyCancelled: true })
  }
  if (['已完成', '售后处理中', '售后已处理'].indexOf(order.orderStatus) >= 0) {
    return fail('ORDER_CANNOT_CANCEL', '当前订单状态不能由用户取消')
  }
  if (!order.stockReleased) {
    await releaseStock(order.stockOccupations)
  }
  await db.collection(ORDERS_COLLECTION).doc(id).update({
    data: {
      orderStatus: '已取消',
      cancelledAt: formatTime(new Date()),
      cancelReason: '用户取消',
      stockReleased: true,
      updatedAt: formatTime(new Date())
    }
  })
  return ok({ id: id })
}

exports.main = async function (event, context) {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const action = event && event.action

  try {
    if (action === 'create') {
      return await createOrder(event, openid)
    }
    if (action === 'listMine') {
      return await listMine(event, openid)
    }
    if (action === 'detail') {
      return await getOrderDetail(event, openid)
    }
    if (action === 'adminList') {
      return await adminList(event, openid)
    }
    if (action === 'adminUpdate') {
      return await adminUpdate(event, openid)
    }
    if (action === 'cancelMine') {
      return await cancelMine(event, openid)
    }
    return fail('UNKNOWN_ACTION', '未知订单操作')
  } catch (error) {
    const message = error && error.message ? error.message : '云端订单服务异常'
    if (message === 'NO_ADMIN_PERMISSION') {
      return fail('NO_ADMIN_PERMISSION', '无管理员权限')
    }
    if (message.indexOf('STOCK_SOLD_OUT:') === 0) {
      return fail('STOCK_SOLD_OUT', message.replace('STOCK_SOLD_OUT:', '') + '当前不可售')
    }
    if (message.indexOf('STOCK_NOT_ENOUGH:') === 0) {
      return fail('STOCK_NOT_ENOUGH', message.replace('STOCK_NOT_ENOUGH:', '') + '库存不足')
    }
    return fail('ORDER_SERVICE_ERROR', message)
  }
}
