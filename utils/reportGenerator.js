function firstValue(values, fallback) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value !== '' && value !== null && typeof value !== 'undefined') {
      return value
    }
  }
  return typeof fallback === 'undefined' ? '' : fallback
}

function toMoney(value) {
  const number = Number(value)
  if (isNaN(number) || number < 0) {
    return 0
  }
  return Math.round(number * 100) / 100
}

function normalizeWeight(value) {
  const number = parseFloat(value)
  if (!number || number < 0) {
    return 0
  }
  return Math.round(number * 10) / 10
}

function formatNumber(value) {
  const number = Number(value)
  if (isNaN(number)) {
    return '0'
  }
  return String(Math.round(number * 100) / 100)
}

function formatWeight(value) {
  return String(Math.round(normalizeWeight(value) * 10) / 10)
}

function pad(value) {
  return value < 10 ? '0' + value : '' + value
}

function todayText() {
  const date = new Date()
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

const STATUS_TEXT_MAP = {
  pending_payment: '待付款',
  paid: '已付款',
  pending_handle: '待处理',
  preparing: '采摘/备货中',
  packed: '待发货/待自提',
  shipped: '已送出',
  picked_up: '已自提',
  completed: '已完成',
  cancelled: '已取消',
  after_sale: '售后处理中',
  after_sale_handled: '售后已处理'
}

function normalizeStatus(status) {
  const value = String(status || '').trim()
  return STATUS_TEXT_MAP[value] || value || '已提交'
}

function normalizeDeliveryType(value) {
  const text = String(value || '').trim()
  const typeMap = {
    pickup: '自提',
    localDelivery: '附近送',
    nearby: '附近送',
    express: '顺丰快递',
    courier: '顺丰快递'
  }
  return typeMap[text] || text
}

function normalizeDateText(value) {
  const text = String(value || '').trim()
  const matched = text.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/)
  if (!matched) {
    return text.slice(0, 10)
  }
  return matched[1] + '-' + pad(Number(matched[2])) + '-' + pad(Number(matched[3]))
}

function filterOrdersByDateRange(orders, startDate, endDate) {
  const start = String(startDate || '')
  const end = String(endDate || start)
  return (Array.isArray(orders) ? orders : []).filter(function (order) {
    const date = normalizeDateText(firstValue([
      order.createdAt,
      order.createTime,
      order.orderTime,
      order.date
    ], ''))
    return !!date && date >= start && date <= end
  })
}

