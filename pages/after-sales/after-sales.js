const afterSaleService = require('../../utils/afterSaleService')

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解决' }
]

function formatRecord(record) {
  const meta = afterSaleService.getStatusMeta(record.status)
  return Object.assign({}, record, {
    statusText: meta.label,
    statusTone: meta.tone,
    productText: record.productName + (record.specText ? ' · ' + record.specText : ''),
    latestReply: record.rejectReason || record.adminReply || '管理员暂未回复'
  })
}

Page({
  data: {
    loading: true,
    applicationWindowHours: 24,
    filters: [],
    activeFilter: 'all',
    records: []
  },

  onShow: function () {
    const that = this
    this.setData({ loading: true }, function () {
      that.loadRecords()
    })
  },

  loadRecords: function () {
    const config = afterSaleService.getConfig()
    const allRecords = afterSaleService.getUserAfterSales().map(formatRecord)
    const activeFilter = this.data.activeFilter
    const records = activeFilter === 'all'
      ? allRecords
      : allRecords.filter(function (item) { return item.status === activeFilter })
    this.setData({
      loading: false,
      applicationWindowHours: config.applicationWindowHours || 24,
      records: records,
      filters: FILTERS.map(function (item) {
        return Object.assign({}, item, {
          count: item.key === 'all'
            ? allRecords.length
            : allRecords.filter(function (record) { return record.status === item.key }).length,
          active: item.key === activeFilter
        })
      })
    })
  },

  switchFilter: function (e) {
    this.setData({ activeFilter: e.currentTarget.dataset.key || 'all' })
    this.loadRecords()
  },

  openDetail: function (e) {
    wx.navigateTo({
      url: '/pages/after-sale-detail/after-sale-detail?id=' + encodeURIComponent(e.currentTarget.dataset.id)
    })
  },

  openRules: function () {
    wx.navigateTo({ url: '/pages/after-sale-rules/after-sale-rules' })
  },

  openOrders: function () {
    wx.switchTab({ url: '/pages/orders/orders' })
  }
})
