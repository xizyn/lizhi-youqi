const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')

const expressSkuOrder = ['guiwei-5', 'guiwei-10', 'nuomici-5', 'nuomici-10', 'mixed-5', 'mixed-10']

function formatMoney(value) {
  const number = Number(value)
  return (isNaN(number) || number < 0 ? 0 : number).toFixed(2)
}

function buildExpressProducts(config, selectedSkuId) {
  const skuStatusMap = config.skuStatusMap || {}
  const deliveryConfig = storage.getExpressDeliveryConfig(config)

  return expressSkuOrder.map(function (skuId) {
    return mockData.skuOptions.find(function (item) {
      return item.id === skuId
    })
  }).filter(function (item) {
    return !!item
  }).map(function (item) {
    const status = skuStatusMap[item.id] || {}
    const price = Number((config.prices || {})[item.priceKey]) || Number(item.expressPrice) || 0
    const disabled = status.isListed === false || status.isSoldOut === true
    const selected = item.id === selectedSkuId
    const shippingRange = storage.getReferenceShippingRange(config, item.spec, [])

    return Object.assign({}, item, {
      price: price,
      priceText: '¥' + formatMoney(price),
      disabled: disabled,
      statusText: status.isListed === false ? '已下架' : (status.isSoldOut === true ? '已售罄' : ''),
      selected: selected,
      selectedClass: selected ? 'selected' : '',
      selectText: disabled ? '不可选' : (selected ? '已选' : '选择'),
      referenceShippingText: shippingRange.text,
      referenceShippingNote: '实际以发货前确认或顺丰结算为准',
      mixNotice: item.variety === '混装' ? deliveryConfig.mixNotice : ''
    })
  })
}

Page({
  data: {
    products: [],
    selectedSkuId: '',
    selectedProduct: null,
    listNotice: '',
    transitNotice: ''
  },

  onShow: function () {
    const config = storage.getConfig()
    const deliveryConfig = storage.getExpressDeliveryConfig(config)
    const products = buildExpressProducts(config, this.data.selectedSkuId)
    const selectedProduct = products.find(function (item) {
      return item.id === this.data.selectedSkuId
    }, this) || null

    this.setData({
      products: products,
      selectedProduct: selectedProduct,
      listNotice: deliveryConfig.listNotice,
      transitNotice: deliveryConfig.transitNotice
    })
  },

  selectProduct: function (e) {
    const skuId = e.currentTarget.dataset.sku
    if (!skuId) {
      return
    }
    const product = this.data.products.find(function (item) {
      return item.id === skuId
    })
    if (product && product.disabled) {
      wx.showToast({ title: product.statusText || '暂不可选', icon: 'none' })
      return
    }

    const config = storage.getConfig()
    const products = buildExpressProducts(config, skuId)
    const selectedProduct = products.find(function (item) {
      return item.id === skuId
    }) || null

    this.setData({
      selectedSkuId: skuId,
      selectedProduct: selectedProduct,
      products: products
    })
  },

  goRecipientForm: function () {
    if (!this.data.selectedSkuId) {
      wx.showToast({
        title: '请先选择商品',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/mail-express/mail-express?skuId=' + this.data.selectedSkuId
    })
  }
})
