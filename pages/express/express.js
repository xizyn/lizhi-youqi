const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')
const stock = require('../../utils/stock')

const expressSkuOrder = ['guiwei-5', 'guiwei-10', 'nuomici-5', 'nuomici-10', 'mixed-5', 'mixed-10']

function formatMoney(value) {
  const number = Number(value)
  return (isNaN(number) || number < 0 ? 0 : number).toFixed(2)
}

function buildExpressProducts(config, selectedSkuId) {
  const skuStatusMap = config.skuStatusMap || {}
  const deliveryConfig = storage.getExpressDeliveryConfig(config)
  const orders = storage.getOrders()

  return expressSkuOrder.map(function (skuId) {
    return mockData.skuOptions.find(function (item) {
      return item.id === skuId
    })
  }).filter(function (item) {
    return !!item
  }).map(function (item) {
    const status = skuStatusMap[item.id] || {}
    const price = Number((config.prices || {})[item.priceKey]) || Number(item.expressPrice) || 0
    const stockState = stock.getSkuStockState(config, orders, item, 1)
    const manuallyDisabled = status.isListed === false || status.isSoldOut === true
    const disabled = manuallyDisabled || stockState.disabled
    const selected = item.id === selectedSkuId
    const shippingRange = storage.getReferenceShippingRange(config, item.spec, [])
    const statusText = status.isListed === false ? '已下架' : (status.isSoldOut === true ? '已售罄' : (stockState.disabled ? '库存不足' : ''))

    return Object.assign({}, item, {
      price: price,
      priceText: '¥' + formatMoney(price),
      disabled: disabled,
      statusText: statusText,
      maxQuantity: stockState.maxQuantity,
      selected: selected,
      selectedClass: selected ? 'selected' : '',
      selectText: disabled ? (stockState.disabled ? '库存不足' : '不可选') : (selected ? '已选' : '选择'),
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
    const sku = mockData.skuOptions.find(function (item) {
      return item.id === this.data.selectedSkuId
    }, this)
    const stockState = stock.getSkuStockState(storage.getConfig(), storage.getOrders(), sku, 1)
    if (stockState.disabled) {
      wx.showToast({
        title: stock.STOCK_ERROR_MESSAGE,
        icon: 'none'
      })
      this.onShow()
      return
    }

    wx.navigateTo({
      url: '/pages/mail-express/mail-express?skuId=' + this.data.selectedSkuId
    })
  }
})
