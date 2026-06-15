const afterSaleService = require('../../utils/afterSaleService')

Page({
  data: {
    config: {}
  },

  onLoad: function () {
    this.setData({ config: afterSaleService.getConfig() })
  },

  contactService: function () {
    wx.navigateTo({ url: '/pages/contact/contact' })
  }
})
