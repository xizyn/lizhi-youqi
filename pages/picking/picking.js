const orderPage = require('../../utils/orderPage')

function formatMoney(value) {
  const number = Number(value)
  return (isNaN(number) || number < 0 ? 0 : number).toFixed(2)
}

function formatWeight(value) {
  const number = parseFloat(value)
  if (isNaN(number) || number <= 0) {
    return '0'
  }
  const rounded = Math.round(number * 10) / 10
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1)
}

const pageDefinition = orderPage.createOrderPage({
  title: '自提下单',
  subtitle: '提交后由客服确认库存、价格和自提时间。',
  deliveryMethod: '自提',
  customWeightOrder: true,
  requiresPickup: true,
  submitText: '提交自提订单'
})

const baseUpdateAmounts = pageDefinition.updateAmounts
const initialPrices = (pageDefinition.data.config && pageDefinition.data.config.prices) || {}

pageDefinition.data = Object.assign({}, pageDefinition.data, {
  guiweiUnitPriceText: formatMoney(initialPrices.guiweiPickupNearbyUnit),
  nuomiciUnitPriceText: formatMoney(initialPrices.nuomiciPickupNearbyUnit),
  guiweiWeightText: '0',
  nuomiciWeightText: '0',
  guiweiAmountMoneyText: '0.00',
  nuomiciAmountMoneyText: '0.00',
  giftBoxFeeMoneyText: '0.00',
  giftBox5UnitPriceText: formatMoney(initialPrices.giftBox5),
  giftBox10UnitPriceText: formatMoney(initialPrices.giftBox10)
})

pageDefinition.updateAmounts = function () {
  baseUpdateAmounts.call(this)

  const prices = (this.data.config && this.data.config.prices) || {}
  this.setData({
    guiweiUnitPriceText: formatMoney(this.data.guiweiUnitPrice),
    nuomiciUnitPriceText: formatMoney(this.data.nuomiciUnitPrice),
    guiweiWeightText: formatWeight(this.data.form.guiweiWeight),
    nuomiciWeightText: formatWeight(this.data.form.nuomiciWeight),
    guiweiAmountMoneyText: formatMoney(this.data.guiweiAmount),
    nuomiciAmountMoneyText: formatMoney(this.data.nuomiciAmount),
    giftBoxFeeMoneyText: formatMoney(this.data.giftBoxFee),
    giftBox5UnitPriceText: formatMoney(prices.giftBox5),
    giftBox10UnitPriceText: formatMoney(prices.giftBox10)
  })
}

Page(pageDefinition)