function getOrderText(order) {
  return String([
    order.skuName,
    order.productName,
    order.productTitle,
    order.variety,
    order.spec,
    order.fruitWeightText,
    order.specText
  ].join(' '))
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

function getSpecWeight(order) {
  const text = getOrderText(order)
  if (text.indexOf('10斤') >= 0) {
    return 10
  }
  if (text.indexOf('5斤') >= 0) {
    return 5
  }
  return 0
}

function getQuantity(order) {
  return Number(order.quantity) || Number(order.count) || 1
}

function getFixedWeight(order) {
  return getSpecWeight(order) * getQuantity(order)
}

function isGuiweiOrder(order) {
  return getOrderText(order).indexOf('桂味') >= 0
}

function isNuomiciOrder(order) {
  return getOrderText(order).indexOf('糯米糍') >= 0
}

function isMixOrder(order) {
  return getOrderText(order).indexOf('混装') >= 0
}

function getGuiweiWeight(order) {
  const customWeight = normalizeWeight(firstValue([
    order.guiweiWeight,
    order.guiweiJin,
    order.guiweiWeightValue
  ], 0))
  if (customWeight > 0 || order.customWeightOrder) {
    return customWeight
  }
  return isGuiweiOrder(order) ? getFixedWeight(order) : 0
}

function getNuomiciWeight(order) {
  const customWeight = normalizeWeight(firstValue([
    order.nuomiciWeight,
    order.nuomiciJin,
    order.nuomiciWeightValue
  ], 0))
  if (customWeight > 0 || order.customWeightOrder) {
    return customWeight
  }
  return isNuomiciOrder(order) ? getFixedWeight(order) : 0
}

function getMixedWeight(order) {
  if (order.customWeightOrder) {
    return 0
  }
  return isMixOrder(order) ? getFixedWeight(order) : 0
}

function getTotalWeight(order) {
  const totalWeight = normalizeWeight(firstValue([
    order.totalWeight,
    order.totalJin,
    order.weight
  ], 0))
  const customTotal = getGuiweiWeight(order) + getNuomiciWeight(order)
  if (totalWeight > 0 || customTotal > 0 || order.customWeightOrder) {
    return totalWeight || customTotal
  }
  return getFixedWeight(order)
}

function getCustomerName(order) {
  return firstValue([
    order.recipientName,
    order.buyerName,
    order.pickupName,
    order.contactName,
    order.contactSurname,
    order.name,
    order.wechatId
  ], '未填写')
}

function getCustomerPhone(order) {
  return firstValue([
    order.recipientPhone,
    order.buyerPhone,
    order.contactPhone,
    order.mobile,
    order.phone
  ], '未填写')
}

function getCustomerWechat(order) {
  return firstValue([
    order.buyerWechat,
    order.wechat,
    order.wechatId,
    order.wechatName,
    order.wechatNickname,
    order.wxId,
    order.nickname
  ], '未填写')
}

function getDeliveryMethod(order) {
  const deliveryMethod = normalizeDeliveryType(firstValue([
    order.deliveryMethod,
    order.deliveryType,
    order.orderType
  ], '客服确认'))
  const thirdPartyMethod = normalizeDeliveryType(order.thirdPartyMethod || '')
  return deliveryMethod + (thirdPartyMethod ? ' / ' + thirdPartyMethod : '')
}

function getAddress(order) {
  const pickupText = order.pickupDate ? order.pickupDate + ' ' + (order.pickupTimeSlot || '') : ''
  return firstValue([
    order.address,
    order.deliveryAddress,
    order.fullAddress,
    order.detailAddress,
    order.pickupAddress,
    pickupText,
    order.area
  ], '客服确认')
}

function getProductName(order) {
  return firstValue([
    order.skuName,
    order.productName,
    order.productTitle,
    order.variety
  ], '荔枝')
}

function getProductDetail(order) {
  if (order.customWeightOrder) {
    const parts = []
    const guiweiWeight = getGuiweiWeight(order)
    const nuomiciWeight = getNuomiciWeight(order)
    if (guiweiWeight > 0) {
      parts.push('桂味' + formatWeight(guiweiWeight) + '斤')
    }
    if (nuomiciWeight > 0) {
      parts.push('糯米糍' + formatWeight(nuomiciWeight) + '斤')
    }
    return parts.length ? parts.join('，') : '自定义斤数'
  }
  return getProductName(order) + ' / ' + getSpecText(order) + ' / ' + getQuantity(order) + '箱'
}

function getQuantityText(order) {
  if (order.customWeightOrder) {
    return formatWeight(getTotalWeight(order)) + '斤'
  }
  return getQuantity(order) + '箱'
}

function getGiftBox5Count(order) {
  const explicit = Number(order.giftBox5Count) || 0
  if (explicit > 0) {
    return explicit
  }
  let count = 0
  if (!order.customWeightOrder && (order.needGiftBox === '是' || order.needGiftBox === '需要礼盒') && getSpecText(order).indexOf('5斤') >= 0) {
    count += getQuantity(order)
  }
  return count
}

function getGiftBox10Count(order) {
  const explicit = Number(order.giftBox10Count) || 0
  if (explicit > 0) {
    return explicit
  }
  let count = 0
  if (!order.customWeightOrder && (order.needGiftBox === '是' || order.needGiftBox === '需要礼盒') && getSpecText(order).indexOf('10斤') >= 0) {
    count += getQuantity(order)
  }
  return count
}

function getGiftBoxCount(order) {
  return Number(order.giftBoxCount) || getGiftBox5Count(order) + getGiftBox10Count(order)
}

function getGiftBoxFee(order) {
  const explicit = Number(order.giftBoxFee)
  if (!isNaN(explicit) && explicit > 0) {
    return toMoney(explicit)
  }
  return toMoney(getGiftBox5Count(order) * 3 + getGiftBox10Count(order) * 5)
}

function getGiftBoxText(order) {
  const count = getGiftBoxCount(order)
  if (count <= 0) {
    return '否'
  }
  const parts = []
  if (getGiftBox5Count(order) > 0) {
    parts.push('5斤礼盒' + getGiftBox5Count(order) + '个')
  }
  if (getGiftBox10Count(order) > 0) {
    parts.push('10斤礼盒' + getGiftBox10Count(order) + '个')
  }
  return parts.length ? parts.join('，') : '是'
}

function getShippingFee(order) {
  return toMoney(firstValue([
    order.deliveryFee,
    order.shippingFee,
    order.freightAmount,
    order.estimatedShippingFee,
    order.actualShippingFee
  ], 0))
}

function getProductAmount(order) {
  const explicit = firstValue([order.productAmount], '')
  if (explicit !== '') {
    return toMoney(explicit)
  }
  const total = firstValue([order.totalAmount, order.payAmount, order.amount], '')
  if (total !== '') {
    return Math.max(0, toMoney(total) - getGiftBoxFee(order) - getShippingFee(order))
  }
  return toMoney(order.price) * getQuantity(order)
}

function getTotalAmount(order) {
  const explicit = firstValue([
    order.payableAmount,
    order.totalAmount,
    order.payAmount,
    order.amount
  ], '')
  if (explicit !== '') {
    return toMoney(explicit)
  }
  return toMoney(getProductAmount(order) + getGiftBoxFee(order) + getShippingFee(order))
}

function getDiscountAmount(order) {
  const combined = firstValue([order.discountAmount], '')
  if (combined !== '') {
    return toMoney(combined)
  }
  return toMoney(order.couponDiscountAmount) + toMoney(order.pointsDiscountAmount)
}

function getRefundAmount(order) {
  return toMoney(firstValue([
    order.refundAmount,
    order.refundShippingFee,
    order.afterSaleRefundAmount
  ], 0))
}

function getCustomerRemark(order) {
  return firstValue([
    order.remark,
    order.note,
    order.message
  ], '')
}

function getAdminRemark(order) {
  return firstValue([
    order.serviceNote,
    order.adminNote,
    order.managerNote
  ], '')
}

function isExpressOrder(order) {
  const text = getDeliveryMethod(order)
  return text.indexOf('快递') >= 0 || text.indexOf('顺丰') >= 0 || text.indexOf('同城快送') >= 0
}

function isPickupOrder(order) {
  return getDeliveryMethod(order).indexOf('自提') >= 0
}

function isNearbyOrder(order) {
  return getDeliveryMethod(order).indexOf('附近') >= 0
}

function isPaidOrder(order) {
  const status = normalizeStatus(order.orderStatus || order.status)
  return ['已付款', '已支付', '待处理', '待采摘', '采摘/备货中', '待打包', '待发货', '待自提', '待发货/待自提', '已送出', '已自提', '已完成'].indexOf(status) >= 0
}

function isPendingPayOrder(order) {
  const status = normalizeStatus(order.orderStatus || order.status)
  return status === '待付款' || status === '已提交'
}

function isPendingHandleOrder(order) {
  const status = normalizeStatus(order.orderStatus || order.status)
  return [
    '已付款',
    '已支付',
    '待处理',
    '待采摘',
    '采摘/备货中',
    '待打包',
    '待发货',
    '待自提',
    '待发货/待自提'
  ].indexOf(status) >= 0
}

function isShippedOrder(order) {
  const status = normalizeStatus(order.orderStatus || order.status)
  return status === '已送出' || status === '已发货' || status === '已自提'
}

function isCompletedOrder(order) {
  return normalizeStatus(order.orderStatus || order.status) === '已完成'
}

function isCanceledOrder(order) {
  return normalizeStatus(order.orderStatus || order.status) === '已取消'
}

function isAfterSaleOrder(order) {
  const status = normalizeStatus(order.orderStatus || order.status)
  return status === '售后处理中' ||
    status === '售后已处理' ||
    getRefundAmount(order) > 0
}

function isOperationalOrder(order) {
  return !isCanceledOrder(order) && !isAfterSaleOrder(order)
}

function getDeliveryGroupKey(order) {
  if (isExpressOrder(order)) {
    return 'express'
  }
  if (isPickupOrder(order)) {
    return 'pickup'
  }
  if (isNearbyOrder(order)) {
    return 'nearby'
  }
  return 'other'
}

function getDeliveryGroupMeta(key) {
  const groups = {
    express: {
      key: 'express',
      title: '快递订单',
      shortTitle: '快递',
      description: '核对地址、手机号和发货信息',
      tone: 'blue'
    },
    pickup: {
      key: 'pickup',
      title: '自提订单',
      shortTitle: '自提',
      description: '核对自提人、手机号和自提点',
      tone: 'green'
    },
    nearby: {
      key: 'nearby',
      title: '附近送订单',
      shortTitle: '附近送',
      description: '核对联系人和详细配送地址',
      tone: 'orange'
    },
    other: {
      key: 'other',
      title: '其他配送',
      shortTitle: '其他',
      description: '配送方式等待客服确认',
      tone: 'gray'
    }
  }
  return groups[key] || groups.other
}

function deliverySummary(orders) {
  const list = Array.isArray(orders) ? orders : []
  const expressCount = list.filter(isExpressOrder).length
  const pickupCount = list.filter(isPickupOrder).length
  const nearbyCount = list.filter(isNearbyOrder).length
  const otherCount = list.length - expressCount - pickupCount - nearbyCount
  const parts = [
    '快递' + expressCount + '单',
    '自提' + pickupCount + '单',
    '附近送' + nearbyCount + '单'
  ]
  if (otherCount > 0) {
    parts.push('其他' + otherCount + '单')
  }
  return parts.join(' / ')
}

function giftBoxSummary(orders) {
  const list = Array.isArray(orders) ? orders : []
  const fiveCount = list.reduce(function (total, order) {
    return total + getGiftBox5Count(order)
  }, 0)
  const tenCount = list.reduce(function (total, order) {
    return total + getGiftBox10Count(order)
  }, 0)
  return '5斤礼盒' + fiveCount + '个 / 10斤礼盒' + tenCount + '个'
}

function getMetrics(orders) {
  const list = Array.isArray(orders) ? orders : []
  const metrics = {
    orderCount: list.length,
    guiweiWeight: 0,
    nuomiciWeight: 0,
    mixedWeight: 0,
    totalWeight: 0,
    expressCount: 0,
    pickupCount: 0,
    nearbyCount: 0,
    giftBox5Count: 0,
    giftBox10Count: 0,
    giftBoxCount: 0,
    productAmount: 0,
    giftBoxFee: 0,
    shippingFee: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingPayAmount: 0,
    refundAmount: 0
  }

  list.forEach(function (order) {
    const totalAmount = getTotalAmount(order)
    metrics.guiweiWeight += getGuiweiWeight(order)
    metrics.nuomiciWeight += getNuomiciWeight(order)
    metrics.mixedWeight += getMixedWeight(order)
    metrics.totalWeight += getTotalWeight(order)
    metrics.expressCount += isExpressOrder(order) ? 1 : 0
    metrics.pickupCount += isPickupOrder(order) ? 1 : 0
    metrics.nearbyCount += isNearbyOrder(order) ? 1 : 0
    metrics.giftBox5Count += getGiftBox5Count(order)
    metrics.giftBox10Count += getGiftBox10Count(order)
    metrics.giftBoxCount += getGiftBoxCount(order)
    metrics.productAmount += getProductAmount(order)
    metrics.giftBoxFee += getGiftBoxFee(order)
    metrics.shippingFee += getShippingFee(order)
    metrics.totalAmount += totalAmount
    metrics.paidAmount += isPaidOrder(order) ? totalAmount : 0
    metrics.pendingPayAmount += isPendingPayOrder(order) ? totalAmount : 0
    metrics.refundAmount += getRefundAmount(order)
  })

  metrics.actualIncome = Math.max(0, metrics.paidAmount - metrics.refundAmount)
  return metrics
}

function buildRenderableTable(headers, rows) {
  const columns = (Array.isArray(headers) ? headers : []).map(function (label, index) {
    return {
      key: 'column-' + index,
      label: label
    }
  })
  const records = (Array.isArray(rows) ? rows : []).map(function (row, rowIndex) {
    return {
      id: 'row-' + rowIndex,
      cells: columns.map(function (column, columnIndex) {
        return {
          key: column.key,
          value: row[columnIndex] === null || typeof row[columnIndex] === 'undefined' ? '' : String(row[columnIndex])
        }
      })
    }
  })

  return {
    columns: columns,
    records: records
  }
}

function createReport(title, headers, rows, displayHeaders, displayRows) {
  const exportTable = buildRenderableTable(headers, rows)
  const displayTable = buildRenderableTable(displayHeaders || headers, displayRows || rows)
  return {
    title: title,
    headers: headers,
    rows: rows,
    columns: exportTable.columns,
    records: exportTable.records,
    displayColumns: displayTable.columns,
    displayRecords: displayTable.records
  }
}

function generateReportSummary(orders) {
  const metrics = getMetrics(orders)
  return {
    orderCount: metrics.orderCount,
    guiweiWeight: metrics.guiweiWeight,
    nuomiciWeight: metrics.nuomiciWeight,
    totalWeight: metrics.totalWeight,
    expressCount: metrics.expressCount,
    pickupCount: metrics.pickupCount,
    nearbyCount: metrics.nearbyCount,
    giftBoxCount: metrics.giftBoxCount,
    giftBox5Count: metrics.giftBox5Count,
    giftBox10Count: metrics.giftBox10Count,
    totalAmount: metrics.totalAmount,
    cards: [
      { key: 'orderCount', label: '今日订单数', value: metrics.orderCount, tone: 'green' },
      { key: 'guiweiWeight', label: '桂味总斤数', value: formatWeight(metrics.guiweiWeight) + '斤', tone: 'green' },
      { key: 'nuomiciWeight', label: '糯米糍总斤数', value: formatWeight(metrics.nuomiciWeight) + '斤', tone: 'green' },
      { key: 'totalWeight', label: '总斤数', value: formatWeight(metrics.totalWeight) + '斤', tone: 'red' },
      { key: 'expressCount', label: '快递订单数', value: metrics.expressCount, tone: 'blue' },
      { key: 'pickupCount', label: '自提订单数', value: metrics.pickupCount, tone: 'orange' },
      { key: 'nearbyCount', label: '附近送订单数', value: metrics.nearbyCount, tone: 'green' },
      { key: 'giftBoxCount', label: '礼盒数量', value: metrics.giftBoxCount, tone: 'orange' },
      { key: 'totalAmount', label: '今日金额', value: formatNumber(metrics.totalAmount) + '元', tone: 'red' }
    ]
  }
}

function generateReportOverview(orders) {
  return generateReportSummary(orders).cards
}

function attachSummary(report, orders) {
  return Object.assign({}, report, {
    summary: generateReportSummary(orders)
  })
}

function getStatusTone(status) {
  status = normalizeStatus(status)
  if (status === '待付款' || status === '已提交') {
    return 'red'
  }
  if (status === '已付款' || status === '已支付' || status === '待处理' || status === '待采摘' || status === '采摘/备货中' || status === '待打包' || status === '待发货' || status === '待自提' || status === '待发货/待自提') {
    return 'green'
  }
  if (status === '已送出') {
    return 'blue'
  }
  if (status === '已完成' || status === '已自提') {
    return 'light-green'
  }
  if (status === '售后处理中' || status === '售后已处理') {
    return 'orange'
  }
  return 'gray'
}

function buildOrderCard(order, index) {
  const status = normalizeStatus(firstValue([order.orderStatus, order.status], '已提交'))
  const guiweiWeight = getGuiweiWeight(order)
  const nuomiciWeight = getNuomiciWeight(order)
  const totalWeight = getTotalWeight(order)
  return {
    id: firstValue([order.id, order.orderNo], 'order-' + index),
    orderNo: firstValue([order.orderNo, order.id], '未生成'),
    createdAt: firstValue([order.createdAt, order.createTime, order.orderTime], '未填写'),
    customerName: getCustomerName(order),
    phone: getCustomerPhone(order),
    wechat: getCustomerWechat(order),
    deliveryMethod: getDeliveryMethod(order),
    deliveryGroup: getDeliveryGroupKey(order),
    productDetail: getProductDetail(order),
    guiweiWeight: formatWeight(guiweiWeight),
    nuomiciWeight: formatWeight(nuomiciWeight),
    totalWeight: formatWeight(totalWeight),
    giftBoxText: getGiftBoxText(order),
    giftBox5Count: getGiftBox5Count(order),
    giftBox10Count: getGiftBox10Count(order),
    amount: formatNumber(getTotalAmount(order)),
    productAmount: formatNumber(getProductAmount(order)),
    giftBoxFee: formatNumber(getGiftBoxFee(order)),
    shippingFee: formatNumber(getShippingFee(order)),
    discountAmount: formatNumber(getDiscountAmount(order)),
    status: status,
    statusTone: getStatusTone(status),
    address: getAddress(order),
    remark: firstValue([getCustomerRemark(order), getAdminRemark(order)], '无'),
    trackingNo: firstValue([order.trackingNo, order.sfTrackingNo, order.sfNo], ''),
    isCanceled: isCanceledOrder(order),
    isAfterSale: isAfterSaleOrder(order)
  }
}

function buildOrderReportDashboard(orders) {
  const allOrders = Array.isArray(orders) ? orders : []
  const operationalOrders = allOrders.filter(isOperationalOrder)
  const amountOrders = allOrders.filter(function (order) {
    return !isCanceledOrder(order)
  })
  const operationalMetrics = getMetrics(operationalOrders)
  const amountMetrics = getMetrics(amountOrders)
  const pendingPaymentCount = allOrders.filter(isPendingPayOrder).length
  const pendingHandleCount = allOrders.filter(isPendingHandleOrder).length
  const shippedCount = allOrders.filter(isShippedOrder).length
  const completedCount = allOrders.filter(isCompletedOrder).length
  const confirmedCount = allOrders.filter(function (order) {
    return isPaidOrder(order) && !isAfterSaleOrder(order)
  }).length
  const afterSaleCount = allOrders.filter(isAfterSaleOrder).length

  return {
    orderCount: allOrders.length,
    pendingPaymentCount: pendingPaymentCount,
    pendingHandleCount: pendingHandleCount,
    shippedCount: shippedCount,
    completedCount: completedCount,
    confirmedCount: confirmedCount,
    afterSaleCount: afterSaleCount,
    guiweiWeight: formatWeight(operationalMetrics.guiweiWeight),
    nuomiciWeight: formatWeight(operationalMetrics.nuomiciWeight),
    totalWeight: formatWeight(operationalMetrics.totalWeight),
    pickupCount: operationalMetrics.pickupCount,
    nearbyCount: operationalMetrics.nearbyCount,
    expressCount: operationalMetrics.expressCount,
    productAmount: formatNumber(amountMetrics.productAmount),
    shippingFee: formatNumber(amountMetrics.shippingFee),
    totalAmount: formatNumber(amountMetrics.totalAmount),
    giftBoxCount: operationalMetrics.giftBoxCount,
    giftBox5Count: operationalMetrics.giftBox5Count,
    giftBox10Count: operationalMetrics.giftBox10Count
  }
}

function buildReportOrderCards(orders) {
  return (Array.isArray(orders) ? orders : []).map(buildOrderCard)
}

function buildDeliveryGroups(orders) {
  const list = Array.isArray(orders) ? orders : []
  const keys = ['express', 'pickup', 'nearby', 'other']
  return keys.map(function (key) {
    const groupOrders = list.filter(function (order) {
      return getDeliveryGroupKey(order) === key
    })
    const meta = getDeliveryGroupMeta(key)
    return Object.assign({}, meta, {
      count: groupOrders.length,
      orders: buildReportOrderCards(groupOrders)
    })
  }).filter(function (group) {
    return group.count > 0 || group.key !== 'other'
  })
}

function buildHarvestDeliveryGroups(orders) {
  const list = Array.isArray(orders) ? orders : []
  return ['express', 'pickup', 'nearby'].map(function (key) {
    const groupOrders = list.filter(function (order) {
      return getDeliveryGroupKey(order) === key
    })
    const metrics = getMetrics(groupOrders)
    const meta = getDeliveryGroupMeta(key)
    return Object.assign({}, meta, {
      orderCount: groupOrders.length,
      guiweiWeight: formatWeight(metrics.guiweiWeight),
      nuomiciWeight: formatWeight(metrics.nuomiciWeight),
      mixedWeight: formatWeight(metrics.mixedWeight),
      totalWeight: formatWeight(metrics.totalWeight),
      giftBox5Count: metrics.giftBox5Count,
      giftBox10Count: metrics.giftBox10Count
    })
  })
}

function sumOrderAmounts(orders) {
  return (Array.isArray(orders) ? orders : []).reduce(function (total, order) {
    return total + getTotalAmount(order)
  }, 0)
}

function buildReportViewData(orders) {
  const allOrders = Array.isArray(orders) ? orders : []
  const operationalOrders = allOrders.filter(isOperationalOrder)
  const afterSaleOrders = allOrders.filter(isAfterSaleOrder)
  const canceledOrders = allOrders.filter(isCanceledOrder)
  const operationalMetrics = getMetrics(operationalOrders)
  const paidOrders = operationalOrders.filter(function (order) {
    const status = normalizeStatus(order.orderStatus || order.status)
    return status === '已支付' || status === '已付款'
  })
  const pendingPayOrders = allOrders.filter(function (order) {
    return normalizeStatus(order.orderStatus || order.status) === '待付款'
  })
  const paidAmountOrders = allOrders.filter(function (order) {
    return !isCanceledOrder(order) && (isPaidOrder(order) || isAfterSaleOrder(order))
  })
  const paidAmount = sumOrderAmounts(paidAmountOrders)
  const refundAmount = afterSaleOrders.reduce(function (total, order) {
    return total + getRefundAmount(order)
  }, 0)
  const actualIncome = Math.max(0, paidAmount - refundAmount)

  return {
    sourceOrderCount: allOrders.length,
    operationalOrderCount: operationalOrders.length,
    excludedOrderCount: allOrders.length - operationalOrders.length,
    summaryCards: [
      { key: 'orderCount', label: '今日订单数', value: allOrders.length, tone: 'green' },
      { key: 'guiweiWeight', label: '桂味总斤数', value: formatWeight(operationalMetrics.guiweiWeight) + '斤', tone: 'green' },
      { key: 'nuomiciWeight', label: '糯米糍总斤数', value: formatWeight(operationalMetrics.nuomiciWeight) + '斤', tone: 'green' },
      { key: 'totalWeight', label: '总斤数', value: formatWeight(operationalMetrics.totalWeight) + '斤', tone: 'red' },
      { key: 'expressCount', label: '快递订单数', value: operationalMetrics.expressCount, tone: 'blue' },
      { key: 'pickupCount', label: '自提订单数', value: operationalMetrics.pickupCount, tone: 'green' },
      { key: 'nearbyCount', label: '附近送订单数', value: operationalMetrics.nearbyCount, tone: 'orange' },
      { key: 'giftBox5Count', label: '5斤礼盒数量', value: operationalMetrics.giftBox5Count, tone: 'orange' },
      { key: 'giftBox10Count', label: '10斤礼盒数量', value: operationalMetrics.giftBox10Count, tone: 'orange' },
      { key: 'totalAmount', label: '今日金额', value: formatNumber(operationalMetrics.totalAmount) + '元', tone: 'red' }
    ],
    overviewCards: [
      { key: 'orderCount', label: '总订单数', value: allOrders.length, tone: 'green' },
      { key: 'totalWeight', label: '总斤数', value: formatWeight(operationalMetrics.totalWeight) + '斤', tone: 'red' },
      { key: 'guiweiWeight', label: '桂味总斤数', value: formatWeight(operationalMetrics.guiweiWeight) + '斤', tone: 'green' },
      { key: 'nuomiciWeight', label: '糯米糍总斤数', value: formatWeight(operationalMetrics.nuomiciWeight) + '斤', tone: 'green' },
      { key: 'totalAmount', label: '今日金额', value: formatNumber(operationalMetrics.totalAmount) + '元', tone: 'red' },
      { key: 'pendingPayCount', label: '待付款数量', value: pendingPayOrders.length, tone: 'red' },
      { key: 'paidCount', label: '已支付数量', value: paidOrders.length, tone: 'green' },
      { key: 'afterSaleCount', label: '售后数量', value: afterSaleOrders.length, tone: 'orange' }
    ],
    harvestTotals: {
      guiweiWeight: formatWeight(operationalMetrics.guiweiWeight),
      nuomiciWeight: formatWeight(operationalMetrics.nuomiciWeight),
      mixedWeight: formatWeight(operationalMetrics.mixedWeight),
      totalWeight: formatWeight(operationalMetrics.totalWeight),
      giftBox5Count: operationalMetrics.giftBox5Count,
      giftBox10Count: operationalMetrics.giftBox10Count
    },
    harvestGroups: buildHarvestDeliveryGroups(operationalOrders),
    deliveryGroups: buildDeliveryGroups(operationalOrders),
    orderCards: buildReportOrderCards(allOrders),
    finance: {
      paidAmount: formatNumber(paidAmount),
      pendingPayAmount: formatNumber(sumOrderAmounts(pendingPayOrders)),
      refundAmount: formatNumber(refundAmount),
      actualIncome: formatNumber(actualIncome)
    }
  }
}

const ORDER_DETAIL_HEADERS = [
  '订单号',
  '下单时间',
  '客户姓名',
  '手机号',
  '微信号/微信昵称',
  '配送方式',
  '商品明细',
  '桂味斤数',
  '糯米糍斤数',
  '总斤数',
  '数量/箱数',
  '是否礼盒',
  '礼盒费用',
  '商品金额',
  '配送费',
  '优惠抵扣',
  '预计金额',
  '订单状态',
  '地址/自提点',
  '顺丰单号',
  '客户备注',
  '管理员备注'
]

const HARVEST_SUMMARY_HEADERS = [
  '品种',
  '总斤数',
  '订单数量',
  '配送方式汇总',
  '礼盒数量',
  '备注'
]

function buildOrderDetailRows(orders) {
  const list = Array.isArray(orders) ? orders : []
  return list.map(function (order) {
    return [
      firstValue([order.orderNo, order.id], '未生成'),
      firstValue([order.createdAt, order.createTime, order.orderTime], ''),
      getCustomerName(order),
      getCustomerPhone(order),
      getCustomerWechat(order),
      getDeliveryMethod(order),
      getProductDetail(order),
      formatWeight(getGuiweiWeight(order)),
      formatWeight(getNuomiciWeight(order)),
      formatWeight(getTotalWeight(order)),
      getQuantityText(order),
      getGiftBoxText(order),
      formatNumber(getGiftBoxFee(order)),
      formatNumber(getProductAmount(order)),
      formatNumber(getShippingFee(order)),
      formatNumber(getDiscountAmount(order)),
      formatNumber(getTotalAmount(order)),
      normalizeStatus(order.orderStatus || order.status),
      getAddress(order),
      firstValue([order.trackingNo, order.sfTrackingNo, order.sfNo], ''),
      getCustomerRemark(order),
      getAdminRemark(order)
    ]
  })
}

function generateOrderDetailReport(orders) {
  const list = Array.isArray(orders) ? orders : []
  const rows = buildOrderDetailRows(list)
  const displayIndexes = [0, 2, 3, 5, 6, 9, 16, 17, 18, 20]
  const displayHeaders = displayIndexes.map(function (index) {
    return ORDER_DETAIL_HEADERS[index]
  })
  const displayRows = rows.map(function (row) {
    return displayIndexes.map(function (index) {
      return row[index]
    })
  })

  return attachSummary(
    createReport('今日订单明细表', ORDER_DETAIL_HEADERS, rows, displayHeaders, displayRows),
    list
  )
}

function buildHarvestSummaryRows(orders) {
  const list = Array.isArray(orders) ? orders : []
  const metrics = getMetrics(list)
  const guiweiOrders = list.filter(function (order) {
    return getGuiweiWeight(order) > 0
  })
  const nuomiciOrders = list.filter(function (order) {
    return getNuomiciWeight(order) > 0
  })
  const mixedOrders = list.filter(function (order) {
    return getMixedWeight(order) > 0
  })
  const rows = [
    [
      '桂味',
      formatWeight(metrics.guiweiWeight),
      guiweiOrders.length,
      deliverySummary(guiweiOrders),
      giftBoxSummary(guiweiOrders),
      '按今日订单汇总'
    ],
    [
      '糯米糍',
      formatWeight(metrics.nuomiciWeight),
      nuomiciOrders.length,
      deliverySummary(nuomiciOrders),
      giftBoxSummary(nuomiciOrders),
      '按今日订单汇总'
    ]
  ]

  if (metrics.mixedWeight > 0) {
    rows.push([
      '混装未拆分',
      formatWeight(metrics.mixedWeight),
      mixedOrders.length,
      deliverySummary(mixedOrders),
      giftBoxSummary(mixedOrders),
      '混装订单需采摘前人工确认桂味/糯米糍比例'
    ])
  }

  rows.push([
    '合计',
    formatWeight(metrics.totalWeight),
    list.length,
    deliverySummary(list),
    '5斤礼盒' + metrics.giftBox5Count + '个 / 10斤礼盒' + metrics.giftBox10Count + '个',
    '快递' + metrics.expressCount + '单，自提' + metrics.pickupCount + '单，附近送' + metrics.nearbyCount + '单'
  ])

  return rows
}

function generateHarvestSummaryReport(orders) {
  const list = Array.isArray(orders) ? orders : []
  return attachSummary(
    createReport('今日采摘汇总表', HARVEST_SUMMARY_HEADERS, buildHarvestSummaryRows(list)),
    list
  )
}

function generateDeliveryReport(orders) {
  const list = Array.isArray(orders) ? orders : []
  return attachSummary(createReport('今日发货配送表', [
    '订单号',
    '配送方式',
    '客户姓名',
    '手机号',
    '地址/自提点',
    '商品明细',
    '总斤数',
    '是否礼盒',
    '订单状态',
    '顺丰单号',
    '发货备注'
  ], list.map(function (order) {
    return [
      firstValue([order.orderNo, order.id], '未生成'),
      getDeliveryMethod(order),
      getCustomerName(order),
      getCustomerPhone(order),
      getAddress(order),
      getProductDetail(order),
      formatWeight(getTotalWeight(order)),
      getGiftBoxText(order),
      normalizeStatus(order.orderStatus || order.status || '已提交'),
      firstValue([order.trackingNo, order.sfTrackingNo, order.sfNo], ''),
      firstValue([order.shipNote, order.shipTime, order.serviceNote], '')
    ]
  })), list)
}

function generateFinanceReport(orders) {
  const list = Array.isArray(orders) ? orders : []
  const metrics = getMetrics(list)
  const date = list.length ? (String(list[0].createdAt || '').slice(0, 10) || todayText()) : todayText()
  return attachSummary(createReport('今日财务汇总表', [
    '日期',
    '今日订单数',
    '已支付金额',
    '待付款金额',
    '商品金额',
    '礼盒金额',
    '快递费',
    '售后/退款金额',
    '实际收入'
  ], [[
    date,
    metrics.orderCount,
    formatNumber(metrics.paidAmount),
    formatNumber(metrics.pendingPayAmount),
    formatNumber(metrics.productAmount),
    formatNumber(metrics.giftBoxFee),
    formatNumber(metrics.shippingFee),
    formatNumber(metrics.refundAmount),
    formatNumber(metrics.actualIncome)
  ]]), list)
}

function buildOrderWorkbookSheets(orders, reportDate) {
  const list = Array.isArray(orders) ? orders : []
  const dashboard = buildOrderReportDashboard(list)
  const dateText = reportDate || todayText()
  const deliveryRows = []
  ;['pickup', 'nearby', 'express', 'other'].forEach(function (groupKey) {
    list.filter(function (order) {
      return getDeliveryGroupKey(order) === groupKey
    }).forEach(function (order) {
      deliveryRows.push([
        getDeliveryGroupMeta(groupKey).shortTitle,
        firstValue([order.orderNo, order.id], '未生成'),
        getCustomerName(order),
        getCustomerPhone(order),
        getProductDetail(order),
        formatWeight(getTotalWeight(order)),
        getAddress(order),
        firstValue([order.trackingNo, order.sfTrackingNo, order.sfNo], ''),
        normalizeStatus(order.orderStatus || order.status),
        getCustomerRemark(order)
      ])
    })
  })

  return [
    {
      name: '汇总表',
      headers: [
        '日期范围',
        '订单总数',
        '待付款订单数',
        '待处理订单数',
        '桂味总斤数',
        '糯米糍总斤数',
        '总斤数',
        '自提订单数',
        '附近送订单数',
        '顺丰快递订单数',
        '商品金额合计',
        '配送费合计',
        '预计金额合计'
      ],
      rows: [[
        dateText,
        dashboard.orderCount,
        dashboard.pendingPaymentCount,
        dashboard.pendingHandleCount,
        dashboard.guiweiWeight,
        dashboard.nuomiciWeight,
        dashboard.totalWeight,
        dashboard.pickupCount,
        dashboard.nearbyCount,
        dashboard.expressCount,
        dashboard.productAmount,
        dashboard.shippingFee,
        dashboard.totalAmount
      ]]
    },
    {
      name: '订单明细',
      headers: ORDER_DETAIL_HEADERS,
      rows: buildOrderDetailRows(list)
    },
    {
      name: '发货配送',
      headers: [
        '配送分组',
        '订单号',
        '姓名',
        '手机号',
        '商品明细',
        '总斤数',
        '地址/自提点',
        '顺丰单号',
        '订单状态',
        '备注'
      ],
      rows: deliveryRows
    }
  ]
}

function csvCell(value) {
  const text = String(value === null || typeof value === 'undefined' ? '' : value)
  return '"' + text.replace(/"/g, '""') + '"'
}

function buildCSV(reportData) {
  const headers = Array.isArray(reportData.headers) ? reportData.headers : []
  const rows = Array.isArray(reportData.rows) ? reportData.rows : []
  return '\ufeff' + [headers].concat(rows).map(function (row) {
    return row.map(csvCell).join(',')
  }).join('\r\n')
}

function tsvCell(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value)
    .replace(/\t/g, ' ')
    .replace(/\r?\n/g, ' ')
}

function buildTSV(reportData) {
  const headers = Array.isArray(reportData.headers) ? reportData.headers : []
  const rows = Array.isArray(reportData.rows) ? reportData.rows : []
  return [headers].concat(rows).map(function (row) {
    return row.map(tsvCell).join('\t')
  }).join('\n')
}

function buildOrderDetailCSV(orders) {
  return buildCSV({
    headers: ORDER_DETAIL_HEADERS,
    rows: buildOrderDetailRows(orders)
  })
}

function buildHarvestSummaryCSV(orders) {
  return buildCSV({
    headers: HARVEST_SUMMARY_HEADERS,
    rows: buildHarvestSummaryRows(orders)
  })
}

function sanitizeFileName(fileName) {
  return String(fileName || '荔枝有期_报表.csv').replace(/[\\/:*?"<>|]/g, '_')
}

function saveCSVFile(fileName, csvText) {
  const safeName = sanitizeFileName(fileName)
  const rawText = String(csvText || '')
  const csv = rawText.charCodeAt(0) === 0xFEFF ? rawText : '\ufeff' + rawText

  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env || !wx.env.USER_DATA_PATH) {
      reject(new Error('当前环境不支持写入本地文件'))
      return
    }

    const filePath = wx.env.USER_DATA_PATH + '/' + safeName
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: csv,
      encoding: 'utf8',
      success: function () {
        resolve({
          fileName: safeName,
          filePath: filePath
        })
      },
      fail: function (error) {
        reject(error)
      }
    })
  })
}

