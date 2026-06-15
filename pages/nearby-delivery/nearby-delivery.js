const orderPage = require('../../utils/orderPage')
const storage = require('../../utils/storage')

function toMoney(value) {
  const number = Number(value)
  return isNaN(number) || number < 0 ? 0 : Math.round(number * 100) / 100
}

function formatMoney(value) {
  return toMoney(value).toFixed(2)
}

function normalizeWeight(value) {
  const number = parseFloat(value)
  if (isNaN(number) || number <= 0) {
    return 0
  }
  return Math.round(number * 10) / 10
}

function formatWeight(value) {
  const number = normalizeWeight(value)
  return number % 1 === 0 ? String(number) : number.toFixed(1)
}

function isValidWeight(value) {
  const text = String(value === null || typeof value === 'undefined' ? '' : value).trim()
  return !text || (/^(?:\d+|\d+\.\d|\.\d)$/.test(text) && Number(text) > 0)
}

function normalizeCount(value) {
  const number = parseInt(value, 10)
  return isNaN(number) || number < 1 ? 0 : number
}

function isPhone(value) {
  return /^1[3-9]\d{9}$/.test(String(value || '').trim())
}

function getNearbyConfig(config) {
  return Object.assign({}, config.nearbyDelivery || {})
}

function buildAreaCards(deliveryConfig) {
  const supportedAreas = Array.isArray(deliveryConfig.supportedAreas) ? deliveryConfig.supportedAreas : []
  const areaOptions = Array.isArray(deliveryConfig.areaOptions) && deliveryConfig.areaOptions.length
    ? deliveryConfig.areaOptions
    : supportedAreas.concat(['其他区域'])
  const areaLabels = deliveryConfig.areaLabels || {}

  return areaOptions.map(function (area) {
    return {
      value: area,
      label: areaLabels[area] || area,
      supported: supportedAreas.indexOf(area) >= 0
    }
  })
}

const pageDefinition = orderPage.createOrderPage({
  title: '附近果园直送',
  subtitle: '',
  deliveryMethod: '附近送',
  customWeightOrder: true,
  requiresRecipient: true,
  requiresNearbyArea: true,
  useRecipientAsBuyerPhone: true,
  submitText: '提交附近送订单'
})

const baseReloadConfig = pageDefinition.reloadConfig
const baseUpdateAmounts = pageDefinition.updateAmounts

const initialDeliveryConfig = getNearbyConfig(pageDefinition.data.config)
const initialAreaCards = buildAreaCards(initialDeliveryConfig)
const initialArea = initialAreaCards.find(function (item) {
  return item.supported
})

pageDefinition.data = Object.assign({}, pageDefinition.data, {
  showRuleDetails: false,
  nearbyConfig: initialDeliveryConfig,
  nearbyAreaCards: initialAreaCards,
  form: Object.assign({}, pageDefinition.data.form, {
    nearbyArea: initialArea ? initialArea.value : ''
  }),
  isUnsupportedArea: false,
  nearbySubmitDisabled: pageDefinition.data.submitBlocked,
  deliveryFee: toMoney(initialDeliveryConfig.deliveryFee),
  deliveryFeeMoneyText: formatMoney(initialDeliveryConfig.deliveryFee),
  guiweiUnitPriceText: '0.00',
  nuomiciUnitPriceText: '0.00',
  guiweiWeightText: '0',
  nuomiciWeightText: '0',
  guiweiAmountMoneyText: '0.00',
  nuomiciAmountMoneyText: '0.00',
  giftBoxFeeMoneyText: '0.00',
  giftBox5UnitPriceText: '0.00',
  giftBox10UnitPriceText: '0.00'
})

