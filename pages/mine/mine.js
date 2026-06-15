const storage = require('../../utils/storage')

function normalizeOrder(order) {
  const source = order || {}
  const deliveryMethod = source.deliveryMethod || '客服确认'
  const thirdPartyMethod = source.thirdPartyMethod || ''
  const orderStatus = source.orderStatus || '已提交'
  const pickupInfo = source.pickupDate ? source.pickupDate + ' ' + (source.pickupTimeSlot || '') : ''
  const recipientInfo = source.recipientName ? source.recipientName + ' / ' + (source.recipientPhone || '') : ''
  const variety = source.variety || source.productName || source.skuName || '荔枝'
  const spec = source.spec || source.fruitWeightText || '规格待确认'
  const quantity = source.quantity || 1
  const amountText = source.totalAmount ? source.totalAmount + '元' : (source.productAmount ? source.productAmount + '元' : '客服确认')
  const productSummary = source.customWeightOrder
    ? '桂味 ' + (source.guiweiWeight || 0) + '斤 / 糯米糍 ' + (source.nuomiciWeight || 0) + '斤 / 共 ' + (source.totalWeight || 0) + '斤'
    : variety + ' / ' + spec + ' / ' + quantity + '箱'
  const productTitle = source.customWeightOrder ? (source.productName || '自定义斤数') : variety
  const productSpecText = source.customWeightOrder
    ? '桂味 ' + (source.guiweiWeight || 0) + '斤，糯米糍 ' + (source.nuomiciWeight || 0) + '斤'
    : spec
  const productQtyText = source.customWeightOrder ? ('共 ' + (source.totalWeight || 0) + '斤') : (quantity + '箱')
  const giftBoxText = source.customWeightOrder
    ? ((source.giftBoxCount || 0) + '个')
    : (source.needGiftBox === '是' ? '是' : '否')
  const statusClassMap = {
    '待付款': 'status-pending-pay',
    '已付款': 'status-paid',
    '已支付': 'status-paid',
    '已提交': 'status-paid',
    '待采摘': 'status-picking',
    '待打包': 'status-pending-delivery',
    '待配送/待自提': 'status-pending-delivery',
    '待发货/待自提': 'status-pending-delivery',
    '待发货': 'status-pending-delivery',
    '待自提': 'status-pending-delivery',
    '已送出': 'status-shipped',
    '已发货': 'status-shipped',
    '已完成': 'status-done',
    '已取消': 'status-cancelled',
    '售后处理中': 'status-service'
  }

  return Object.assign({}, source, {
    orderNo: source.orderNo || '订单号待生成',
    orderStatus: orderStatus,
    deliverySummary: deliveryMethod + (thirdPartyMethod ? ' / ' + thirdPartyMethod : ''),
    productSummary: productSummary,
    productTitle: productTitle,
    productSpecText: productSpecText,
    productQtyText: productQtyText,
    variety: variety,
    spec: spec,
    quantity: quantity,
    productAmountText: amountText,
    giftBoxText: giftBoxText,
    contactInfo: pickupInfo || recipientInfo || source.address || '客服确认',
    isShipped: orderStatus === '已送出' || orderStatus === '已发货',
    isDelivered: orderStatus === '待配送/待自提' || orderStatus === '待发货/待自提' || orderStatus === '待发货' || orderStatus === '待自提',
    trackingNoText: source.trackingNo || '客服录入后显示',
    shipTimeText: source.shipTime || '客服确认后显示',
    createdAt: source.createdAt || '时间待确认',
    statusClass: statusClassMap[orderStatus] || 'status-default'
  })
}

function buildCounts(orders) {
  return {
    pendingPay: orders.filter(function (item) { return item.orderStatus === '待付款' }).length,
    pendingProcess: orders.filter(function (item) {
      return item.orderStatus === '已提交' ||
        item.orderStatus === '已支付' ||
        item.orderStatus === '待采摘' ||
        item.orderStatus === '待打包' ||
        item.orderStatus === '待配送/待自提' ||
        item.orderStatus === '待发货/待自提' ||
        item.orderStatus === '待发货' ||
        item.orderStatus === '待自提' ||
        item.orderStatus === '售后处理中'
    }).length,
    shipped: orders.filter(function (item) { return item.orderStatus === '已送出' || item.orderStatus === '已发货' }).length,
    history: orders.filter(function (item) {
      return item.orderStatus === '已完成' || item.orderStatus === '已取消'
    }).length
  }
}

