const storage = require('../../utils/storage')
const afterSaleService = require('../../utils/afterSaleService')
const afterSaleLogService = require('../../utils/afterSaleLogService')

Page({
  data: {
    id: '',
    record: {},
    statusMeta: {},
    timeline: [],
    logs: [],
    canCancel: false,
    supplementOpen: false,
    supplementContent: '',
    supplementRemaining: 200,
    supplementImages: [],
    submittingSupplement: false
  },

  onLoad: function (options) {
    this.setData({ id: decodeURIComponent(options.id || '') })
  },

  onShow: function () {
    this.loadRecord()
  },

  loadRecord: function () {
    const record = storage.getAfterSaleById(this.data.id)
    if (!record) {
      wx.showModal({
        title: '记录不存在',
        content: '售后记录不存在或已被删除。',
        showCancel: false,
        success: function () { wx.navigateBack() }
      })
      return
    }
    this.setData({
      record: record,
      statusMeta: afterSaleService.getStatusMeta(record.status),
      timeline: afterSaleService.buildTimeline(record),
      logs: afterSaleLogService.getLogs(record.afterSaleId),
      canCancel: record.status === 'pending'
    })
  },

  previewOriginalImage: function (e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.record.evidenceImages || []
    })
  },

  previewLogImage: function (e) {
    const log = this.data.logs[Number(e.currentTarget.dataset.logIndex)]
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: (log && log.images) || []
    })
  },

  toggleSupplement: function () {
    this.setData({ supplementOpen: !this.data.supplementOpen })
  },

  inputSupplement: function (e) {
    const value = e.detail.value || ''
    this.setData({
      supplementContent: value,
      supplementRemaining: Math.max(0, 200 - value.length)
    })
  },

  chooseSupplementImages: function () {
    const that = this
    const remaining = 6 - this.data.supplementImages.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多选择6张图片', icon: 'none' })
      return
    }
    const appendPaths = function (paths) {
      that.setData({
        supplementImages: that.data.supplementImages.concat(paths).slice(0, 6)
      })
    }
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: function (res) {
          appendPaths((res.tempFiles || []).map(function (item) { return item.tempFilePath }))
        }
      })
      return
    }
    wx.chooseImage({
      count: remaining,
      success: function (res) { appendPaths(res.tempFilePaths || []) }
    })
  },

  previewSupplementImage: function (e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.supplementImages
    })
  },

  removeSupplementImage: function (e) {
    const images = this.data.supplementImages.slice()
    images.splice(Number(e.currentTarget.dataset.index), 1)
    this.setData({ supplementImages: images })
  },

  submitSupplement: function () {
    if (this.data.submittingSupplement) {
      return
    }
    const content = String(this.data.supplementContent || '').trim()
    if (!content && !this.data.supplementImages.length) {
      wx.showToast({ title: '请填写补充说明或选择图片', icon: 'none' })
      return
    }
    const that = this
    this.setData({ submittingSupplement: true })
    afterSaleLogService.persistImages(this.data.supplementImages, this.data.id)
      .then(function (paths) {
        const result = afterSaleLogService.appendLog(that.data.id, {
          content: content,
          images: paths
        }, { role: 'user' })
        that.setData({ submittingSupplement: false })
        if (!result.ok) {
          wx.showToast({ title: result.message, icon: 'none' })
          return
        }
        that.setData({
          supplementOpen: false,
          supplementContent: '',
          supplementRemaining: 200,
          supplementImages: []
        })
        that.loadRecord()
        wx.showToast({ title: '补充记录已保存', icon: 'success' })
      })
      .catch(function () {
        that.setData({ submittingSupplement: false })
        wx.showToast({ title: '图片保存失败，请重试', icon: 'none' })
      })
  },

  contactService: function () {
    const that = this
    wx.showModal({
      title: '联系微信客服',
      content: '联系人工客服时，请主动提供订单号，方便快速核对处理。',
      confirmText: '复制编号',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        wx.setClipboardData({
          data: '订单号：' + (that.data.record.orderNo || '未填写') +
            '\n售后编号：' + (that.data.record.afterSaleId || '未填写'),
          success: function () {
            wx.navigateTo({ url: '/pages/contact/contact' })
          }
        })
      }
    })
  },

  cancelApplication: function () {
    const that = this
    wx.showModal({
      title: '撤销售后申请',
      content: '撤销后将停止本次处理，已有沟通记录仍会保留。',
      confirmText: '确认撤销',
      confirmColor: '#a34a43',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        const result = afterSaleService.cancelAfterSale(that.data.id)
        if (!result.ok) {
          wx.showToast({ title: result.message, icon: 'none' })
          return
        }
        that.loadRecord()
        wx.showToast({ title: '申请已撤销', icon: 'success' })
      }
    })
  }
})
