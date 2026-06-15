const mockData = require('../../utils/mockData')

Page({
  data: {
    products: mockData.products
  },

  navigateTo(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  }
})
