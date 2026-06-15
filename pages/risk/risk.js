const mockData = require('../../utils/mockData')

Page({
  data: {
    riskItems: mockData.riskItems
  },

  navigateTo(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  }
})
