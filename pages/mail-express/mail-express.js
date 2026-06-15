const mockData = require('../../utils/mockData')
const orderPage = require('../../utils/orderPage')
const storage = require('../../utils/storage')

function formatMoney(value) {
  const number = Number(value)
  return (isNaN(number) || number < 0 ? 0 : number).toFixed(2)
}

function getSelectedSku(skuId) {
  return mockData.skuOptions.find(function (item) {
    return item.id === skuId
  }) || mockData.skuOptions[0]
}

const pageDefinition = orderPage.createOrderPage({
  title: '快递配送下单',
  subtitle: '填写收件信息后，客服会确认库存、运费和发货时间',
  deliveryMethod: '快递',
  thirdPartyMethod: '顺丰快递',
  requiresRecipient: true,
  requiresRegion: true,
  useRecipientAsBuyerPhone: true,
  useExpressPrice: true,
  simpleExpressOrder: true,
  submitText: '去确认订单'
})

const baseUpdateAmounts = pageDefinition.updateAmounts

pageDefinition.data = Object.assign({}, pageDefinition.data, {
  showRuleDetails: false,
  expressRuleSummary: '',
  expressRuleDetail: '',
  remoteNotice: '',
  expressTransitNotice: '',
  expressOrderTip: '',
  expressSubmitNotice: '',
  referenceShippingFeeMin: 0,
  referenceShippingFeeMax: 0,
  referenceShippingFeeText: '约 ¥0.00',
  isRemoteDelivery: false,
  productSubtotalMoneyText: '0.00',
  estimatedTotalRangeText: '约 ¥0.00'
})

pageDefinition.toggleRuleDetails = function () {
  this.setData({
    showRuleDetails: !this.data.showRuleDetails
  })
}

pageDefinition.decreaseQuantity = function () {
  const quantity = Math.max(1, parseInt(this.data.form.quantity, 10) || 1)
  if (quantity <= 1) {
    return
  }
  this.setData({
    'form.quantity': String(quantity - 1)
  })
  this.updateAmounts()
}

pageDefinition.increaseQuantity = function () {
  const quantity = Math.max(1, parseInt(this.data.form.quantity, 10) || 1)
  this.setData({
    'form.quantity': String(quantity + 1)
  })
  this.updateAmounts()
}

pageDefinition.updateAmounts = function () {
  baseUpdateAmounts.call(this)

  const config = this.data.config || storage.getConfig()
  const deliveryConfig = storage.getExpressDeliveryConfig(config)
  const sku = getSelectedSku(this.data.form.skuId)
  const quantity = Math.max(1, parseInt(this.data.form.quantity, 10) || 1)
  const unitRange = storage.getReferenceShippingRange(config, sku.spec, this.data.form.region)
  const rangeMin = Math.round(unitRange.min * quantity * 100) / 100
  const rangeMax = Math.round(unitRange.max * quantity * 100) / 100
  const productAmount = Number(this.data.productAmount) || 0
  const totalMin = productAmount + rangeMin
  const totalMax = productAmount + rangeMax
  const rangeText = rangeMin === rangeMax
    ? '约 ¥' + formatMoney(rangeMin)
    : '约 ¥' + formatMoney(rangeMin) + '-' + formatMoney(rangeMax)
  const totalText = totalMin === totalMax
    ? '约 ¥' + formatMoney(totalMin)
    : '约 ¥' + formatMoney(totalMin) + '-' + formatMoney(totalMax)

  this.setData({
    expressRuleSummary: deliveryConfig.coldChainSummary,
    expressRuleDetail: deliveryConfig.coldChainDetail,
    remoteNotice: deliveryConfig.remoteNotice,
    expressTransitNotice: deliveryConfig.transitNotice,
    expressOrderTip: deliveryConfig.orderTip,
    expressSubmitNotice: deliveryConfig.submitNotice,
    referenceShippingFeeMin: rangeMin,
    referenceShippingFeeMax: rangeMax,
    referenceShippingFeeText: rangeText,
    isRemoteDelivery: unitRange.isRemote,
    expressDeliveryNotice: deliveryConfig.coldChainDetail,
    productSubtotalMoneyText: formatMoney(productAmount),
    estimatedTotalRangeText: totalText
  })
}

Page(pageDefinition)
