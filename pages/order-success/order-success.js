const storage = require('../../utils/storage')

function toMoney(value) {
  const number = Number(value)
  return isNaN(number) || number < 0 ? 0 : Math.round(number * 100) / 100
}

function moneyText(value) {
  return '¥' + toMoney(value).toFixed(2)
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

function findOrder(orderId) {
  const target = String(orderId || '')
  return storage.getOrders().find(function (item) {
    return String(item.id || '') === target
  }) || null
}

Page({
  data: {
    orderId: '',
    orderNoText: '订单号待生成',
    amountText: '待客服确认',
    statusText: '待付款',
    productName: '荔枝鲜果',
    deliveryText: '客服确认',
    createdAtText: ''
  },

  onLoad: function (options) {
    const orderId = options && options.id ? decodeURIComponent(options.id) : ''
    const order = findOrder(orderId)

    if (!order) {
      this.setData({
        orderId: orderId
      })
      return
    }

    this.setData({
      orderId: order.id || '',
      orderNoText: firstValue([order.orderNo, order.id], '订单号待生成'),
      amountText: moneyText(firstValue([order.payableAmount, order.totalAmount, order.payAmount, order.amount], 0)),
      statusText: firstValue([order.orderStatus], '待付款'),
      productName: firstValue([order.productName, order.skuName, order.productTitle, order.variety], '荔枝鲜果'),
      deliveryText: [order.deliveryMethod, order.thirdPartyMethod].filter(Boolean).join(' · ') || '客服确认',
      createdAtText: firstValue([order.createdAt, order.orderTime], '')
    })
  },

  viewOrders: function () {
    storage.setOrderFilter('pendingPay')
    wx.switchTab({
      url: '/pages/orders/orders'
    })
  },

  contactService: function () {
    wx.navigateTo({
      url: '/pages/contact/contact'
    })
  },

  goHome: function () {
    wx.switchTab({
      url: '/pages/index/index'
    })
  }
})
