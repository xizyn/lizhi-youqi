const storage = require('../../utils/storage')

Page({
  data: {
    reminderCount: 0,
    groupBuyCount: 0,
    pickupCount: 0,
    links: [
      { text: '开售提醒记录', desc: '查看本机保存的预约提醒', url: '/pages/reminder/reminder' },
      { text: '企业团购登记', desc: '提交公司或组织采购意向', url: '/pages/group-buy/group-buy' },
      { text: '预约自提', desc: '登记期望自提时间', url: '/pages/picking/picking' },
      { text: '风险告知', desc: '成熟、运输和自提说明', url: '/pages/risk/risk' },
      { text: '后台入口', desc: '第三阶段整理后台管理页', type: 'admin' }
    ]
  },

  onShow() {
    this.setData({
      reminderCount: storage.getRecords('reminders').length,
      groupBuyCount: storage.getRecords('groupBuys').length,
      pickupCount: storage.getRecords('pickups').length
    })
  },

  handleLinkTap(e) {
    const type = e.currentTarget.dataset.type
    const url = e.currentTarget.dataset.url

    if (type === 'admin') {
      wx.showModal({
        title: '后台入口',
        content: '后台管理页会在第三阶段统一整理。当前阶段先保持首页和表单稳定。'
      })
      return
    }

    if (url) {
      wx.navigateTo({ url: url })
    }
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '请先提交预约信息，客服会根据登记内容联系确认。'
    })
  }
})