function shareCSVFile(filePath, fileName) {
  return new Promise(function (resolve, reject) {
    if (typeof wx === 'undefined' || typeof wx.shareFileMessage !== 'function') {
      reject(new Error('当前环境不支持分享文件'))
      return
    }

    wx.shareFileMessage({
      filePath: filePath,
      fileName: fileName || '',
      success: function (result) {
        resolve(result || {})
      },
      fail: function (error) {
        reject(error)
      }
    })
  })
}

function exportReportToCSV(reportData, fileName) {
  return saveCSVFile(fileName, buildCSV(reportData))
}

module.exports = {
  buildOrderDetailRows,
  buildHarvestSummaryRows,
  buildOrderDetailCSV,
  buildHarvestSummaryCSV,
  saveCSVFile,
  shareCSVFile,
  buildReportOrderCards,
  buildReportViewData,
  buildOrderReportDashboard,
  buildOrderWorkbookSheets,
  filterOrdersByDateRange,
  normalizeDateText,
  normalizeStatus,
  normalizeDeliveryType,
  generateOrderDetailReport,
  generateHarvestSummaryReport,
  generateDeliveryReport,
  generateFinanceReport,
  buildCSV,
  buildTSV,
  exportReportToCSV,
  generateReportOverview,
  generateReportSummary,
  getReportMetrics: getMetrics,
  todayText
}
