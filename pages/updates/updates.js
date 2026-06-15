const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')

Page({
  data: {
    updates: mockData.updates,
    salesStatus: mockData.salesStatuses[0]
  },

  onShow() {
    this.setData({
      salesStatus: storage.getSalesStatus()
    })
  },

  navigateTo(e) {
    wx.navigateTo({
      url: e.currentTarget.dataset.url
    })
  }
})
