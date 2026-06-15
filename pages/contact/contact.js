const mockData = require('../../utils/mockData')

Page({
  data: {
    contact: mockData.contactService
  },

  copyWechat: function () {
    wx.setClipboardData({
      data: this.data.contact.wechatId,
      success: function () {
        wx.showToast({
          title: '已复制微信号',
          icon: 'success'
        })
      }
    })
  }
})
