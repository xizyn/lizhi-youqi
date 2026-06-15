const storage = require('../../utils/storage')

Page({
  data: {
    summary: {
      availablePoints: 0,
      earnedPoints: 0,
      usedPoints: 0,
      rules: [],
      records: []
    }
  },

  onShow: function () {
    this.loadPoints()
  },

  loadPoints: function () {
    this.setData({
      summary: storage.getPointSummary()
    })
  }
})
