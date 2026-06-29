const storage = require('../../utils/storage')
const mockData = require('../../utils/mockData')
const afterSaleService = require('../../utils/afterSaleService')
const orderPagination = require('../../utils/orderPagination')

const STATUS_ALIASES = {
  pending_payment: 'pending_payment',
  submitted: 'pending_payment',
  '已提交': 'pending_payment',
  '待付款': 'pending_payment',
  paid: 'paid',
  '已支付': 'paid',
  '已付款': 'paid',
  preparing: 'preparing',
  '待采摘': 'preparing',
  '待打包': 'preparing',
  packed: 'packed',
  '待发货': 'packed',
  '待自提': 'packed',
  '待发货/待自提': 'packed',
  '待配送': 'packed',
  '待配送/待自提': 'packed',
  shipped: 'shipped',
  '已送出': 'shipped',
  '已发货': 'shipped',
  delivered: 'shipped',
  '已送达': 'shipped',
  picked_up: 'picked_up',
  '已自提': 'picked_up',
  completed: 'completed',
  '已完成': 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  '已取消': 'cancelled',
  after_sale: 'after_sale',
  '售后处理中': 'after_sale',
  after_sale_done: 'after_sale_done',
  '售后已处理': 'after_sale_done'
}

const USER_STATUS_CONFIG = {
  pending_payment: {
    group: 'pendingPay',
    text: '待付款（等待联系转账）',
    shortText: '待付款',
    className: 'status-pending',
    progress: '订单已提交，请联系客服确认库存与转账安排。'
  },
  paid: {
    group: 'pendingProcess',
    text: '待处理（已确认，正在采摘）',
    shortText: '待处理',
    className: 'status-processing',
    progress: '订单已确认，果园正在按成熟批次安排采摘。'
  },
  preparing: {
    group: 'pendingProcess',
    text: '待处理（正在备货）',
    shortText: '待处理',
    className: 'status-processing',
    progress: '订单正在采摘、分拣或打包，请留意客服通知。'
  },
  packed: {
    group: 'pendingProcess',
    text: '待处理（等待发货/自提）',
    shortText: '待处理',
    className: 'status-processing',
    progress: '订单已进入发货或自提准备阶段，具体时间由客服确认。'
  },
  shipped: {
    group: 'shipped',
    text: '已送出（已发货/待签收）',
    shortText: '已送出',
    className: 'status-shipped',
    progress: '订单已经送出，请留意物流或配送通知。'
  },
  picked_up: {
    group: 'shipped',
    text: '已送出（已自提）',
    shortText: '已自提',
    className: 'status-shipped',
    progress: '订单已完成自提，如有鲜果异常请及时联系客服。'
  },
  completed: {
    group: 'history',
    text: '交易已完成',
    shortText: '已完成',
    className: 'status-completed',
    progress: '订单已完成，感谢您支持自家果园。'
  },
  cancelled: {
    group: 'history',
    text: '订单已取消',
    shortText: '已取消',
    className: 'status-cancelled',
    progress: '订单已取消，如有疑问请联系客服。'
  },
  after_sale: {
    group: 'afterSale',
    text: '售后处理中',
    shortText: '售后中',
    className: 'status-after-sale',
    progress: '售后申请正在处理中，请保持电话或微信畅通。'
  },
  after_sale_done: {
    group: 'history',
    text: '售后已处理',
    shortText: '售后已处理',
    className: 'status-completed',
    progress: '本次售后已处理完成，如有疑问请联系客服。'
  },
  unknown: {
    group: 'pendingProcess',
    text: '订单处理中',
    shortText: '处理中',
    className: 'status-processing',
    progress: '当前订单状态由客服确认，请留意后续通知。'
  }
}

