const mockData = require('./mockData')

const STOCK_ERROR_MESSAGE = '当前库存不足，请调整数量或联系果园确认。'

const OCCUPYING_STATUSES = [
  '已提交',
  '待付款',
  '待支付',
  '已付款',
  '已支付',
  '待处理',
  '待采摘',
  '采摘/备货中',
  '待打包',
  '待发货',
  '待配送',
  '待配送/待自提',
  '待发货/待自提',
  '待自提',
  '已送出',
  '已发货',
  '已自提',
  '已完成',
  '售后处理中',
  'pending_payment',
  'pendingPay',
  'paid',
  'pending_handle',
  'preparing',
  'packed',
  'shipped',
  'picked_up',
  'completed',
  'after_sale'
]

const CANCELLED_STATUSES = [
  '已取消',
  '已关闭',
  'cancelled',
  'closed'
]

function roundWeight(value) {
  const number = Number(value)
  if (!isFinite(number) || number <= 0) {
    return 0
  }
  return Math.round(number * 10) / 10
}

function normalizeStockLimit(value) {
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

function normalizeQuantity(value) {
  const number = parseInt(value, 10)
  if (!number || number < 1) {
    return 1
  }
  return number
}

function textOf(value) {
  return String(value || '')
}

function getSkuById(skuId) {
  return mockData.skuOptions.find(function (item) {
    return item.id === skuId
  }) || null
}

function getOrderText(order) {
  const sku = getSkuById(order && order.skuId)
  return [
    order && order.skuId,
    order && order.productName,
    order && order.skuName,
    order && order.productSkuName,
    order && order.variety,
    sku && sku.id,
    sku && sku.name,
    sku && sku.variety
  ].map(textOf).join(' ')
}

function getSpecText(order) {
  const sku = getSkuById(order && order.skuId)
  return textOf((order && order.spec) || (sku && sku.spec) || (order && order.fruitWeightText))
}

function getSpecWeight(specText) {
  const text = textOf(specText)
  if (text.indexOf('10') >= 0) {
    return 10
  }
  if (text.indexOf('5') >= 0) {
    return 5
  }
  return 0
}

function getTotalWeight(order) {
  const explicitTotal = roundWeight(order && order.totalWeight)
  if (explicitTotal) {
    return explicitTotal
  }
  const specWeight = getSpecWeight(getSpecText(order))
  return roundWeight(specWeight * normalizeQuantity(order && order.quantity))
}

function isMixedOrder(order) {
  const text = getOrderText(order)
  return text.indexOf('混装') >= 0 || text.indexOf('mixed') >= 0
}

function isGuiweiOrder(order) {
  const text = getOrderText(order)
  return text.indexOf('桂味') >= 0 || text.indexOf('guiwei') >= 0
}

function isNuomiciOrder(order) {
  const text = getOrderText(order)
  return text.indexOf('糯米') >= 0 || text.indexOf('nuomici') >= 0 || text.indexOf('nuomi') >= 0
}

function getOrderVarietyWeights(order) {
  const guiweiWeight = roundWeight(order && order.guiweiWeight)
  const nuomiciWeight = roundWeight(order && order.nuomiciWeight)

  if (guiweiWeight || nuomiciWeight) {
    return {
      guiweiWeight: guiweiWeight,
      nuomiciWeight: nuomiciWeight
    }
  }

  const totalWeight = getTotalWeight(order)
  if (!totalWeight) {
    return {
      guiweiWeight: 0,
      nuomiciWeight: 0
    }
  }

  if (isMixedOrder(order)) {
    const half = Math.round(totalWeight * 5) / 10
    return {
      guiweiWeight: half,
      nuomiciWeight: roundWeight(totalWeight - half)
    }
  }

  if (isNuomiciOrder(order)) {
    return {
      guiweiWeight: 0,
      nuomiciWeight: totalWeight
    }
  }

  if (isGuiweiOrder(order)) {
    return {
      guiweiWeight: totalWeight,
      nuomiciWeight: 0
    }
  }

  return {
    guiweiWeight: 0,
    nuomiciWeight: 0
  }
}

function shouldCountOrder(order) {
  const status = textOf((order && (order.orderStatus || order.status || order.state))).trim()
  if (CANCELLED_STATUSES.indexOf(status) >= 0) {
    return false
  }
  return OCCUPYING_STATUSES.indexOf(status) >= 0
}

function buildSummary(limitValue, used) {
  const stockLimit = normalizeStockLimit(limitValue)
  const stockSet = stockLimit !== ''
  const usedWeight = roundWeight(used)
  const remaining = stockSet ? Math.max(0, roundWeight(stockLimit - usedWeight)) : ''

  return {
    stockSet: stockSet,
    stockLimit: stockLimit,
    stockText: stockSet ? formatWeight(stockLimit) : '未设置',
    used: usedWeight,
    usedText: formatWeight(usedWeight),
    remaining: remaining,
    remainingText: stockSet ? formatWeight(remaining) : '不限',
    autoSoldOut: stockSet && remaining <= 0
  }
}

function calculateStockUsage(config, orders) {
  const list = Array.isArray(orders) ? orders : []
  const totals = list.reduce(function (result, order) {
    if (!shouldCountOrder(order)) {
      return result
    }
    const weights = getOrderVarietyWeights(order)
    result.guiwei += weights.guiweiWeight
    result.nuomici += weights.nuomiciWeight
    return result
  }, { guiwei: 0, nuomici: 0 })
  const varietyStock = (config && config.varietyStock) || {}

  return {
    guiwei: buildSummary(varietyStock.guiweiWeight, totals.guiwei),
    nuomici: buildSummary(varietyStock.nuomiciWeight, totals.nuomici)
  }
}

function getSkuStockState(config, orders, sku, quantity) {
  const usage = calculateStockUsage(config, orders)
  const required = getOrderVarietyWeights(Object.assign({}, sku || {}, {
    skuId: sku && sku.id,
    quantity: normalizeQuantity(quantity)
  }))
  const perBox = getOrderVarietyWeights(Object.assign({}, sku || {}, {
    skuId: sku && sku.id,
    quantity: 1
  }))
  let disabled = false
  let maxQuantity = Infinity

  function check(summary, requiredWeight, perBoxWeight) {
    if (!summary.stockSet || !perBoxWeight) {
      return
    }
    const maxByVariety = Math.floor((Number(summary.remaining) || 0) / perBoxWeight)
    maxQuantity = Math.min(maxQuantity, maxByVariety)
    if ((Number(summary.remaining) || 0) < requiredWeight) {
      disabled = true
    }
  }

  check(usage.guiwei, required.guiweiWeight, perBox.guiweiWeight)
  check(usage.nuomici, required.nuomiciWeight, perBox.nuomiciWeight)

  return {
    disabled: disabled,
    reason: disabled ? '库存不足' : '',
    maxQuantity: maxQuantity === Infinity ? '' : Math.max(0, maxQuantity),
    usage: usage
  }
}

function validateOrderStock(config, orders, order) {
  const usage = calculateStockUsage(config, orders)
  const required = getOrderVarietyWeights(order)

  if (usage.guiwei.stockSet && required.guiweiWeight > (Number(usage.guiwei.remaining) || 0)) {
    return {
      ok: false,
      message: STOCK_ERROR_MESSAGE,
      usage: usage
    }
  }

  if (usage.nuomici.stockSet && required.nuomiciWeight > (Number(usage.nuomici.remaining) || 0)) {
    return {
      ok: false,
      message: STOCK_ERROR_MESSAGE,
      usage: usage
    }
  }

  return {
    ok: true,
    message: '',
    usage: usage
  }
}

function formatWeight(value) {
  const number = Number(value)
  if (!isFinite(number)) {
    return '0斤'
  }
  return String(Math.round(number * 10) / 10) + '斤'
}

module.exports = {
  STOCK_ERROR_MESSAGE: STOCK_ERROR_MESSAGE,
  calculateStockUsage: calculateStockUsage,
  formatWeight: formatWeight,
  getOrderVarietyWeights: getOrderVarietyWeights,
  getSkuStockState: getSkuStockState,
  normalizeStockLimit: normalizeStockLimit,
  shouldCountOrder: shouldCountOrder,
  validateOrderStock: validateOrderStock
}
