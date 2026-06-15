const storage = require('./utils/storage')

App({
  onLaunch() {
    storage.initMockData()
  },

  globalData: {
    appName: '荔枝有期',
    launchWindow: '预计2027年6月底至7月中旬开售',
    openid: ''
  }
})