const FILTER_NOTICES = {
  all: {
    title: '订单进度',
    description: '订单提交后由客服确认库存、采摘和配送安排。',
    icon: '/assets/icons/home-bell.png',
    className: 'notice-all'
  },
  pendingPay: {
    title: '待付款（等待联系转账）',
    description: '已提交预约，请联系客服确认库存与转账。请在约定时间内完成付款，超时订单可能自动取消。',
    icon: '/assets/icons/home-bell.png',
    className: 'notice-pending'
  },
  pendingProcess: {
    title: '待处理（已确认，正在采摘）',
    description: '已确认订单，正在为您采摘和准备中。预计按成熟批次安排自提或发货。',
    icon: '/assets/icons/home-pickup.png',
    className: 'notice-processing'
  },
  shipped: {
    title: '已送出（已发货/待签收）',
    description: '订单已送出，请注意查收。若有鲜果异常，请及时联系客服。',
    icon: '/assets/icons/home-delivery.png',
    className: 'notice-shipped'
  },
  history: {
    title: '交易已完成',
    description: '感谢您的支持，期待再次为您服务。',
    icon: '/assets/icons/home-orchard.png',
    className: 'notice-history'
  },
  afterSale: {
    title: '售后处理中',
    description: '客服会根据订单情况与您沟通，请保留鲜果和包装照片。',
    icon: '/assets/icons/home-service.png',
    className: 'notice-after-sale'
  }
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

function normalizeNumber(value) {
  const number = Number(value)
  return isNaN(number) || number < 0 ? 0 : number
}

function normalizeWeight(value) {
  const number = parseFloat(value)
  if (isNaN(number) || number < 0) {
    return 0
  }
  return Math.round(number * 10) / 10
}

function formatWeight(value) {
  const weight = normalizeWeight(value)
  return weight % 1 === 0 ? String(weight) : weight.toFixed(1)
}

function getCanonicalStatus(status) {
  const value = String(status || '').trim()
  return STATUS_ALIASES[value] || 'unknown'
}

function getStatusConfig(status) {
  return USER_STATUS_CONFIG[getCanonicalStatus(status)] || USER_STATUS_CONFIG.unknown
}

function getSku(source) {
  const skuId = source.skuId || source.productId
  return (mockData.skuOptions || []).find(function (item) {
    return item.id === skuId || item.name === source.skuName || item.name === source.productName
  }) || null
}

function getProductImage(source, sku, guiweiWeight, nuomiciWeight) {
  if (source.productImage || source.image) {
    return source.productImage || source.image
  }
  if (sku && sku.image) {
    return sku.image
  }
  if (guiweiWeight > 0 && nuomiciWeight > 0) {
    return '/assets/images/products/mix-5.jpg'
  }
  if (nuomiciWeight > 0) {
    return '/assets/images/products/nuomici-5.jpg'
  }
  return '/assets/images/products/guiwei-5.jpg'
}

function getProductName(source, sku, guiweiWeight, nuomiciWeight) {
  if (source.customWeightOrder) {
    if (guiweiWeight > 0 && nuomiciWeight > 0) {
      return '桂味 + 糯米糍混装'
    }
    if (nuomiciWeight > 0) {
      return '糯米糍荔枝'
    }
    return '桂味荔枝'
  }
  return firstValue([
    source.skuName,
    source.productName,
    source.productTitle,
    sku && sku.name,
    source.variety
  ], '自家果园荔枝')
}

function getProductSpec(source, sku, guiweiWeight, nuomiciWeight, totalWeight) {
  if (source.customWeightOrder) {
    const parts = []
    if (guiweiWeight > 0) {
      parts.push('桂味 ' + formatWeight(guiweiWeight) + '斤')
    }
    if (nuomiciWeight > 0) {
      parts.push('糯米糍 ' + formatWeight(nuomiciWeight) + '斤')
    }
    return parts.length ? parts.join(' / ') : '共 ' + formatWeight(totalWeight) + '斤'
  }
  return firstValue([
    source.spec,
    source.fruitWeightText,
    source.specText,
    sku && sku.spec
  ], '规格待确认')
}

function getAmount(source) {
  const candidates = [
    source.payAmount,
    source.totalAmount,
    source.amount,
    source.productAmount,
    source.price
  ]
  for (let index = 0; index < candidates.length; index += 1) {
    const value = candidates[index]
    if (value !== '' && value !== null && typeof value !== 'undefined' && !isNaN(Number(value))) {
      return Number(value)
    }
  }
  return null
}

function getDeliverySummary(source) {
  const method = firstValue([source.deliveryMethod, source.deliveryType], '客服确认')
  const thirdPartyMethod = source.thirdPartyMethod || ''
  return method + (thirdPartyMethod ? ' · ' + thirdPartyMethod : '')
}

function getCustomerName(source) {
  return firstValue([
    source.recipientName,
    source.buyerName,
    source.pickupName,
    source.name,
    source.wechatId
  ], '未填写')
}

function getCustomerPhone(source) {
  return firstValue([
    source.recipientPhone,
    source.buyerPhone,
    source.phone
  ], '未填写')
}

function getAddressText(source, isPickup) {
  if (isPickup) {
    return firstValue([
      source.pickupAddress,
      source.pickupPoint,
      source.pickupLocation
    ], '具体自提点由客服确认')
  }
  return firstValue([
    source.address,
    source.deliveryAddress,
    source.recipientAddress,
    source.area
  ], '地址由客服确认')
}

function normalizeOrder(order) {
  const source = order || {}
  const canonicalStatus = getCanonicalStatus(source.orderStatus)
  const statusConfig = USER_STATUS_CONFIG[canonicalStatus] || USER_STATUS_CONFIG.unknown
  const sku = getSku(source)
  const guiweiWeight = normalizeWeight(source.guiweiWeight)
  const nuomiciWeight = normalizeWeight(source.nuomiciWeight)
  const totalWeight = normalizeWeight(source.totalWeight) || normalizeWeight(guiweiWeight + nuomiciWeight)
  const quantity = normalizeNumber(source.quantity || source.count) || 1
  const deliverySummary = getDeliverySummary(source)
  const isExpress = /快递|顺丰|邮寄/.test(deliverySummary)
  const isPickup = /自提/.test(deliverySummary)
  const trackingNo = firstValue([source.trackingNo, source.sfTrackingNo, source.courierNo], '')
  const amount = getAmount(source)
  const productSpecText = getProductSpec(source, sku, guiweiWeight, nuomiciWeight, totalWeight)
  const rawStatus = String(source.orderStatus || '').trim()
  const actionGroup = statusConfig.group
  const activeAfterSale = afterSaleService.getActiveAfterSale(source.id)
  const showContact = actionGroup !== 'history'
  const showCancel = actionGroup === 'pendingPay'
  const showProgress = actionGroup === 'pendingProcess'
  const showLogistics = actionGroup === 'shipped'
  const showAfterSale = afterSaleService.isEligibleOrderStatus(source.orderStatus)
  const actionCount = 1 + (showContact ? 1 : 0) + (showCancel ? 1 : 0) +
    (showProgress ? 1 : 0) + (showLogistics ? 1 : 0) + (showAfterSale ? 1 : 0)

  return Object.assign({}, source, {
    storageId: source.id || '',
    orderNoText: source.orderNo || source.id || '订单号待生成',
    canonicalStatus: canonicalStatus,
    statusGroup: statusConfig.group,
    userStatusText: canonicalStatus === 'unknown' && rawStatus ? rawStatus : statusConfig.text,
    userStatusShortText: canonicalStatus === 'unknown' && rawStatus ? rawStatus : statusConfig.shortText,
    statusClass: statusConfig.className,
    progressText: statusConfig.progress,
    productImage: getProductImage(source, sku, guiweiWeight, nuomiciWeight),
    productNameText: getProductName(source, sku, guiweiWeight, nuomiciWeight),
    productSpecText: productSpecText,
    productQuantityText: source.customWeightOrder ? '共 ' + formatWeight(totalWeight) + '斤' : '数量 ' + quantity + '箱',
    amountText: amount === null ? '待确认' : '¥' + amount.toFixed(2),
    deliverySummary: deliverySummary,
    customerNameText: getCustomerName(source),
    customerPhoneText: getCustomerPhone(source),
    createdAtText: firstValue([source.createdAt, source.orderTime], '时间待确认'),
    trackingNoText: trackingNo,
    isExpress: isExpress,
    isPickup: isPickup,
    pickupOrAddressText: getAddressText(source, isPickup),
    showContact: showContact,
    showCancel: showCancel,
    showProgress: showProgress,
    showLogistics: showLogistics,
    showAfterSale: showAfterSale,
    activeAfterSaleId: activeAfterSale ? activeAfterSale.afterSaleId : '',
    afterSaleActionText: activeAfterSale ? '查看售后进度' : '申请售后',
    actionClass: actionCount === 1
      ? 'action-grid-one'
      : actionCount === 2
        ? 'action-grid-two'
        : actionCount === 3
          ? 'action-grid-three'
          : 'action-grid-many'
  })
}

function filterOrders(orders, filter) {
  if (filter === 'all') {
    return orders
  }
  if (filter === 'afterSale') {
    return orders.filter(function (item) {
      return !!item.activeAfterSaleId || item.statusGroup === 'afterSale'
    })
  }
  return orders.filter(function (item) {
    return item.statusGroup === filter
  })
}

function buildStatusTabs(orders, activeFilter) {
  const definitions = [
    { key: 'all', label: '全部' },
    { key: 'pendingPay', label: '待付款' },
    { key: 'pendingProcess', label: '待处理' },
    { key: 'shipped', label: '已送出' },
    { key: 'history', label: '历史订单' },
    { key: 'afterSale', label: '售后单' }
  ]

  return definitions.map(function (item) {
    const count = item.key === 'all'
      ? orders.length
      : orders.filter(function (order) {
        if (item.key === 'afterSale') {
          return !!order.activeAfterSaleId || order.statusGroup === 'afterSale'
        }
        return order.statusGroup === item.key
      }).length
    return Object.assign({}, item, {
      count: count,
      activeClass: item.key === activeFilter ? 'active' : ''
    })
  })
}

function findOrder(orders, id) {
  const target = String(id || '')
  return orders.find(function (item) {
    return String(item.storageId || item.id || '') === target
  })
}

Page({
  data: {
    orders: [],
    allOrders: [],
    filteredOrders: [],
    activeFilter: 'all',
    statusTabs: [],
    statusNotice: FILTER_NOTICES.all,
    orderPageSize: 10,
    orderDisplayCount: 10,
    orderLoadingMore: false,
    orderHasMore: false
  },

  onShow: function () {
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) {
      tabBar.setData({ selected: 1 })
    }
    const requestedFilter = storage.consumeOrderFilter()
    this.loadOrders(requestedFilter || this.data.activeFilter)
  },

  loadOrders: function (filterOverride) {
    const allOrders = orderPagination.sortOrdersByTimeDesc(storage.getOrders().map(normalizeOrder))
    const activeFilter = filterOverride || this.data.activeFilter || 'all'
    const filteredOrders = filterOrders(allOrders, activeFilter)
    const displayCount = orderPagination.getResetDisplayCount(this.data.orderPageSize)
    const paged = orderPagination.buildPagedOrders(filteredOrders, displayCount, this.data.orderPageSize)
    this.setData({
      allOrders: allOrders,
      filteredOrders: filteredOrders,
      orders: paged.orders,
      orderDisplayCount: paged.orderDisplayCount,
      orderHasMore: paged.orderHasMore,
      orderLoadingMore: false,
      statusTabs: buildStatusTabs(allOrders, activeFilter),
      statusNotice: FILTER_NOTICES[activeFilter] || FILTER_NOTICES.all
    })
  },

  filterByStatus: function (e) {
    const activeFilter = e.currentTarget.dataset.filter || 'all'
    this.setData({
      activeFilter: activeFilter
    })
    this.loadOrders(activeFilter)
  },

  onReachBottom: function () {
    this.loadMoreOrders()
  },

  loadMoreOrders: function () {
    if (this.data.orderLoadingMore || !this.data.orderHasMore) {
      return
    }
    const that = this
    this.setData({
      orderLoadingMore: true
    })
    setTimeout(function () {
      const nextDisplayCount = that.data.orderDisplayCount + that.data.orderPageSize
      const paged = orderPagination.buildPagedOrders(that.data.filteredOrders, nextDisplayCount, that.data.orderPageSize)
      that.setData({
        orders: paged.orders,
        orderDisplayCount: paged.orderDisplayCount,
        orderHasMore: paged.orderHasMore,
        orderLoadingMore: false
      })
    }, 300)
  },

  copyText: function (e) {
    const value = String(e.currentTarget.dataset.value || '')
    const label = e.currentTarget.dataset.label || '内容'
    if (!value) {
      wx.showToast({ title: label + '暂未填写', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: value,
      success: function () {
        wx.showToast({ title: label + '已复制', icon: 'success' })
      }
    })
  },

  showOrderDetail: function (e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      wx.showToast({ title: '订单信息不完整', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/order-detail/order-detail?id=' + encodeURIComponent(id)
    })
  },

  contactService: function () {
    wx.navigateTo({ url: '/pages/contact/contact' })
  },

  cancelOrder: function (e) {
    const id = e.currentTarget.dataset.id
    const that = this
    if (!id) {
      wx.showToast({ title: '订单信息不完整', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认取消订单？',
      content: '仅待付款订单可以由用户取消。取消后订单将进入历史订单。',
      confirmText: '确认取消',
      confirmColor: '#b44942',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        storage.updateOrder(id, {
          orderStatus: '已取消',
          cancelledAt: storage.formatTime(new Date()),
          cancelReason: '用户主动取消'
        })
        that.loadOrders()
        wx.showToast({ title: '订单已取消', icon: 'success' })
      }
    })
  },

  showProgress: function (e) {
    const order = findOrder(this.data.allOrders, e.currentTarget.dataset.id)
    if (!order) {
      wx.showToast({ title: '订单信息不完整', icon: 'none' })
      return
    }
    wx.showModal({
      title: order.userStatusShortText,
      content: order.progressText,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  showLogistics: function (e) {
    const order = findOrder(this.data.allOrders, e.currentTarget.dataset.id)
    if (!order || !order.trackingNoText) {
      wx.showToast({ title: '物流信息待更新', icon: 'none' })
      return
    }
    wx.showModal({
      title: '顺丰单号',
      content: order.trackingNoText,
      cancelText: '关闭',
      confirmText: '复制单号',
      success: function (res) {
        if (res.confirm) {
          wx.setClipboardData({
            data: order.trackingNoText,
            success: function () {
              wx.showToast({ title: '顺丰单号已复制', icon: 'success' })
            }
          })
        }
      }
    })
  },

  applyAfterSale: function (e) {
    const order = findOrder(this.data.allOrders, e.currentTarget.dataset.id)
    if (!order) {
      wx.showToast({ title: '订单信息不完整', icon: 'none' })
      return
    }
    if (order.activeAfterSaleId) {
      wx.navigateTo({
        url: '/pages/after-sale-detail/after-sale-detail?id=' + encodeURIComponent(order.activeAfterSaleId)
      })
      return
    }
    wx.navigateTo({
      url: '/pages/after-sale-apply/after-sale-apply?orderId=' + encodeURIComponent(order.storageId)
    })
  }
})