function filterOrders(orders, filter) {
  if (filter === 'pendingPay') {
    return orders.filter(function (item) { return item.orderStatus === '待付款' })
  }
  if (filter === 'pendingProcess') {
    return orders.filter(function (item) {
      return item.orderStatus === '已提交' ||
        item.orderStatus === '已支付' ||
        item.orderStatus === '待采摘' ||
        item.orderStatus === '待打包' ||
        item.orderStatus === '待配送/待自提' ||
        item.orderStatus === '待发货/待自提' ||
        item.orderStatus === '待发货' ||
        item.orderStatus === '待自提' ||
        item.orderStatus === '售后处理中'
    })
  }
  if (filter === 'shipped') {
    return orders.filter(function (item) { return item.orderStatus === '已送出' || item.orderStatus === '已发货' })
  }
  if (filter === 'history') {
    return orders.filter(function (item) {
      return item.orderStatus === '已完成' || item.orderStatus === '已取消'
    })
  }
  return orders
}

Page({
  data: {
    allOrders: [],
    orders: [],
    activeFilter: 'all',
    activeFilterText: '全部订单',
    counts: {
      pendingPay: 0,
      pendingProcess: 0,
      shipped: 0,
      history: 0
    },
    statusCards: []
  },

  onShow: function () {
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) {
      tabBar.setData({ selected: 1 })
    }
    this.loadOrders()
  },

  loadOrders: function () {
    const allOrders = storage.getOrders().map(normalizeOrder)
    const counts = buildCounts(allOrders)
    const activeFilter = this.data.activeFilter
    const statusCards = [
      { key: 'pendingPay', label: '待付款', count: counts.pendingPay },
      { key: 'pendingProcess', label: '待处理', count: counts.pendingProcess },
      { key: 'shipped', label: '已送出', count: counts.shipped },
      { key: 'history', label: '历史订单', count: counts.history }
    ].map(function (item) {
      return Object.assign({}, item, {
        activeClass: item.key === activeFilter ? 'active' : ''
      })
    })
    let activeCard = null
    statusCards.forEach(function (item) {
      if (item.key === activeFilter) {
        activeCard = item
      }
    })

    this.setData({
      allOrders: allOrders,
      orders: filterOrders(allOrders, activeFilter),
      activeFilterText: activeCard ? activeCard.label : '全部订单',
      counts: counts,
      statusCards: statusCards
    })
  },

  filterByStatus: function (e) {
    const nextFilter = e.currentTarget.dataset.filter || 'all'
    const filter = this.data.activeFilter === nextFilter ? 'all' : nextFilter
    this.setData({
      activeFilter: filter
    })
    this.loadOrders()
  },

  showOrderDetail: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const order = this.data.orders[index]
    if (!order) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      return
    }
    const lines = [
      '订单状态：' + order.orderStatus,
      '配送方式：' + order.deliverySummary,
      '商品：' + order.productSummary,
      '礼盒：' + order.giftBoxText,
      '联系/收件：' + order.contactInfo,
      '下单时间：' + order.createdAt
    ]

    if (order.isShipped) {
      lines.push('快递单号：' + order.trackingNoText)
      lines.push('发货时间：' + order.shipTimeText)
    }

    wx.showModal({
      title: order.orderNo,
      content: lines.join('\n'),
      showCancel: false
    })
  },

  copyTrackingNo: function (e) {
    const trackingNo = e.currentTarget.dataset.tracking
    if (!trackingNo) {
      wx.showToast({ title: '暂无单号', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: trackingNo,
      success: function () {
        wx.showToast({ title: '已复制单号', icon: 'success' })
      }
    })
  },

  contactService: function () {
    wx.navigateTo({ url: '/pages/contact/contact' })
  }
})