pageDefinition.reloadConfig = function () {
  baseReloadConfig.call(this)

  const config = storage.getConfig()
  const deliveryConfig = getNearbyConfig(config)
  const areaCards = buildAreaCards(deliveryConfig)
  const supportedAreas = Array.isArray(deliveryConfig.supportedAreas) ? deliveryConfig.supportedAreas : []
  let nearbyArea = this.data.form.nearbyArea
  if (!nearbyArea || areaCards.every(function (item) { return item.value !== nearbyArea })) {
    const firstSupported = areaCards.find(function (item) { return item.supported })
    nearbyArea = firstSupported ? firstSupported.value : ''
  }
  const isUnsupportedArea = supportedAreas.indexOf(nearbyArea) < 0

  this.setData({
    nearbyConfig: deliveryConfig,
    nearbyAreaCards: areaCards,
    'form.nearbyArea': nearbyArea,
    isUnsupportedArea: isUnsupportedArea,
    nearbySubmitDisabled: this.data.submitBlocked || isUnsupportedArea
  })
  this.updateAmounts()
}

pageDefinition.updateAmounts = function () {
  baseUpdateAmounts.call(this)

  const config = this.data.config || storage.getConfig()
  const prices = config.prices || {}
  const deliveryConfig = this.data.nearbyConfig || getNearbyConfig(config)
  const deliveryFee = toMoney(deliveryConfig.deliveryFee)
  const estimatedAmount = toMoney(this.data.productAmount) + toMoney(this.data.giftBoxFee) + deliveryFee

  this.setData({
    guiweiUnitPriceText: formatMoney(this.data.guiweiUnitPrice),
    nuomiciUnitPriceText: formatMoney(this.data.nuomiciUnitPrice),
    guiweiWeightText: formatWeight(this.data.form.guiweiWeight),
    nuomiciWeightText: formatWeight(this.data.form.nuomiciWeight),
    guiweiAmountMoneyText: formatMoney(this.data.guiweiAmount),
    nuomiciAmountMoneyText: formatMoney(this.data.nuomiciAmount),
    giftBoxFeeMoneyText: formatMoney(this.data.giftBoxFee),
    giftBox5UnitPriceText: formatMoney(prices.giftBox5),
    giftBox10UnitPriceText: formatMoney(prices.giftBox10),
    deliveryFee: deliveryFee,
    deliveryFeeMoneyText: formatMoney(deliveryFee),
    estimatedAmount: estimatedAmount,
    estimatedAmountText: estimatedAmount > 0 ? '¥' + formatMoney(estimatedAmount) : '待填写',
    estimatedAmountMoneyText: formatMoney(estimatedAmount)
  })
}

pageDefinition.toggleRuleDetails = function () {
  this.setData({
    showRuleDetails: !this.data.showRuleDetails
  })
}

pageDefinition.selectNearbyArea = function (event) {
  const area = event.currentTarget.dataset.area || ''
  const supportedAreas = this.data.nearbyConfig.supportedAreas || []
  const isUnsupportedArea = supportedAreas.indexOf(area) < 0

  this.setData({
    'form.nearbyArea': area,
    isUnsupportedArea: isUnsupportedArea,
    nearbySubmitDisabled: this.data.submitBlocked || isUnsupportedArea
  })
}

pageDefinition.goPickupOrder = function () {
  wx.navigateTo({
    url: '/pages/picking/picking'
  })
}

pageDefinition.goExpressOrder = function () {
  wx.navigateTo({
    url: '/pages/express/express'
  })
}

pageDefinition.validateNearbyOrder = function () {
  const form = this.data.form
  const supportedAreas = this.data.nearbyConfig.supportedAreas || []
  const guiweiWeight = normalizeWeight(form.guiweiWeight)
  const nuomiciWeight = normalizeWeight(form.nuomiciWeight)

  if (supportedAreas.indexOf(form.nearbyArea) < 0) {
    return this.data.nearbyConfig.unsupportedNotice || '当前区域暂不支持附近送'
  }
  if (!String(form.recipientName || '').trim()) {
    return '请填写您的姓氏'
  }
  if (!isPhone(form.recipientPhone)) {
    return '请填写正确的联系电话'
  }
  if (!String(form.address || '').trim()) {
    return '请填写详细地址'
  }
  if (!isValidWeight(form.guiweiWeight) || !isValidWeight(form.nuomiciWeight)) {
    return '请输入正确的购买斤数'
  }
  if (!guiweiWeight && !nuomiciWeight) {
    return '请输入正确的购买斤数'
  }
  if (form.needGiftBox === '是' && !normalizeCount(form.giftBox5Count) && !normalizeCount(form.giftBox10Count)) {
    return '请选择礼盒数量，或改为不需要礼盒'
  }
  return ''
}

