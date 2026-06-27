const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')
const reportGenerator = require('../../utils/reportGenerator')
const stock = require('../../utils/stock')

function indexOfValue(list, value) {
  const index = list.indexOf(value)
  return index < 0 ? 0 : index
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function pad(value) {
  return value < 10 ? '0' + value : '' + value
}

function todayPrefix() {
  const date = new Date()
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function addDays(date, count) {
  const nextDate = new Date(date.getTime())
  nextDate.setDate(nextDate.getDate() + count)
  return nextDate
}

function dateText(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function getDatePrefix(value) {
  return String(value || '').slice(0, 10)
}

function getTodayOrders(orders) {
  const today = todayPrefix()
  const list = Array.isArray(orders) ? orders : []
  return list.filter(function (item) {
    return String(item.createdAt || '').indexOf(today) === 0
  })
}

function getOrdersByDateRange(orders, range, startDate, endDate) {
  const list = Array.isArray(orders) ? orders : []
  const today = new Date()
  let start = todayPrefix()
  let end = todayPrefix()

  if (range === 'yesterday') {
    start = dateText(addDays(today, -1))
    end = start
  } else if (range === 'last7') {
    start = dateText(addDays(today, -6))
  } else if (range === 'custom') {
    start = startDate || todayPrefix()
    end = endDate || start
  }

  return list.filter(function (item) {
    const createdDate = getDatePrefix(item.createdAt)
    return createdDate >= start && createdDate <= end
  })
}

function getReportRangeText(range, startDate, endDate) {
  if (range === 'yesterday') {
    return '昨日'
  }
  if (range === 'last7') {
    return '最近7天'
  }
  if (range === 'custom') {
    return (startDate || todayPrefix()) + ' 至 ' + (endDate || startDate || todayPrefix())
  }
  return '今日'
}

function returnToProfile() {
  wx.switchTab({
    url: '/pages/profile/profile',
    fail: function () {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  })
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

function buildPriceRows(config) {
  const prices = config.prices || {}
  return mockData.priceFields.map(function (item) {
    return {
      key: item.key,
      label: item.label,
      value: prices[item.key]
    }
  })
}

function buildShippingFeeRows(config) {
  const shippingFees = config.shippingFees || {}
  return mockData.shippingFeeFields.map(function (item) {
    return {
      key: item.key,
      label: item.label,
      value: shippingFees[item.key]
    }
  })
}

function buildVarietyStockRows(config) {
  const varietyStock = config.varietyStock || {}
  return [
    { key: 'guiweiWeight', label: '桂味库存重量', value: stockWeightInputValue(varietyStock.guiweiWeight) },
    { key: 'nuomiciWeight', label: '糯米糍库存重量', value: stockWeightInputValue(varietyStock.nuomiciWeight) }
  ]
}

function buildVarietyStockSummaryRows(config, orders) {
  const usage = stock.calculateStockUsage(config, orders)
  return [
    {
      key: 'guiwei',
      name: '桂味',
      stockText: usage.guiwei.stockText,
      usedText: usage.guiwei.usedText,
      remainingText: usage.guiwei.remainingText,
      statusText: usage.guiwei.autoSoldOut ? '已自动停售' : (usage.guiwei.stockSet ? '按库存限制' : '未限制库存'),
      statusClass: usage.guiwei.autoSoldOut ? 'danger' : (usage.guiwei.stockSet ? 'normal' : 'muted')
    },
    {
      key: 'nuomici',
      name: '糯米糍',
      stockText: usage.nuomici.stockText,
      usedText: usage.nuomici.usedText,
      remainingText: usage.nuomici.remainingText,
      statusText: usage.nuomici.autoSoldOut ? '已自动停售' : (usage.nuomici.stockSet ? '按库存限制' : '未限制库存'),
      statusClass: usage.nuomici.autoSoldOut ? 'danger' : (usage.nuomici.stockSet ? 'normal' : 'muted')
    }
  ]
}

function buildSkuStatusRows(config) {
  const prices = config.prices || {}
  const statusMap = config.skuStatusMap || {}
  return mockData.skuOptions.map(function (sku) {
    const status = statusMap[sku.id] || {}
    const price = Number(prices[sku.priceKey])
    return {
      id: sku.id,
      name: sku.name,
      spec: sku.spec,
      image: sku.image,
      priceText: !isNaN(price) && price > 0 ? '¥' + formatMoney(price) : '价格待补',
      isListed: status.isListed !== false,
      isSoldOut: status.isSoldOut === true
    }
  })
}

const PRODUCT_OPERATION_LOG_KEY = 'adminProductOperationLogs'

function buildProductWorkbench(config) {
  const prices = config.prices || {}
  const statusMap = config.skuStatusMap || {}
  const rows = mockData.skuOptions.map(function (sku) {
    const status = statusMap[sku.id] || {}
    const price = Number(prices[sku.priceKey])
    const hasPrice = !isNaN(price) && price > 0
    const isListed = status.isListed !== false
    const isSoldOut = status.isSoldOut === true
    let statusText = '销售中'
    let statusTone = 'selling'

    if (!isListed) {
      statusText = '未上架'
      statusTone = 'unlisted'
    } else if (isSoldOut) {
      statusText = '已售罄'
      statusTone = 'warning'
    } else if (!hasPrice) {
      statusText = '价格待补'
      statusTone = 'danger'
    }

    return {
      id: sku.id,
      name: sku.name,
      variety: sku.variety,
      spec: sku.spec,
      image: sku.image,
      priceKey: sku.priceKey,
      priceText: hasPrice ? '¥' + formatMoney(price) : '未设置',
      hasPrice: hasPrice,
      isListed: isListed,
      isSoldOut: isSoldOut,
      statusText: statusText,
      statusTone: statusTone
    }
  })
  const sellingCount = rows.filter(function (item) {
    return item.isListed && !item.isSoldOut && item.hasPrice
  }).length
  const soldOutCount = rows.filter(function (item) {
    return item.isSoldOut
  }).length
  const missingPriceCount = rows.filter(function (item) {
    return !item.hasPrice
  }).length
  const unlistedCount = rows.filter(function (item) {
    return !item.isListed
  }).length

  return {
    rows: rows,
    stats: [
      { key: 'selling', label: '正在销售', value: sellingCount, tone: 'green' },
      { key: 'stock', label: '售罄待补', value: soldOutCount, tone: soldOutCount ? 'orange' : 'muted' },
      { key: 'price', label: '价格待补', value: missingPriceCount, tone: missingPriceCount ? 'red' : 'muted' },
      { key: 'unlisted', label: '未上架', value: unlistedCount, tone: unlistedCount ? 'gray' : 'muted' }
    ],
    issues: [
      { key: 'stock', title: '检查售罄商品', desc: '当前以售罄状态作为补货提醒', count: soldOutCount, panel: 'status' },
      { key: 'price', title: '补充商品价格', desc: '未设置价格的商品不能正常对外销售', count: missingPriceCount, panel: 'price' },
      { key: 'unlisted', title: '确认未上架商品', desc: '检查是否需要恢复销售', count: unlistedCount, panel: 'status' }
    ].filter(function (item) {
      return item.count > 0
    }),
    categoryCount: rows.reduce(function (categories, item) {
      if (categories.indexOf(item.variety) < 0) {
        categories.push(item.variety)
      }
      return categories
    }, []).length
  }
}

function getProductOperationLogs() {
  const logs = wx.getStorageSync(PRODUCT_OPERATION_LOG_KEY)
  return Array.isArray(logs) ? logs.slice(0, 5) : []
}

function recordProductOperation(text) {
  const logs = getProductOperationLogs()
  logs.unshift({
    id: 'product_log_' + Date.now(),
    text: text,
    time: storage.formatTime(new Date())
  })
  wx.setStorageSync(PRODUCT_OPERATION_LOG_KEY, logs.slice(0, 20))
}

function describeProductConfigChanges(previousConfig, nextConfig) {
  const previousPrices = previousConfig.prices || {}
  const nextPrices = nextConfig.prices || {}
  const previousStatus = previousConfig.skuStatusMap || {}
  const nextStatus = nextConfig.skuStatusMap || {}
  let priceChanges = 0
  let statusChanges = 0

  mockData.skuOptions.forEach(function (sku) {
    if (Number(previousPrices[sku.priceKey]) !== Number(nextPrices[sku.priceKey])) {
      priceChanges += 1
    }
    const before = previousStatus[sku.id] || {}
    const after = nextStatus[sku.id] || {}
    if ((before.isListed !== false) !== (after.isListed !== false) || (before.isSoldOut === true) !== (after.isSoldOut === true)) {
      statusChanges += 1
    }
  })

  const previousStock = previousConfig.varietyStock || {}
  const nextStock = nextConfig.varietyStock || {}
  let stockChanges = 0
  ;['guiweiWeight', 'nuomiciWeight'].forEach(function (key) {
    if (normalizeStockWeight(previousStock[key]) !== normalizeStockWeight(nextStock[key])) {
      stockChanges += 1
    }
  })

  const parts = []
  if (priceChanges) {
    parts.push('调整价格 ' + priceChanges + ' 项')
  }
  if (statusChanges) {
    parts.push('更新商品状态 ' + statusChanges + ' 项')
  }
  if (stockChanges) {
    parts.push('更新库存重量 ' + stockChanges + ' 项')
  }
  return parts.length ? parts.join('，') : '保存商品配置'
}

function buildPickupTimeSlotRows(config) {
  const slots = Array.isArray(config.pickupTimeSlots) && config.pickupTimeSlots.length ? config.pickupTimeSlots : mockData.defaultConfig.pickupTimeSlots
  return slots.map(function (item) {
    return { value: item }
  })
}

function parseBooleanText(value) {
  return value === true || value === 'true'
}

function normalizeStockWeight(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return ''
  }
  const text = String(value).trim()
  if (!text) {
    return ''
  }
  const numberValue = Number(text)
  if (!isFinite(numberValue)) {
    return ''
  }
  if (numberValue < 0) {
    return 0
  }
  return Math.round(numberValue * 10) / 10
}

function stockWeightInputValue(value) {
  const normalizedValue = normalizeStockWeight(value)
  return normalizedValue === '' ? '' : String(normalizedValue)
}

function toMoney(value) {
  const number = Number(value)
  if (isNaN(number) || number < 0) {
    return 0
  }
  return Math.round(number * 100) / 100
}

function formatMoney(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return ''
  }
  const number = Number(value)
  if (isNaN(number)) {
    return ''
  }
  return String(Math.round(number * 100) / 100)
}

function hasMoneyValue(value) {
  return value !== '' && value !== null && typeof value !== 'undefined' && !isNaN(Number(value))
}

function normalizeWeight(value) {
  const number = parseFloat(value)
  if (!number || number < 0) {
    return 0
  }
  return Math.round(number * 10) / 10
}

function normalizeStatus(status) {
  const statusMap = {
    pending_payment: '待付款',
    paid: '已支付',
    preparing: '待打包',
    packed: '待发货/待自提',
    shipped: '已送出',
    picked_up: '已完成',
    completed: '已完成',
    cancelled: '已取消',
    after_sale: '售后处理中',
    after_sale_handled: '售后已处理'
  }
  if (statusMap[status]) {
    return statusMap[status]
  }
  if (status === '待配送/待自提' || status === '待配送' || status === '待发货') {
    return '待发货/待自提'
  }
  if (status === '已发货') {
    return '已送出'
  }
  return status || '已提交'
}

function isHistoryOrder(order) {
  return mockData.historyOrderStatuses.indexOf(normalizeStatus(order.orderStatus)) >= 0
}

function getCourierWeight(spec) {
  const rule = mockData.courierWeightRules[spec] || mockData.courierWeightRules['5斤装']
  return rule.estimatedCourierWeight
}

function isExpressOrder(order) {
  const deliveryMethod = order.deliveryMethod || ''
  const thirdPartyMethod = order.thirdPartyMethod || ''
  return deliveryMethod === '快递' || deliveryMethod === '顺丰邮寄' || deliveryMethod === '同城快送' || thirdPartyMethod === '同城快送' || thirdPartyMethod === '顺丰快递'
}

function applyShippingSettlement(order) {
  const estimated = toMoney(order.estimatedShippingFee || order.freightAmount)
  const hasActual = hasMoneyValue(order.actualShippingFee)
  const actual = hasActual ? toMoney(order.actualShippingFee) : 0
  const diff = hasActual ? Math.round((actual - estimated) * 100) / 100 : ''
  const refund = hasActual && actual < estimated ? Math.round((estimated - actual) * 100) / 100 : ''
  const absorbed = hasActual && actual > estimated && order.shippingFeeStatus !== '异常待确认' ? Math.round((actual - estimated) * 100) / 100 : ''
  let status = order.shippingFeeStatus || '未确认'

  if (hasActual && status !== '已退款' && status !== '异常待确认') {
    status = '已结算'
  }

  return Object.assign({}, order, {
    estimatedShippingFee: estimated || '',
    freightAmount: estimated || '',
    actualShippingFee: hasActual ? actual : '',
    shippingFeeDiff: diff === '' ? '' : formatMoney(diff),
    refundShippingFee: refund === '' ? '' : formatMoney(refund),
    absorbedShippingDiff: absorbed === '' ? '' : formatMoney(absorbed),
    shippingFeeStatus: status
  })
}

function getProductName(order) {
  return firstValue([
    order.skuName,
    order.productName,
    order.productTitle,
    order.variety
  ], '荔枝')
}

function getSpecText(order) {
  if (order.customWeightOrder) {
    return '自定义斤数'
  }
  return firstValue([
    order.spec,
    order.fruitWeightText,
    order.specText
  ], '待确认')
}

function getQuantity(order) {
  if (order.customWeightOrder) {
    return normalizeWeight(order.totalWeight) || Math.round((normalizeWeight(order.guiweiWeight) + normalizeWeight(order.nuomiciWeight)) * 10) / 10
  }
  return Number(order.quantity) || Number(order.count) || 1
}

function getDeliverySummary(order) {
  const deliveryMethod = firstValue([order.deliveryMethod, order.deliveryType], '客服确认')
  const thirdPartyMethod = order.thirdPartyMethod || ''
  return deliveryMethod + (thirdPartyMethod ? ' / ' + thirdPartyMethod : '')
}

function getRecipientName(order) {
  return firstValue([
    order.recipientName,
    order.buyerName,
    order.name
  ], '未填写')
}

function getPhone(order) {
  return firstValue([
    order.recipientPhone,
    order.buyerPhone,
    order.phone
  ], '未填写')
}

function getAddress(order) {
  const pickupText = order.pickupDate ? order.pickupDate + ' ' + (order.pickupTimeSlot || '') : ''
  return firstValue([
    order.address,
    order.deliveryAddress,
    order.pickupAddress,
    pickupText,
    order.area
  ], '客服确认')
}

function getAmountText(order) {
  const value = firstValue([
    order.totalAmount,
    order.payAmount,
    order.productAmount,
    order.amount,
    order.price
  ], '')
  return hasMoneyValue(value) ? formatMoney(value) + '元' : '待客服确认'
}

function normalizeOrder(order, expandedOrderId) {
  const expressOrder = isExpressOrder(order)
  const pickupOrder = isPickupOrder(order)
  const nearbyOrder = isNearbyOrder(order)
  const source = expressOrder ? applyShippingSettlement(Object.assign({
    fruitWeightText: getSpecText(order),
    estimatedCourierWeight: getCourierWeight(getSpecText(order)),
    estimatedShippingFee: order.estimatedShippingFee || order.freightAmount || '',
    actualShippingFee: '',
    shippingFeeDiff: '',
    refundShippingFee: '',
    absorbedShippingDiff: '',
    shippingFeeStatus: '未确认'
  }, order)) : order
  const orderStatus = normalizeStatus(source.orderStatus)
  const productName = getProductName(source)
  const specText = getSpecText(source)
  const quantity = getQuantity(source)
  const guiweiWeight = normalizeWeight(source.guiweiWeight)
  const nuomiciWeight = normalizeWeight(source.nuomiciWeight)
  const totalWeight = source.customWeightOrder ? (normalizeWeight(source.totalWeight) || Math.round((guiweiWeight + nuomiciWeight) * 10) / 10) : 0
  const giftBox5Count = Number(source.giftBox5Count) || 0
  const giftBox10Count = Number(source.giftBox10Count) || 0
  const giftBoxCount = Number(source.giftBoxCount) || giftBox5Count + giftBox10Count
  const shippingFeeStatus = source.shippingFeeStatus || '未确认'
  const refundAmount = toMoney(source.refundShippingFee)
  const absorbedAmount = toMoney(source.absorbedShippingDiff)
  const historyOrder = isHistoryOrder(source)
  const afterSaleHandled = orderStatus === '售后已处理'

  return Object.assign({
    trackingNo: '',
    actualShippingFee: '',
    shipTime: '',
    serviceNote: ''
  }, source, {
    orderStatus: orderStatus,
    statusIndex: indexOfValue(mockData.orderStatuses, orderStatus),
    shippingFeeStatusIndex: indexOfValue(mockData.shippingFeeStatusOptions, shippingFeeStatus),
    orderNoText: source.orderNo || source.id || '未生成',
    productName: productName,
    specText: specText,
    quantityText: source.customWeightOrder ? totalWeight + '斤' : quantity + '箱',
    deliverySummary: getDeliverySummary(source),
    recipientNameText: getRecipientName(source),
    phoneText: getPhone(source),
    addressText: getAddress(source),
    amountText: getAmountText(source),
    isCustomWeightOrder: !!source.customWeightOrder,
    guiweiWeightText: guiweiWeight + '斤',
    nuomiciWeightText: nuomiciWeight + '斤',
    totalWeightText: totalWeight + '斤',
    giftBoxCountText: giftBoxCount + '个',
    giftBoxFeeText: hasMoneyValue(source.giftBoxFee) ? source.giftBoxFee + '元' : '0元',
    totalAmountText: hasMoneyValue(source.totalAmount) ? source.totalAmount + '元' : getAmountText(source),
    fruitWeightText: source.fruitWeightText || specText,
    estimatedCourierWeight: source.estimatedCourierWeight || (expressOrder ? getCourierWeight(specText) : ''),
    estimatedCourierWeightText: source.estimatedCourierWeight ? source.estimatedCourierWeight + 'kg' : (expressOrder ? getCourierWeight(specText) + 'kg' : ''),
    estimatedShippingFeeText: hasMoneyValue(source.estimatedShippingFee) ? source.estimatedShippingFee + '元' : '未填写',
    actualShippingFeeText: hasMoneyValue(source.actualShippingFee) ? source.actualShippingFee + '元' : '未填写',
    shippingFeeDiffText: hasMoneyValue(source.shippingFeeDiff) ? source.shippingFeeDiff + '元' : '未计算',
    refundShippingFeeText: refundAmount > 0 ? '需退 ' + source.refundShippingFee + '元' : '无需退款',
    absorbedShippingDiffText: absorbedAmount > 0 ? source.absorbedShippingDiff + '元' : '否',
    shippingExceptionText: shippingFeeStatus === '异常待确认' ? '是' : '否',
    isExpress: expressOrder,
    isPickup: pickupOrder,
    isNearby: nearbyOrder,
    isPendingPayment: orderStatus === '待付款',
    isAfterSale: orderStatus === '售后处理中',
    isAfterSaleHandled: afterSaleHandled,
    isHistory: historyOrder,
    canStartAfterSale: !historyOrder && orderStatus !== '售后处理中',
    isExpanded: source.id === expandedOrderId,
    detailButtonText: source.id === expandedOrderId ? '收起详情' : '查看详情'
  })
}

function getOrdersByTab(orders, tab) {
  if (tab === 'history') {
    return orders.filter(isHistoryOrder)
  }
  if (tab === 'current') {
    return orders.filter(function (item) {
      return !isHistoryOrder(item)
    })
  }
  return []
}

function filterCurrentOrders(orders, filter) {
  const list = Array.isArray(orders) ? orders : []
  if (filter === 'pendingPay') {
    return list.filter(function (item) {
      return normalizeStatus(item.orderStatus) === '待付款'
    })
  }
  if (filter === 'processing') {
    return list.filter(function (item) {
      const status = normalizeStatus(item.orderStatus)
      return ['已提交', '已支付', '待采摘', '待打包'].indexOf(status) >= 0
    })
  }
  if (filter === 'pendingDelivery') {
    return list.filter(function (item) {
      return normalizeStatus(item.orderStatus) === '待发货/待自提' && !item.isPickup
    })
  }
  if (filter === 'pendingFulfillment') {
    return list.filter(function (item) {
      return normalizeStatus(item.orderStatus) === '待发货/待自提'
    })
  }
  if (filter === 'pendingPickup') {
    return list.filter(function (item) {
      return normalizeStatus(item.orderStatus) === '待发货/待自提' && item.isPickup
    })
  }
  if (filter === 'shipped') {
    return list.filter(function (item) {
      return normalizeStatus(item.orderStatus) === '已送出'
    })
  }
  if (filter === 'afterSale') {
    return list.filter(function (item) {
      return normalizeStatus(item.orderStatus) === '售后处理中'
    })
  }
  return list
}

function buildCurrentOrderWorkbench(orders) {
  const currentOrders = getOrdersByTab(orders, 'current')
  const today = todayPrefix()
  const count = function (filter) {
    return filterCurrentOrders(currentOrders, filter).length
  }
  const pendingPayment = count('pendingPay')
  const processing = count('processing')
  const pendingDelivery = count('pendingDelivery')
  const pendingPickup = count('pendingPickup')
  const afterSale = count('afterSale')

  return {
    totalActionCount: pendingPayment + processing + pendingDelivery + pendingPickup + afterSale,
    overview: [
      {
        key: 'all',
        label: '今日订单',
        value: currentOrders.filter(function (item) {
          return getDatePrefix(item.createdAt) === today
        }).length,
        tone: 'green'
      },
      { key: 'pendingPay', label: '待付款', value: pendingPayment, tone: pendingPayment ? 'red' : 'muted' },
      { key: 'processing', label: '待处理', value: processing, tone: processing ? 'orange' : 'muted' },
      {
        key: 'pendingFulfillment',
        label: '待配送/自提',
        value: pendingDelivery + pendingPickup,
        tone: pendingDelivery + pendingPickup ? 'blue' : 'muted'
      },
      { key: 'afterSale', label: '售后处理中', value: afterSale, tone: afterSale ? 'red' : 'muted' }
    ],
    actions: [
      { key: 'pendingPay', title: '处理待付款', desc: '提醒付款或取消订单', count: pendingPayment },
      { key: 'processing', title: '确认订单', desc: '核对库存并安排采摘', count: processing },
      { key: 'pendingDelivery', title: '安排配送', desc: '填写单号或标记送出', count: pendingDelivery },
      { key: 'afterSale', title: '处理售后', desc: '查看售后申请与凭证', count: afterSale }
    ]
  }
}

function buildHistoryOverview(orders) {
  const history = getOrdersByTab(orders, 'history')
  const countStatus = function (statuses) {
    return history.filter(function (item) {
      return statuses.indexOf(normalizeStatus(item.orderStatus)) >= 0
    }).length
  }
  return [
    { key: 'completed', label: '已完成', value: countStatus(['已完成']), tone: 'green' },
    { key: 'cancelled', label: '已取消', value: countStatus(['已取消']), tone: 'gray' },
    { key: 'refunded', label: '已退款', value: history.filter(function (item) { return Number(item.refundAmount) > 0 }).length, tone: 'orange' },
    { key: 'afterSaleDone', label: '售后完成', value: countStatus(['售后已处理']), tone: 'blue' }
  ]
}

function filterHistoryOrders(orders, keyword, status) {
  const startDate = arguments.length > 3 ? arguments[3] : ''
  const endDate = arguments.length > 4 ? arguments[4] : ''
  const useDateRange = arguments.length > 5 ? arguments[5] : false
  const normalizedKeyword = String(keyword || '').trim().toLowerCase()
  return getOrdersByTab(orders, 'history').filter(function (item) {
    const matchesKeyword = !normalizedKeyword || [
      item.orderNoText,
      item.phoneText,
      item.recipientNameText,
      item.productName
    ].join(' ').toLowerCase().indexOf(normalizedKeyword) >= 0
    const matchesStatus = !status || status === '全部状态' || item.orderStatus === status
    const orderDate = getDatePrefix(firstValue([
      item.completedAt,
      item.canceledAt,
      item.afterSaleHandledAt,
      item.createdAt
    ], ''))
    const matchesDate = !useDateRange || (orderDate >= startDate && orderDate <= endDate)
    return matchesKeyword && matchesStatus && matchesDate
  })
}

function buildDeliveryWorkbench(config) {
  const nearby = config.nearbyDelivery || {}
  const express = config.expressDelivery || {}
  const supportedAreas = Array.isArray(nearby.supportedAreas) ? nearby.supportedAreas : []
  const shippingFees = config.shippingFees || {}
  const incomplete = [
    !config.pickupAddress,
    !Array.isArray(config.pickupTimeSlots) || !config.pickupTimeSlots.length,
    !supportedAreas.length,
    !express.coldChainSummary
  ].filter(Boolean).length

  return {
    enabledCount: 3,
    incompleteCount: incomplete,
    methods: [
      {
        key: 'pickup',
        title: '果园自提',
        status: '已开启',
        line1: config.pickupAddress || '自提地址待设置',
        line2: (config.pickupTimeSlots || []).join('、') || '自提时段待设置'
      },
      {
        key: 'nearby',
        title: '附近送',
        status: '已开启',
        line1: supportedAreas.length ? supportedAreas.join('、') : '配送范围待设置',
        line2: '配送费 ¥' + (Number(nearby.deliveryFee) || 0)
      },
      {
        key: 'express',
        title: '顺丰快递',
        status: '已开启',
        line1: express.coldChainSummary || '快递说明待设置',
        line2: '5斤 ¥' + (Number(shippingFees.sf5) || 0) + ' / 10斤 ¥' + (Number(shippingFees.sf10) || 0)
      }
    ]
  }
}

function buildPointWorkbench(summary) {
  const records = Array.isArray(summary.records) ? summary.records : []
  const today = todayPrefix()
  const todayEarned = records.reduce(function (total, item) {
    return String(item.time || '').indexOf(today) === 0 && Number(item.points) > 0 ? total + Number(item.points) : total
  }, 0)
  return {
    healthy: summary.availablePoints >= 0,
    overview: [
      { key: 'available', label: '当前可用', value: summary.availablePoints, tone: 'green' },
      { key: 'earned', label: '累计发放', value: summary.earnedPoints, tone: 'green' },
      { key: 'today', label: '今日发放', value: todayEarned, tone: todayEarned ? 'blue' : 'muted' },
      { key: 'used', label: '累计使用', value: summary.usedPoints, tone: 'orange' }
    ]
  }
}

function buildReminderWorkbench(records, config) {
  const reminderConfig = config.saleReminder || mockData.defaultSaleReminderConfig
  const list = Array.isArray(records) ? records : []
  const year = Number(reminderConfig.reservationYear) || 2027
  const activeRecords = list.filter(function (item) {
    return item.status === 'active' && Number(item.reservationYear) === year
  })
  const today = todayPrefix()
  const currentStage = reminderConfig.currentStage || '尚未挂果'
  let businessStage = reminderConfig.reservationOpen ? '预约中' : '未开售'

  if (currentStage === '已开售') {
    businessStage = '正在销售'
  } else if (currentStage === '本季售罄') {
    businessStage = '已售罄'
  } else if (!reminderConfig.reservationOpen && reminderConfig.actualSaleDate) {
    businessStage = '已结束'
  }

  const stageLabels = ['未开售', '预约中', '正在销售', '已售罄', '已结束']
  const activeIndex = Math.max(0, stageLabels.indexOf(businessStage))

  return {
    businessStage: businessStage,
    stageLabels: stageLabels.map(function (label, index) {
      return {
        label: label,
        active: index === activeIndex,
        done: index < activeIndex
      }
    }),
    metrics: [
      { label: '有效预约', value: activeRecords.length, unit: '人' },
      {
        label: '今日新增',
        value: activeRecords.filter(function (item) {
          return String(item.reservedAt || '').indexOf(today) === 0
        }).length,
        unit: '人'
      },
      {
        label: '通知已授权',
        value: activeRecords.filter(function (item) {
          return item.notificationAuth === 'accept'
        }).length,
        unit: '人'
      },
      {
        label: '通知待开启',
        value: activeRecords.filter(function (item) {
          return item.notificationAuth !== 'accept'
        }).length,
        unit: '人'
      }
    ],
    latestUpdate: (reminderConfig.orchardUpdates || [])[0] || null
  }
}

function getOrderListMeta(tab) {
  if (tab === 'history') {
    return {
      title: '历史订单',
      hint: '只显示已完成、已取消、售后已处理订单，数据不会删除。'
    }
  }
  return {
    title: '当前订单',
    hint: '默认显示未完成订单：已提交、待付款、已支付、待采摘、待打包、待发货/待自提、已送出、售后处理中。'
  }
}

function getAdminModuleTitle(tab) {
  const titles = {
    current: '当前订单',
    history: '历史订单',
    reminders: '开售提醒管理',
    points: '积分管理',
    products: '商品设置',
    delivery: '配送设置'
  }
  return titles[tab] || '管理后台'
}

function getReminderAuthLabel(auth) {
  const labels = {
    accept: '微信通知已授权',
    reject: '已登记，通知未授权',
    ban: '已登记，通知被关闭',
    failed: '已登记，授权调用失败',
    unavailable: '已登记，当前环境不支持',
    not_configured: '已登记，模板未配置',
    not_requested: '已登记，尚未申请通知'
  }
  return labels[auth] || labels.not_requested
}

function buildReminderSummary(records, config) {
  const reminderConfig = config.saleReminder || mockData.defaultSaleReminderConfig
  const year = Number(reminderConfig.reservationYear)
  const activeRecords = (Array.isArray(records) ? records : []).filter(function (item) {
    return item.status === 'active' && Number(item.reservationYear) === year
  })
  const varieties = (reminderConfig.varieties || []).map(function (variety) {
    return {
      label: variety,
      value: activeRecords.filter(function (item) {
        return item.varieties.indexOf('全部品种') >= 0 || item.varieties.indexOf(variety) >= 0
      }).length
    }
  })
  return {
    total: activeRecords.length,
    notificationAccepted: activeRecords.filter(function (item) {
      return item.notificationAuth === 'accept'
    }).length,
    notificationPending: activeRecords.filter(function (item) {
      return item.notificationAuth !== 'accept'
    }).length,
    varieties: varieties,
    records: activeRecords.map(function (item) {
      return Object.assign({}, item, {
        varietiesText: (item.varieties || []).join('、') || '未选择',
        notificationText: getReminderAuthLabel(item.notificationAuth)
      })
    })
  }
}

function emptyOrchardUpdate() {
  return {
    title: '',
    date: todayPrefix(),
    stage: '生长中',
    summary: '',
    mediaUrl: ''
  }
}

function orderMatchesSku(order, sku) {
  return order.skuId === sku.id || order.productId === sku.id || order.skuName === sku.name || order.productName === sku.name || (order.variety === sku.variety && order.spec === sku.spec)
}

function buildTodaySummary(orders) {
  const today = todayPrefix()
  const todayOrders = orders.filter(function (item) {
    return String(item.createdAt || '').indexOf(today) === 0
  })
  const sumQty = function (predicate) {
    return todayOrders.reduce(function (total, item) {
      if (!predicate(item)) {
        return total
      }
      return total + getQuantity(item)
    }, 0)
  }
  const sumField = function (field) {
    return todayOrders.reduce(function (total, item) {
      return total + (Number(item[field]) || 0)
    }, 0)
  }
  const sumTotalAmount = function () {
    return todayOrders.reduce(function (total, item) {
      return total + (Number(item.totalAmount) || Number(item.payAmount) || Number(item.productAmount) || Number(item.amount) || 0)
    }, 0)
  }
  const sumGiftBoxCount = function () {
    return todayOrders.reduce(function (total, item) {
      if (item.customWeightOrder) {
        return total + (Number(item.giftBoxCount) || Number(item.giftBox5Count) + Number(item.giftBox10Count) || 0)
      }
      if (item.needGiftBox === '是' || item.needGiftBox === '需要礼盒' || Number(item.giftBoxFee) > 0) {
        return total + (Number(item.quantity) || 0)
      }
      return total
    }, 0)
  }
  const countByDelivery = function (predicate) {
    return todayOrders.filter(predicate).length
  }
  const skuRows = mockData.skuOptions.map(function (sku) {
    return {
      label: sku.name + '箱数',
      value: sumQty(function (item) {
        return orderMatchesSku(item, sku)
      })
    }
  })

  return [
    { label: '总订单数', value: todayOrders.length },
    { label: '桂味斤数', value: formatMoney(sumField('guiweiWeight')) + '斤' },
    { label: '糯米糍斤数', value: formatMoney(sumField('nuomiciWeight')) + '斤' },
    { label: '总斤数', value: formatMoney(sumField('totalWeight')) + '斤' }
  ].concat(skuRows, [
    {
      label: '自提单数',
      value: countByDelivery(function (item) {
        return String(item.deliveryMethod || '').indexOf('自提') >= 0
      })
    },
    {
      label: '附近送单数',
      value: countByDelivery(function (item) {
        return String(item.deliveryMethod || '').indexOf('附近') >= 0
      })
    },
    {
      label: '快递单数',
      value: countByDelivery(isExpressOrder)
    },
    {
      label: '礼盒数量',
      value: sumGiftBoxCount()
    },
    {
      label: '礼盒费用',
      value: formatMoney(sumField('giftBoxFee')) + '元'
    },
    {
      label: '总价',
      value: formatMoney(sumTotalAmount()) + '元'
    }
  ])
}

function getSpecWeight(order) {
  const specText = firstValue([order.spec, order.fruitWeightText, order.specText, order.skuName, order.productName], '')
  if (String(specText).indexOf('10斤') >= 0) {
    return 10
  }
  if (String(specText).indexOf('5斤') >= 0) {
    return 5
  }
  return 0
}

function getFixedOrderWeight(order) {
  const quantity = Number(order.quantity) || Number(order.count) || 1
  return getSpecWeight(order) * quantity
}

function isGuiweiOrder(order) {
  return String(order.skuName || order.productName || order.variety || '').indexOf('桂味') >= 0
}

function isNuomiciOrder(order) {
  return String(order.skuName || order.productName || order.variety || '').indexOf('糯米糍') >= 0
}

function isPickupOrder(order) {
  return String(order.deliveryMethod || order.deliveryType || '').indexOf('自提') >= 0
}

function isNearbyOrder(order) {
  return String(order.deliveryMethod || order.deliveryType || '').indexOf('附近') >= 0
}

function sumGiftBoxBySpec(orders, spec) {
  return orders.reduce(function (total, order) {
    if (spec === '5斤装') {
      total += Number(order.giftBox5Count) || 0
    }
    if (spec === '10斤装') {
      total += Number(order.giftBox10Count) || 0
    }
    if (!order.customWeightOrder && (order.needGiftBox === '是' || order.needGiftBox === '需要礼盒') && String(order.spec || order.fruitWeightText || '').indexOf(spec.replace('装', '')) >= 0) {
      total += Number(order.quantity) || 1
    }
    return total
  }, 0)
}

function buildTodayStockSummary(orders) {
  const today = todayPrefix()
  const todayOrders = orders.filter(function (item) {
    return String(item.createdAt || '').indexOf(today) === 0
  })
  const guiweiWeight = todayOrders.reduce(function (total, item) {
    if (item.customWeightOrder) {
      return total + normalizeWeight(item.guiweiWeight)
    }
    return total + (isGuiweiOrder(item) ? getFixedOrderWeight(item) : 0)
  }, 0)
  const nuomiciWeight = todayOrders.reduce(function (total, item) {
    if (item.customWeightOrder) {
      return total + normalizeWeight(item.nuomiciWeight)
    }
    return total + (isNuomiciOrder(item) ? getFixedOrderWeight(item) : 0)
  }, 0)
  const totalWeight = todayOrders.reduce(function (total, item) {
    if (item.customWeightOrder) {
      return total + (normalizeWeight(item.totalWeight) || normalizeWeight(item.guiweiWeight) + normalizeWeight(item.nuomiciWeight))
    }
    return total + getFixedOrderWeight(item)
  }, 0)

  return [
    { label: '桂味总斤数', value: formatMoney(guiweiWeight) + '斤' },
    { label: '糯米糍总斤数', value: formatMoney(nuomiciWeight) + '斤' },
    { label: '总斤数', value: formatMoney(totalWeight) + '斤' },
    { label: '快递订单数', value: todayOrders.filter(isExpressOrder).length },
    { label: '自提订单数', value: todayOrders.filter(isPickupOrder).length },
    { label: '附近送订单数', value: todayOrders.filter(isNearbyOrder).length },
    { label: '5斤礼盒数量', value: sumGiftBoxBySpec(todayOrders, '5斤装') },
    { label: '10斤礼盒数量', value: sumGiftBoxBySpec(todayOrders, '10斤装') }
  ]
}

function buildDashboardData(orders) {
  const todayOrders = getOrdersByDateRange(orders, 'today')
  const yesterdayOrders = getOrdersByDateRange(orders, 'yesterday')
  const todayMetrics = reportGenerator.getReportMetrics(todayOrders)
  const yesterdayMetrics = reportGenerator.getReportMetrics(yesterdayOrders)
  const currentSales = todayMetrics.paidAmount
  const yesterdaySales = yesterdayMetrics.paidAmount
  let salesChange = '0%'
  let salesChangeClass = 'flat'

  if (yesterdaySales > 0) {
    const percent = Math.round(((currentSales - yesterdaySales) / yesterdaySales) * 1000) / 10
    salesChange = (percent > 0 ? '+' : '') + percent + '%'
    salesChangeClass = percent > 0 ? 'up' : (percent < 0 ? 'down' : 'flat')
  } else if (currentSales > 0) {
    salesChange = '+100%'
    salesChangeClass = 'up'
  }

  return {
    overview: [
      {
        label: '今日订单',
        value: todayOrders.length,
        unit: '单',
        tone: 'green'
      },
      {
        label: '待付款',
        value: todayOrders.filter(function (item) {
          return normalizeStatus(item.orderStatus) === '待付款'
        }).length,
        unit: '单',
        tone: 'red'
      },
      {
        label: '待发货',
        value: todayOrders.filter(function (item) {
          return ['待打包', '待发货/待自提'].indexOf(normalizeStatus(item.orderStatus)) >= 0
        }).length,
        unit: '单',
        tone: 'blue'
      },
      {
        label: '售后单',
        value: todayOrders.filter(function (item) {
          return normalizeStatus(item.orderStatus) === '售后处理中'
        }).length,
        unit: '单',
        tone: 'orange'
      }
    ],
    sales: {
      amount: toMoney(currentSales || 0).toFixed(2),
      change: salesChange,
      changeClass: salesChangeClass,
      updatedAt: storage.formatTime(new Date()).slice(11)
    }
  }
}

Page({
  data: {
    authorized: false,
    tabs: [
      { id: 'current', text: '当前订单' },
      { id: 'history', text: '历史订单' },
      { id: 'reminders', text: '开售提醒' },
      { id: 'points', text: '积分管理' },
      { id: 'products', text: '商品设置' },
      { id: 'delivery', text: '配送设置' }
    ],
    activeTab: 'dashboard',
    moduleTitle: '管理后台',
    statusBarHeight: 20,
    navigationBarHeight: 44,
    navigationRightInset: 96,
    dashboardOverview: [],
    dashboardSales: {
      amount: '0',
      change: '0%',
      changeClass: 'flat',
      updatedAt: ''
    },
    dashboardEntries: [
      { id: 'current', title: '当前订单', desc: '处理进行中的订单', icon: '单', tone: 'green' },
      { id: 'history', title: '历史订单', desc: '查看全部历史订单', icon: '史', tone: 'blue' },
      { id: 'reports', title: '订单报表', desc: '采摘 / 配送 / 对账 / 导出', icon: '表', tone: 'green' },
      { id: 'files', title: '文件中心', desc: '管理已生成报表文件', icon: '文', tone: 'orange' },
      { id: 'products', title: '商品设置', desc: '商品管理与价格设置', icon: '品', tone: 'purple' },
      { id: 'delivery', title: '配送设置', desc: '快递与自提配置', icon: '配', tone: 'green' },
      { id: 'coupons', title: '优惠券管理', desc: '创建 / 查看 / 发放优惠券', icon: '券', tone: 'red' },
      { id: 'afterSales', title: '售后管理', desc: '审核 / 补发 / 线下退款记录', icon: '后', tone: 'orange', badge: 0 },
      { id: 'reminders', title: '开售提醒管理', desc: '生长阶段 / 日期 / 果园动态', icon: '铃', tone: 'green' }
    ],
    configForm: {},
    priceRows: [],
    shippingFeeRows: [],
    varietyStockRows: [],
    varietyStockSummaryRows: [],
    skuStatusRows: [],
    productStats: [],
    productIssues: [],
    productPreviewRows: [],
    productPreviewExpanded: false,
    productCategoryCount: 0,
    productOperationLogs: [],
    productAdvancedExpanded: false,
    pickupTimeSlotRows: [],
    salesStatusLabels: mockData.salesStatuses.map(function (item) { return item.label }),
    salesStatusValues: mockData.salesStatuses.map(function (item) { return item.value }),
    orderStatuses: mockData.orderStatuses,
    orderStatusFilters: [
      { key: 'all', label: '全部当前' },
      { key: 'pendingPay', label: '待付款' },
      { key: 'processing', label: '待处理' },
      { key: 'shipped', label: '已送出' },
      { key: 'pendingPickup', label: '待自提' },
      { key: 'afterSale', label: '售后处理中' }
    ],
    activeOrderFilter: 'all',
    currentWorkbench: {
      totalActionCount: 0,
      overview: [],
      actions: []
    },
    historyOverview: [],
    historyKeyword: '',
    historyStatusOptions: ['全部状态', '已完成', '已取消', '售后已处理'],
    historyStatusIndex: 0,
    historyStartDate: todayPrefix(),
    historyEndDate: todayPrefix(),
    historyDateFilterActive: false,
    deliveryWorkbench: {
      enabledCount: 0,
      incompleteCount: 0,
      methods: []
    },
    deliveryEditPanel: '',
    nearbyAreasText: '',
    shippingFeeStatusOptions: mockData.shippingFeeStatusOptions,
    salesStatusIndex: 0,
    expandedOrderId: '',
    allOrders: [],
    orders: [],
    orderListTitle: '当前订单',
    orderListHint: '',
    todaySummaryRows: [],
    todayStockRows: [],
    exportSummaryRows: [],
    reportRangeOptions: ['今日', '昨日', '最近7天', '自定义日期范围'],
    reportRangeValues: ['today', 'yesterday', 'last7', 'custom'],
    reportRangeIndex: 0,
    customStartDate: todayPrefix(),
    customEndDate: todayPrefix(),
    reportRangeText: '今日',
    pointSummary: {
      availablePoints: 0,
      earnedPoints: 0,
      usedPoints: 0,
      records: [],
      rules: []
    },
    pointChangeTypes: ['增加', '扣减'],
    pointChangeTypeIndex: 0,
    pointForm: {
      changeType: '增加',
      points: '20',
      reason: '有效评价/反馈'
    },
    pointEditPanel: '',
    pointWorkbench: {
      healthy: true,
      overview: []
    },
    reminderStageOptions: mockData.reminderStages,
    reminderStageIndex: 0,
    reminderForm: clone(mockData.defaultSaleReminderConfig),
    reminderSummary: {
      total: 0,
      notificationAccepted: 0,
      notificationPending: 0,
      varieties: [],
      records: []
    },
    reminderEditPanel: '',
    reminderWorkbench: {
      businessStage: '未开售',
      stageLabels: [],
      metrics: [],
      latestUpdate: null
    },
    orchardUpdateForm: emptyOrchardUpdate()
  },

  onLoad: function () {
    let statusBarHeight = 20
    let navigationBarHeight = 44
    let navigationRightInset = 96
    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const menuRect = wx.getMenuButtonBoundingClientRect()
      statusBarHeight = Number(windowInfo.statusBarHeight) || statusBarHeight
      navigationBarHeight = Math.max(44, (menuRect.top - statusBarHeight) * 2 + menuRect.height)
      navigationRightInset = Math.max(88, Number(windowInfo.windowWidth) - menuRect.left + 8)
    } catch (error) {
      // Keep stable defaults when the simulator cannot provide capsule metrics.
    }
    this.setData({
      statusBarHeight: statusBarHeight,
      navigationBarHeight: navigationBarHeight,
      navigationRightInset: navigationRightInset
    })
  },

  onShow: function () {
    const config = storage.getConfig()
    if (!storage.hasAdminAccess(config)) {
      wx.showModal({
        title: '管理后台',
        content: '无权限访问',
        showCancel: false,
        success: returnToProfile
      })
      return
    }

    this.setData({ authorized: true })
    this.loadData()
  },

  loadData: function () {
    const config = storage.getConfig()
    const rawOrders = storage.getOrders()
    const reportRange = this.data.reportRangeValues[this.data.reportRangeIndex] || 'today'
    const reportOrders = getOrdersByDateRange(rawOrders, reportRange, this.data.customStartDate, this.data.customEndDate)
    const reportRangeText = getReportRangeText(reportRange, this.data.customStartDate, this.data.customEndDate)
    const dashboard = buildDashboardData(rawOrders)
    const productWorkbench = buildProductWorkbench(config)
    const pendingAfterSaleCount = storage.getAfterSales().filter(function (item) {
      return item.status === 'pending'
    }).length
    const expandedOrderId = this.data.expandedOrderId
    const allOrders = rawOrders.map(function (item) {
      return normalizeOrder(item, expandedOrderId)
    })
    const pointSummary = storage.getPointSummary()
    const reminderRecords = storage.getSaleReminderRecords()
    const reminderSummary = buildReminderSummary(reminderRecords, config)
    const meta = getOrderListMeta(this.data.activeTab)
    const tabOrders = getOrdersByTab(allOrders, this.data.activeTab)
    const selectedHistoryStatus = this.data.historyStatusOptions[this.data.historyStatusIndex]
    const visibleOrders = this.data.activeTab === 'current'
      ? filterCurrentOrders(tabOrders, this.data.activeOrderFilter)
      : (this.data.activeTab === 'history'
        ? filterHistoryOrders(
          allOrders,
          this.data.historyKeyword,
          selectedHistoryStatus,
          this.data.historyStartDate,
          this.data.historyEndDate,
          this.data.historyDateFilterActive
        )
        : tabOrders)

    this.setData({
      configForm: clone(config),
      dashboardOverview: dashboard.overview,
      dashboardSales: dashboard.sales,
      dashboardEntries: this.data.dashboardEntries.map(function (item) {
        return item.id === 'afterSales'
          ? Object.assign({}, item, { badge: pendingAfterSaleCount })
          : item
      }),
      priceRows: buildPriceRows(config),
      shippingFeeRows: buildShippingFeeRows(config),
      varietyStockRows: buildVarietyStockRows(config),
      varietyStockSummaryRows: buildVarietyStockSummaryRows(config, rawOrders),
      skuStatusRows: buildSkuStatusRows(config),
      productStats: productWorkbench.stats,
      productIssues: productWorkbench.issues,
      productPreviewRows: productWorkbench.rows,
      productCategoryCount: productWorkbench.categoryCount,
      productOperationLogs: getProductOperationLogs(),
      pickupTimeSlotRows: buildPickupTimeSlotRows(config),
      salesStatusIndex: indexOfValue(this.data.salesStatusValues, config.salesStatus),
      allOrders: allOrders,
      orders: visibleOrders,
      currentWorkbench: buildCurrentOrderWorkbench(allOrders),
      historyOverview: buildHistoryOverview(allOrders),
      deliveryWorkbench: buildDeliveryWorkbench(config),
      nearbyAreasText: ((config.nearbyDelivery || {}).supportedAreas || []).join('、'),
      orderListTitle: meta.title,
      orderListHint: meta.hint,
      todaySummaryRows: buildTodaySummary(rawOrders),
      todayStockRows: buildTodayStockSummary(rawOrders),
      exportSummaryRows: reportGenerator.generateReportOverview(reportOrders),
      reportRangeText: reportRangeText,
      pointSummary: pointSummary,
      pointWorkbench: buildPointWorkbench(pointSummary),
      reminderForm: clone(config.saleReminder || mockData.defaultSaleReminderConfig),
      reminderStageIndex: indexOfValue(mockData.reminderStages, (config.saleReminder || {}).currentStage),
      reminderSummary: reminderSummary,
      reminderWorkbench: buildReminderWorkbench(reminderRecords, config)
    })
  },

  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab
    const meta = getOrderListMeta(tab)
    const nextFilter = tab === 'current' ? this.data.activeOrderFilter : 'all'
    const tabOrders = getOrdersByTab(this.data.allOrders, tab)
    this.setData({
      activeTab: tab,
      moduleTitle: getAdminModuleTitle(tab),
      activeOrderFilter: nextFilter,
      orders: tab === 'current'
        ? filterCurrentOrders(tabOrders, nextFilter)
        : (tab === 'history'
          ? filterHistoryOrders(
            this.data.allOrders,
            this.data.historyKeyword,
            this.data.historyStatusOptions[this.data.historyStatusIndex],
            this.data.historyStartDate,
            this.data.historyEndDate,
            this.data.historyDateFilterActive
          )
          : tabOrders),
      orderListTitle: meta.title,
      orderListHint: meta.hint
    })
  },

  backToDashboard: function () {
    this.setData({
      activeTab: 'dashboard',
      moduleTitle: '管理后台',
      expandedOrderId: ''
    })
    this.loadData()
  },

  goBack: function () {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({
        delta: 1,
        fail: this.backToDashboard.bind(this)
      })
      return
    }
    this.backToDashboard()
  },

  openDashboardEntry: function (e) {
    const id = e.currentTarget.dataset.id
    if (id === 'reports') {
      wx.navigateTo({ url: '/pages/admin-reports/admin-reports' })
      return
    }
    if (id === 'coupons') {
      this.openCouponAdmin()
      return
    }
    if (id === 'afterSales') {
      wx.navigateTo({ url: '/pages/admin-after-sales/admin-after-sales' })
      return
    }
    if (id === 'files') {
      wx.showToast({
        title: '文件中心开发中',
        icon: 'none'
      })
      return
    }
    const meta = getOrderListMeta(id)
    const tabOrders = getOrdersByTab(this.data.allOrders, id)
    this.setData({
      activeTab: id,
      moduleTitle: getAdminModuleTitle(id),
      activeOrderFilter: 'all',
      orders: id === 'current'
        ? filterCurrentOrders(tabOrders, 'all')
        : (id === 'history'
          ? filterHistoryOrders(
            this.data.allOrders,
            this.data.historyKeyword,
            this.data.historyStatusOptions[this.data.historyStatusIndex],
            this.data.historyStartDate,
            this.data.historyEndDate,
            this.data.historyDateFilterActive
          )
          : tabOrders),
      orderListTitle: meta.title,
      orderListHint: meta.hint
    })
  },

  switchOrderFilter: function (e) {
    const filter = e.currentTarget.dataset.filter || 'all'
    const tabOrders = getOrdersByTab(this.data.allOrders, 'current')
    this.setData({
      activeOrderFilter: filter,
      orders: filterCurrentOrders(tabOrders, filter)
    })
  },

  switchOrderQuickAction: function (e) {
    const filter = e.currentTarget.dataset.filter || 'all'
    this.switchOrderFilter({
      currentTarget: {
        dataset: {
          filter: filter
        }
      }
    })
    wx.pageScrollTo({
      selector: '#current-order-list',
      duration: 240
    })
  },

  handleHistoryKeywordInput: function (e) {
    this.setData({
      historyKeyword: e.detail.value
    })
  },

  handleHistoryStatusChange: function (e) {
    this.setData({
      historyStatusIndex: Number(e.detail.value)
    }, this.applyHistoryFilters)
  },

  handleHistoryDateChange: function (e) {
    const field = e.currentTarget.dataset.field
    const patch = {
      historyDateFilterActive: true
    }
    patch[field] = e.detail.value
    this.setData(patch, this.applyHistoryFilters)
  },

  applyHistoryFilters: function () {
    const status = this.data.historyStatusOptions[this.data.historyStatusIndex]
    let startDate = this.data.historyStartDate
    let endDate = this.data.historyEndDate
    if (startDate > endDate) {
      const temporaryDate = startDate
      startDate = endDate
      endDate = temporaryDate
      this.setData({
        historyStartDate: startDate,
        historyEndDate: endDate
      })
    }
    this.setData({
      orders: filterHistoryOrders(
        this.data.allOrders,
        this.data.historyKeyword,
        status,
        startDate,
        endDate,
        this.data.historyDateFilterActive
      )
    })
  },

  clearHistoryFilters: function () {
    this.setData({
      historyKeyword: '',
      historyStatusIndex: 0,
      historyDateFilterActive: false,
      orders: getOrdersByTab(this.data.allOrders, 'history')
    })
  },

  clearHistoryDateFilter: function () {
    this.setData({
      historyDateFilterActive: false
    }, this.applyHistoryFilters)
  },

  remindPayment: function (e) {
    const id = e.currentTarget.dataset.id
    const order = this.data.allOrders.find(function (item) {
      return item.id === id
    }) || {}
    wx.showModal({
      title: '付款提醒',
      content: '当前为线下联系模式，请通过客服微信或电话联系 ' + (order.recipientNameText || '客户') + '（' + (order.phoneText || '未填写手机号') + '）确认库存和付款。',
      showCancel: false
    })
  },

  confirmAdminOrder: function (e) {
    const id = e.currentTarget.dataset.id
    const that = this
    wx.showModal({
      title: '确认订单',
      content: '确认库存无误并将订单进入待采摘状态？',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        that.updateAdminOrder(id, {
          orderStatus: '待采摘',
          confirmedAt: storage.formatTime(new Date())
        }, '订单已确认')
      }
    })
  },

  openDeliveryPanel: function (e) {
    const panel = e.currentTarget.dataset.panel || ''
    this.setData({
      deliveryEditPanel: this.data.deliveryEditPanel === panel ? '' : panel
    })
  },

  handleDeliveryConfigInput: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['configForm.' + field]: e.detail.value
    })
  },

  handleNearbyAreasInput: function (e) {
    this.setData({
      nearbyAreasText: e.detail.value
    })
  },

  openReminderPanel: function (e) {
    const panel = e.currentTarget.dataset.panel || ''
    this.setData({
      reminderEditPanel: this.data.reminderEditPanel === panel ? '' : panel
    })
  },

  enableReminderReservation: function () {
    this.setData({
      'reminderForm.reservationOpen': true
    })
    this.saveReminderSettings()
  },

  showReminderSendInfo: function () {
    wx.showModal({
      title: '发送开售提醒',
      content: '当前是本机演示模式，尚未接入云函数和共享预约数据，不能从前端伪造发送成功。接入云服务后可在这里执行真实发送。',
      showCancel: false
    })
  },

  markReminderSoldOut: function () {
    const that = this
    wx.showModal({
      title: '标记本季售罄',
      content: '确认后用户端将显示本季售罄，并停止本季预约入口。',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        that.setData({
          'reminderForm.currentStage': '本季售罄',
          'reminderForm.reservationOpen': false
        })
        that.saveReminderSettings()
      }
    })
  },

  openPointPanel: function (e) {
    const panel = e.currentTarget.dataset.panel || ''
    this.setData({
      pointEditPanel: this.data.pointEditPanel === panel ? '' : panel
    })
  },

  showPointUserInfo: function () {
    wx.showModal({
      title: '用户积分查询',
      content: '当前积分数据仅保存在本机，没有共享用户数据库，因此只能查看本机演示账户。正式上线后需按 OpenID 查询各用户积分。',
      showCancel: false
    })
  },

  toggleOrderDetail: function (e) {
    const id = e.currentTarget.dataset.id
    const expandedOrderId = this.data.expandedOrderId === id ? '' : id
    this.setData({
      expandedOrderId: expandedOrderId
    })
    this.loadData()
  },

  handleTopInput: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['configForm.' + field]: e.detail.value
    })
  },

  handleReminderInput: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['reminderForm.' + field]: e.detail.value
    })
  },

  handleReminderStageChange: function (e) {
    const index = Number(e.detail.value)
    this.setData({
      reminderStageIndex: index,
      'reminderForm.currentStage': this.data.reminderStageOptions[index]
    })
  },

  handleReminderOpenChange: function (e) {
    this.setData({
      'reminderForm.reservationOpen': !!e.detail.value
    })
  },

  handleOrchardUpdateInput: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['orchardUpdateForm.' + field]: e.detail.value
    })
  },

  handleOrchardUpdateStage: function (e) {
    this.setData({
      'orchardUpdateForm.stage': this.data.reminderStageOptions[Number(e.detail.value)]
    })
  },

  publishOrchardUpdate: function () {
    const form = this.data.orchardUpdateForm
    if (!String(form.title || '').trim() || !String(form.summary || '').trim()) {
      wx.showToast({
        title: '请填写动态标题和说明',
        icon: 'none'
      })
      return
    }
    const reminderForm = clone(this.data.reminderForm)
    const updates = Array.isArray(reminderForm.orchardUpdates) ? reminderForm.orchardUpdates.slice() : []
    updates.unshift(Object.assign({}, form, {
      id: 'UPDATE' + Date.now(),
      title: String(form.title).trim(),
      summary: String(form.summary).trim(),
      mediaUrl: String(form.mediaUrl || '').trim()
    }))
    reminderForm.orchardUpdates = updates
    this.setData({
      reminderForm: reminderForm,
      orchardUpdateForm: emptyOrchardUpdate()
    })
    this.saveReminderSettings()
  },

  removeOrchardUpdate: function (e) {
    const id = e.currentTarget.dataset.id
    const reminderForm = clone(this.data.reminderForm)
    reminderForm.orchardUpdates = (reminderForm.orchardUpdates || []).filter(function (item) {
      return item.id !== id
    })
    this.setData({
      reminderForm: reminderForm
    })
    this.saveReminderSettings()
  },

  saveReminderSettings: function () {
    const config = storage.getConfig()
    const reminderForm = clone(this.data.reminderForm)
    reminderForm.reservationYear = Number(reminderForm.reservationYear) || 2027
    reminderForm.lastUpdated = reminderForm.lastUpdated || todayPrefix()
    config.saleReminder = reminderForm
    storage.saveConfig(config)
    this.loadData()
    wx.showToast({
      title: '提醒配置已保存',
      icon: 'success'
    })
  },

  handlePriceInput: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      ['priceRows[' + index + '].value']: e.detail.value
    })
  },

  handleShippingFeeInput: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      ['shippingFeeRows[' + index + '].value']: e.detail.value
    })
  },

  handleSkuStatusSwitch: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    this.setData({
      ['skuStatusRows[' + index + '].' + field]: e.detail.value
    })
  },

  handleVarietyStockInput: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      ['varietyStockRows[' + index + '].value']: e.detail.value
    })
  },

  refreshProductWorkbench: function () {
    this.loadData()
    wx.showToast({
      title: '商品数据已刷新',
      icon: 'none'
    })
  },

  toggleProductPreview: function () {
    this.setData({
      productPreviewExpanded: !this.data.productPreviewExpanded
    })
  },

  openProductPanel: function (e) {
    const panel = e.currentTarget.dataset.panel
    const selectorMap = {
      preview: '#product-preview-panel',
      status: '#product-status-panel',
      price: '#product-price-panel'
    }
    const selector = selectorMap[panel]
    if (!selector) {
      return
    }
    if (panel === 'preview') {
      this.setData({ productPreviewExpanded: true })
    }
    setTimeout(function () {
      wx.pageScrollTo({
        selector: selector,
        duration: 260
      })
    }, 30)
  },

  showProductCategoryInfo: function () {
    wx.showModal({
      title: '分类概览',
      content: '当前商品按桂味、糯米糍、混装共 ' + this.data.productCategoryCount + ' 类固定 SKU 管理。当前版本未提供可编辑分类，避免显示不能保存的假功能。',
      showCancel: false
    })
  },

  toggleProductAdvanced: function () {
    this.setData({
      productAdvancedExpanded: !this.data.productAdvancedExpanded
    })
  },

  handlePickupSlotInput: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      ['pickupTimeSlotRows[' + index + '].value']: e.detail.value
    })
  },

  addPickupSlot: function () {
    const rows = this.data.pickupTimeSlotRows.concat([{ value: '' }])
    this.setData({ pickupTimeSlotRows: rows })
  },

  removePickupSlot: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const rows = this.data.pickupTimeSlotRows.filter(function (item, itemIndex) {
      return itemIndex !== index
    })
    this.setData({ pickupTimeSlotRows: rows.length ? rows : [{ value: '' }] })
  },

  handleReportRangeChange: function (e) {
    const index = Number(e.detail.value)
    this.setData({
      reportRangeIndex: index
    })
    this.loadData()
  },

  handleReportDateChange: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      [field]: e.detail.value
    })
    this.loadData()
  },

  handlePointInput: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['pointForm.' + field]: e.detail.value
    })
  },

  handlePointTypeChange: function (e) {
    const index = Number(e.detail.value)
    this.setData({
      pointChangeTypeIndex: index,
      'pointForm.changeType': this.data.pointChangeTypes[index]
    })
  },

  handleStatusChange: function (e) {
    const index = Number(e.detail.value)
    this.setData({
      salesStatusIndex: index,
      'configForm.salesStatus': this.data.salesStatusValues[index]
    })
  },

  normalizeConfig: function () {
    const config = clone(this.data.configForm)
    const prices = {}
    const shippingFees = {}
    const varietyStock = {}
    const skuStatusMap = {}
    this.data.priceRows.forEach(function (item) {
      prices[item.key] = Number(item.value) || 0
    })
    this.data.shippingFeeRows.forEach(function (item) {
      shippingFees[item.key] = Number(item.value) || 0
    })
    this.data.varietyStockRows.forEach(function (item) {
      varietyStock[item.key] = normalizeStockWeight(item.value)
    })
    this.data.skuStatusRows.forEach(function (item) {
      skuStatusMap[item.id] = {
        isListed: item.isListed !== false,
        isSoldOut: item.isSoldOut === true
      }
    })
    config.prices = prices
    config.shippingFees = shippingFees
    config.varietyStock = varietyStock
    config.skuStatusMap = skuStatusMap
    config.pickupTimeSlots = this.data.pickupTimeSlotRows.map(function (item) {
      return String(item.value || '').trim()
    }).filter(function (item) {
      return !!item
    })
    if (!config.pickupTimeSlots.length) {
      config.pickupTimeSlots = clone(mockData.defaultConfig.pickupTimeSlots)
    }
    config.nearbyDelivery = config.nearbyDelivery || {}
    config.nearbyDelivery.supportedAreas = String(this.data.nearbyAreasText || '').split(/[、,，\n]/).map(function (item) {
      return item.trim()
    }).filter(function (item) {
      return !!item
    })
    if (typeof config.adminOpenidWhitelist === 'string') {
      config.adminOpenidWhitelist = config.adminOpenidWhitelist.split(/[\n,，]/).map(function (item) {
        return item.trim()
      }).filter(function (item) {
        return !!item
      })
    }
    config.isAdminMock = parseBooleanText(config.isAdminMock)
    config.adminAuthMode = config.adminAuthMode === 'openid' ? 'openid' : 'mock'
    return config
  },

  saveConfigOnly: function () {
    const previousConfig = storage.getConfig()
    const nextConfig = this.normalizeConfig()
    const operationText = describeProductConfigChanges(previousConfig, nextConfig)
    const config = storage.saveConfig(nextConfig)
    if (!storage.isAdminUser(config)) {
      storage.clearAdminSession()
      wx.showModal({
        title: '管理员权限已关闭',
        content: '当前账号已不再具备后台权限。',
        showCancel: false,
        success: returnToProfile
      })
      return
    }
    if (this.data.activeTab === 'products') {
      recordProductOperation(operationText)
    }
    this.loadData()
    wx.showToast({ title: '已保存配置', icon: 'success' })
  },

  handleOrderInput: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    const order = Object.assign({}, this.data.orders[index], {
      [field]: e.detail.value
    })
    const nextOrder = normalizeOrder(order.isExpress ? applyShippingSettlement(order) : order, this.data.expandedOrderId)
    this.setData({
      ['orders[' + index + ']']: nextOrder
    })
  },

  handleOrderPicker: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    const optionIndex = Number(e.detail.value)
    const maps = {
      orderStatus: this.data.orderStatuses,
      shippingFeeStatus: this.data.shippingFeeStatusOptions
    }
    const indexFields = {
      orderStatus: 'statusIndex',
      shippingFeeStatus: 'shippingFeeStatusIndex'
    }
    const order = Object.assign({}, this.data.orders[index], {
      [field]: maps[field][optionIndex],
      [indexFields[field]]: optionIndex
    })
    const nextOrder = normalizeOrder(order.isExpress ? applyShippingSettlement(order) : order, this.data.expandedOrderId)
    this.setData({
      ['orders[' + index + ']']: nextOrder
    })
  },

  saveOrder: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const currentOrder = this.data.orders[index]
    const order = currentOrder.isExpress ? applyShippingSettlement(currentOrder) : currentOrder
    const patch = {
      orderStatus: order.orderStatus || '已提交',
      trackingNo: order.trackingNo || '',
      actualShippingFee: order.actualShippingFee || '',
      shipTime: order.shipTime || '',
      serviceNote: order.serviceNote || ''
    }

    if (order.orderStatus === '已支付' && !currentOrder.paidAt) {
      patch.paidAt = storage.formatTime(new Date())
      patch.confirmedBy = currentOrder.confirmedBy || '后台确认'
    }
    if (order.orderStatus === '已送出' && !currentOrder.shippedAt) {
      patch.shippedAt = storage.formatTime(new Date())
    }
    if (order.orderStatus === '已完成' && !currentOrder.completedAt) {
      patch.completedAt = storage.formatTime(new Date())
    }
    if (order.orderStatus === '已取消' && !currentOrder.canceledAt) {
      patch.canceledAt = storage.formatTime(new Date())
    }
    if (order.orderStatus === '售后处理中' && !currentOrder.afterSaleAt) {
      patch.afterSaleAt = storage.formatTime(new Date())
    }
    if (order.orderStatus === '售后已处理' && !currentOrder.afterSaleHandledAt) {
      patch.afterSaleHandledAt = storage.formatTime(new Date())
    }

    if (order.isExpress) {
      Object.assign(patch, {
        fruitWeightText: order.fruitWeightText || order.specText,
        estimatedCourierWeight: order.estimatedCourierWeight || getCourierWeight(order.specText),
        estimatedShippingFee: order.estimatedShippingFee || '',
        freightAmount: order.estimatedShippingFee || order.freightAmount || '',
        shippingFeeDiff: order.shippingFeeDiff || '',
        refundShippingFee: order.refundShippingFee || '',
        absorbedShippingDiff: order.absorbedShippingDiff || '',
        shippingFeeStatus: order.shippingFeeStatus || '未确认'
      })
    }

    storage.updateOrder(order.id, patch)
    this.loadData()
    wx.showToast({ title: '订单已保存', icon: 'success' })
  },

  updateAdminOrder: function (id, patch, message) {
    storage.updateOrder(id, patch)
    this.loadData()
    wx.showToast({ title: message || '已更新订单', icon: 'success' })
  },

  confirmPickupOrder: function (e) {
    const id = e.currentTarget.dataset.id
    this.updateAdminOrder(id, {
      orderStatus: '已完成',
      pickedUpAt: storage.formatTime(new Date()),
      completedAt: storage.formatTime(new Date())
    }, '已确认自提')
  },

  inputTrackingNo: function (e) {
    const id = e.currentTarget.dataset.id
    const current = this.data.allOrders.find(function (item) {
      return item.id === id
    }) || {}
    const that = this
    wx.showModal({
      title: '顺丰单号',
      content: current.trackingNo || '',
      editable: true,
      placeholderText: '请输入顺丰单号',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        that.updateAdminOrder(id, {
          trackingNo: res.content || ''
        }, '已保存单号')
      }
    })
  },

  markExpressShipped: function (e) {
    const id = e.currentTarget.dataset.id
    this.updateAdminOrder(id, {
      orderStatus: '已送出',
      shippedAt: storage.formatTime(new Date()),
      shipTime: storage.formatTime(new Date())
    }, '已标记发货')
  },

  markNearbyDelivered: function (e) {
    const id = e.currentTarget.dataset.id
    this.updateAdminOrder(id, {
      orderStatus: '已送出',
      deliveredAt: storage.formatTime(new Date())
    }, '已标记送出')
  },

  closePendingOrder: function (e) {
    const id = e.currentTarget.dataset.id
    const that = this
    wx.showModal({
      title: '取消订单',
      content: '确认取消这个待付款订单？',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        that.updateAdminOrder(id, {
          orderStatus: '已取消',
          canceledAt: storage.formatTime(new Date())
        }, '订单已取消')
      }
    })
  },

  markAfterSaleProcessing: function (e) {
    wx.navigateTo({ url: '/pages/admin-after-sales/admin-after-sales' })
  },

  markAfterSaleHandled: function (e) {
    wx.navigateTo({ url: '/pages/admin-after-sales/admin-after-sales' })
  },

  getSelectedReportOrders: function () {
    const range = this.data.reportRangeValues[this.data.reportRangeIndex] || 'today'
    return getOrdersByDateRange(storage.getOrders(), range, this.data.customStartDate, this.data.customEndDate)
  },

  getReportFilePart: function () {
    return this.data.reportRangeText.replace(/\s+/g, '').replace(/至/g, '_')
  },

  openReportPreview: function (type) {
    const range = this.data.reportRangeValues[this.data.reportRangeIndex] || 'today'
    const query = [
      'type=' + encodeURIComponent(type || 'order'),
      'range=' + encodeURIComponent(range),
      'startDate=' + encodeURIComponent(this.data.customStartDate),
      'endDate=' + encodeURIComponent(this.data.customEndDate)
    ].join('&')
    wx.navigateTo({
      url: '/pages/report-preview/report-preview?' + query
    })
  },

  generateOrderDetailCSV: function () {
    this.openReportPreview('order')
  },

  generateHarvestSummaryCSV: function () {
    this.openReportPreview('harvest')
  },

  generateDeliveryCSV: function () {
    this.openReportPreview('delivery')
  },

  generateFinanceCSV: function () {
    this.openReportPreview('finance')
  },

  submitPointAdjustment: function () {
    const form = this.data.pointForm
    const rawPoints = Number(form.points)
    if (!rawPoints || rawPoints < 0) {
      wx.showToast({ title: '请填写积分数量', icon: 'none' })
      return
    }
    const reason = (form.reason || '').trim()
    if (!reason) {
      wx.showToast({ title: '请填写调整原因', icon: 'none' })
      return
    }
    const points = form.changeType === '扣减' ? -Math.abs(rawPoints) : Math.abs(rawPoints)
    const result = storage.adjustPoints(points, reason)
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }
    this.setData({
      pointForm: {
        changeType: '增加',
        points: '20',
        reason: '有效评价/反馈'
      },
      pointChangeTypeIndex: 0
    })
    this.loadData()
    wx.showToast({ title: '积分已调整', icon: 'success' })
  },

  fastSetStatus: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const status = e.currentTarget.dataset.status
    const order = normalizeOrder(Object.assign({}, this.data.orders[index], {
      orderStatus: status,
      statusIndex: indexOfValue(mockData.orderStatuses, status)
    }), this.data.expandedOrderId)
    this.setData({
      ['orders[' + index + ']']: order
    })
  },

  refreshData: function () {
    this.loadData()
    wx.showToast({ title: '已刷新', icon: 'success' })
  },

  openCouponAdmin: function () {
    wx.navigateTo({ url: '/pages/admin-coupons/admin-coupons' })
  }
})
