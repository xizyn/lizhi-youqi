const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')
const afterSaleService = require('../../utils/afterSaleService')

function firstValue(values, fallback) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value !== '' && value !== null && typeof value !== 'undefined') {
      return value
    }
  }
  return fallback || ''
}

function toMoneyText(value, fallback) {
  if (value === '' || value === null || typeof value === 'undefined' || isNaN(Number(value))) {
    return fallback || '待客服确认'
  }
  return value + '元'
}

function normalizeWeight(value) {
  const number = parseFloat(value)
  if (!number || number < 0) {
    return 0
  }
  return Math.round(number * 10) / 10
}

function normalizeStatus(status) {
  const aliases = {
    pending_payment: '待付款',
    paid: '已支付',
    preparing: '待打包',
    packed: '待发货/待自提',
    shipped: '已送出',
    delivered: '已送达',
    picked_up: '已自提',
    completed: '已完成',
    cancelled: '已取消'
  }
  if (aliases[status]) {
    return aliases[status]
  }
  if (status === '已付款') {
    return '已支付'
  }
  if (status === '已发货') {
    return '已送出'
  }
  if (status === '待配送' || status === '待配送/待自提') {
    return '待发货/待自提'
  }
  return status || '已提交'
}

function getStatusClass(status) {
  const map = {
    '待付款': 'status-pending-pay',
    '已支付': 'status-paid',
    '待采摘': 'status-picking',
    '待打包': 'status-pending-delivery',
    '待发货/待自提': 'status-pending-delivery',
    '待发货': 'status-pending-delivery',
    '待自提': 'status-pending-delivery',
    '已送出': 'status-shipped',
    '已送达': 'status-shipped',
    '已自提': 'status-shipped',
    '已完成': 'status-done',
    '已取消': 'status-cancelled',
    '售后处理中': 'status-service'
  }
  return map[normalizeStatus(status)] || 'status-default'
}

function getStatusIndex(status) {
  const normalized = normalizeStatus(status)
  const index = mockData.orderStatuses.indexOf(normalized)
  return index < 0 ? 0 : index
}

function getCustomerName(order) {
  return firstValue([
    order.recipientName,
    order.buyerName,
    order.pickupName,
    order.name,
    order.wechatId
  ], '未填写')
}

function getCustomerPhone(order) {
  return firstValue([
    order.recipientPhone,
    order.buyerPhone,
    order.phone
  ], '未填写')
}

function getDeliveryMethod(order) {
  const deliveryMethod = firstValue([order.deliveryMethod, order.deliveryType], '客服确认')
  const thirdPartyMethod = order.thirdPartyMethod || ''
  return deliveryMethod + (thirdPartyMethod ? ' / ' + thirdPartyMethod : '')
}

function getAddress(order) {
  const pickupTime = order.pickupDate ? order.pickupDate + ' ' + (order.pickupTimeSlot || '') : ''
  return firstValue([
    order.address,
    order.deliveryAddress,
    order.pickupAddress,
    pickupTime,
    order.area
  ], '客服确认')
}

