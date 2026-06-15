const mockData = require('../../utils/mockData')

Page({
  data: {
    orchard: mockData.orchard
  },

  navigateTo(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  }
})
