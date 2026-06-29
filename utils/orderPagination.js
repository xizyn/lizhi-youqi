function normalizeCount(value, fallback) {
  const number = parseInt(value, 10)
  if (!number || number < 1) {
    return fallback
  }
  return number
}

function getResetDisplayCount(pageSize) {
  return normalizeCount(pageSize, 10)
}

function buildPagedOrders(orders, displayCount, pageSize) {
  const list = Array.isArray(orders) ? orders : []
  const count = normalizeCount(displayCount, getResetDisplayCount(pageSize))
  const nextOrders = list.slice(0, count)

  return {
    orders: nextOrders,
    orderHasMore: nextOrders.length < list.length,
    orderDisplayCount: count
  }
}

function getOrderTimeValue(order) {
  const source = order || {}
  const value = source.createdAt || source.orderTime || source.completedAt || source.cancelledAt || source.canceledAt || source.id || ''
  const parsed = Date.parse(String(value).replace(/-/g, '/'))
  if (!isNaN(parsed)) {
    return parsed
  }
  return 0
}

function sortOrdersByTimeDesc(orders) {
  const list = Array.isArray(orders) ? orders.slice() : []
  return list.sort(function (a, b) {
    return getOrderTimeValue(b) - getOrderTimeValue(a)
  })
}

module.exports = {
  buildPagedOrders: buildPagedOrders,
  getResetDisplayCount: getResetDisplayCount,
  sortOrdersByTimeDesc: sortOrdersByTimeDesc
}