function buildDetail(order, activeAfterSale) {
  const source = order || {}
  const orderStatus = normalizeStatus(source.orderStatus)
  const guiweiWeight = normalizeWeight(source.guiweiWeight)
  const nuomiciWeight = normalizeWeight(source.nuomiciWeight)
  const totalWeight = normalizeWeight(source.totalWeight) || Math.round((guiweiWeight + nuomiciWeight) * 10) / 10
  const quantity = Number(source.quantity || source.count) || 1
  const productName = firstValue([source.skuName, source.productName, source.productTitle, source.variety], '荔枝')
  const specText = firstValue([source.spec, source.fruitWeightText, source.specText], source.customWeightOrder ? '自定义斤数' : '待确认')
  const remark = firstValue([source.remark, source.note, source.message, source.serviceNote], '无')

  return {
    orderNoText: source.orderNo || source.id || '订单号待生成',
    orderStatus: orderStatus,
    statusClass: getStatusClass(orderStatus),
    statusIndex: getStatusIndex(orderStatus),
    canApplyAfterSale: afterSaleService.isEligibleOrderStatus(source.orderStatus),
    afterSaleActionText: activeAfterSale ? '查看售后进度' : '申请售后',
    customerRows: [
      { label: '姓名', value: getCustomerName(source) },
      { label: '手机号', value: getCustomerPhone(source) }
    ],
    productRows: [
      { label: '商品名称', value: productName },
      { label: '桂味斤数', value: guiweiWeight + '斤' },
      { label: '糯米糍斤数', value: nuomiciWeight + '斤' },
      { label: '规格', value: specText },
      { label: '数量', value: source.customWeightOrder ? '共 ' + totalWeight + '斤' : quantity + '箱' }
    ],
    deliveryRows: [
      { label: '配送方式', value: getDeliveryMethod(source) },
      { label: '自提时间/收货地址', value: getAddress(source) },
      { label: '顺丰单号', value: source.trackingNo || '客服填写后显示' },
      { label: '发货/送出时间', value: source.shipTime || source.shippedAt || '客服确认后显示' }
    ],
    amountRows: [
      { label: '商品金额', value: toMoneyText(source.productAmount, '待客服确认') },
      { label: '礼盒费用', value: toMoneyText(source.giftBoxFee || 0, '0元') },
      { label: '快递费用', value: toMoneyText(firstValue([source.estimatedShippingFee, source.freightAmount], ''), '客服确认') },
      { label: '总金额', value: toMoneyText(firstValue([source.totalAmount, source.payAmount, source.amount], ''), '待客服确认') }
    ],
    metaRows: [
      { label: '下单时间', value: source.createdAt || '时间待确认' },
      { label: '备注', value: remark }
    ]
  }
}

Page({
  data: {
    id: '',
    order: {},
    detail: {},
    orderStatuses: mockData.orderStatuses,
    showAdminActions: false
  },

  onLoad: function (options) {
    this.setData({ id: decodeURIComponent(options.id || '') })
  },

  onShow: function () {
    this.loadOrder()
  },

  loadOrder: function () {
    const id = this.data.id
    const order = storage.getOrders().filter(function (item) {
      return String(item.id) === String(id)
    })[0]
    const config = storage.getConfig()

    if (!order) {
      wx.showToast({ title: '订单不存在', icon: 'none' })
      return
    }

    const activeAfterSale = afterSaleService.getActiveAfterSale(order.id)
    this.setData({
      order: order,
      detail: buildDetail(order, activeAfterSale),
      activeAfterSale: activeAfterSale || {},
      showAdminActions: storage.hasAdminAccess(config)
    })
  },

  contactService: function () {
    wx.navigateTo({ url: '/pages/contact/contact' })
  },

  applyAfterSale: function () {
    const activeAfterSale = this.data.activeAfterSale
    if (activeAfterSale && activeAfterSale.afterSaleId) {
      wx.navigateTo({
        url: '/pages/after-sale-detail/after-sale-detail?id=' + encodeURIComponent(activeAfterSale.afterSaleId)
      })
      return
    }
    wx.navigateTo({
      url: '/pages/after-sale-apply/after-sale-apply?orderId=' + encodeURIComponent(this.data.id)
    })
  },

  handleStatusChange: function (e) {
    const status = this.data.orderStatuses[Number(e.detail.value)]
    storage.updateOrder(this.data.id, { orderStatus: status })
    this.loadOrder()
    wx.showToast({ title: '状态已更新', icon: 'success' })
  },

  markStocked: function () {
    storage.updateOrder(this.data.id, {
      orderStatus: '待发货/待自提',
      stockedAt: storage.formatTime(new Date())
    })
    this.loadOrder()
    wx.showToast({ title: '已标记备货', icon: 'success' })
  },

  markShipped: function () {
    storage.updateOrder(this.data.id, {
      orderStatus: '已送出',
      shippedAt: storage.formatTime(new Date()),
      shipTime: storage.formatTime(new Date())
    })
    this.loadOrder()
    wx.showToast({ title: '已标记送出', icon: 'success' })
  },

  inputTrackingNo: function () {
    const that = this
    wx.showModal({
      title: '填写顺丰单号',
      content: '',
      editable: true,
      placeholderText: '请输入顺丰单号',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        storage.updateOrder(that.data.id, { trackingNo: res.content || '' })
        that.loadOrder()
        wx.showToast({ title: '已保存单号', icon: 'success' })
      }
    })
  },

  markCompleted: function () {
    storage.updateOrder(this.data.id, {
      orderStatus: '已完成',
      completedAt: storage.formatTime(new Date())
    })
    this.loadOrder()
    wx.showToast({ title: '已标记完成', icon: 'success' })
  }
})