pageDefinition.submitForm = function () {
  if (this.data.submitBlocked) {
    wx.showToast({
      title: '当前暂不能提交订单',
      icon: 'none'
    })
    return
  }

  const error = this.validateNearbyOrder()
  if (error) {
    wx.showToast({
      title: error,
      icon: 'none'
    })
    return
  }

  const form = this.data.form
  const guiweiWeight = normalizeWeight(form.guiweiWeight)
  const nuomiciWeight = normalizeWeight(form.nuomiciWeight)
  const totalWeight = Math.round((guiweiWeight + nuomiciWeight) * 10) / 10
  const giftBox5Count = form.needGiftBox === '是' ? normalizeCount(form.giftBox5Count) : 0
  const giftBox10Count = form.needGiftBox === '是' ? normalizeCount(form.giftBox10Count) : 0
  const productName = guiweiWeight && nuomiciWeight ? '混装' : (guiweiWeight ? '桂味' : '糯米糍')
  const deliveryFee = toMoney(this.data.deliveryFee)
  const recipientName = String(form.recipientName || '').trim()
  const recipientPhone = String(form.recipientPhone || '').trim()
  const detailAddress = String(form.address || '').trim()
  const fullAddress = [form.nearbyArea, detailAddress].filter(Boolean).join(' ')

  const result = storage.saveOrder({
    customWeightOrder: true,
    buyerPhone: recipientPhone,
    phone: recipientPhone,
    deliveryMethod: '附近送',
    skuId: 'custom-weight-nearby',
    skuName: productName + totalWeight + '斤',
    productSkuName: productName + totalWeight + '斤',
    productName: productName,
    variety: productName,
    spec: totalWeight + '斤',
    quantity: 1,
    guiweiWeight: guiweiWeight,
    nuomiciWeight: nuomiciWeight,
    totalWeight: totalWeight,
    guiweiUnitPrice: this.data.guiweiUnitPrice,
    nuomiciUnitPrice: this.data.nuomiciUnitPrice,
    guiweiAmount: this.data.guiweiAmount,
    nuomiciAmount: this.data.nuomiciAmount,
    productAmount: toMoney(this.data.productAmount),
    needGiftBox: form.needGiftBox,
    giftBox5Count: giftBox5Count,
    giftBox10Count: giftBox10Count,
    giftBoxCount: giftBox5Count + giftBox10Count,
    giftBoxFee: toMoney(this.data.giftBoxFee),
    deliveryFee: deliveryFee,
    shippingFee: deliveryFee,
    freightAmount: deliveryFee,
    estimatedShippingFee: deliveryFee,
    totalAmount: toMoney(this.data.estimatedAmount),
    payableAmount: toMoney(this.data.estimatedAmount),
    recipientName: recipientName,
    recipientPhone: recipientPhone,
    nearbyArea: form.nearbyArea,
    address: fullAddress,
    detailAddress: detailAddress,
    shipStatus: '待配送',
    note: String(form.note || '').trim(),
    orderStatus: '待付款'
  })

  if (!result.ok) {
    wx.showToast({
      title: result.message || '订单提交失败',
      icon: 'none'
    })
    return
  }

  wx.showModal({
    title: '订单已提交',
    content: this.data.nearbyConfig.submitSuccessNotice || '客服会尽快联系您确认配送安排。',
    showCancel: false,
    success: function () {
      wx.switchTab({
        url: '/pages/orders/orders'
      })
    }
  })
}

Page(pageDefinition)
