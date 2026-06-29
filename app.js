const storage = require('./utils/storage')

App({
  onLaunch() {
    if (wx.cloud && typeof wx.cloud.init === 'function') {
      wx.cloud.init({
        traceUser: true
      })
    }
    storage.initMockData()
  },

  globalData: {
    appName: '荔枝有期',
    launchWindow: '预计2027年6月底至7月中旬开售',
    openid: ''
  }
})
