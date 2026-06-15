const afterSaleService = require('../../utils/afterSaleService')

Page({
  data: {
    orderId: '',
    order: {},
    snapshot: {},
    config: {},
    types: [],
    methods: [],
    selectedType: '',
    selectedMethod: '',
    description: '',
    remaining: 300,
    evidenceImages: [],
    deadlineText: '',
    submitting: false
  },

  onLoad: function (options) {
    const orderId = decodeURIComponent(options.orderId || '')
    const order = afterSaleService.getOrderById(orderId)
    const config = afterSaleService.getConfig()
    if (!order) {
      wx.showModal({
        title: '无法申请',
        content: '订单不存在或已被删除。',
        showCancel: false,
        success: function () { wx.navigateBack() }
      })
      return
    }
    const active = afterSaleService.getActiveAfterSale(order.id)
    if (active) {
      wx.redirectTo({
        url: '/pages/after-sale-detail/after-sale-detail?id=' + encodeURIComponent(active.afterSaleId)
      })
      return
    }
    const deadline = afterSaleService.checkDeadline(order)
    this.setData({
      orderId: order.id,
      order: order,
      snapshot: afterSaleService.getOrderSnapshot(order),
      config: config,
      types: config.types || [],
      methods: config.requestMethods || [],
      selectedType: (config.types || [])[0] || '',
      selectedMethod: (config.requestMethods || [])[0] || '',
      remaining: config.descriptionMaxLength,
      deadlineText: deadline.ok ? '申请截止：' + deadline.deadline : deadline.message
    })
  },

  selectType: function (e) {
    this.setData({ selectedType: e.currentTarget.dataset.value })
  },

  selectMethod: function (e) {
    this.setData({ selectedMethod: e.currentTarget.dataset.value })
  },

  inputDescription: function (e) {
    const value = e.detail.value || ''
    this.setData({
      description: value,
      remaining: Math.max(0, this.data.config.descriptionMaxLength - value.length)
    })
  },

  chooseEvidence: function () {
    const that = this
    const remaining = this.data.config.evidenceMaxCount - this.data.evidenceImages.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传6张图片', icon: 'none' })
      return
    }
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: function (res) {
          const paths = (res.tempFiles || []).map(function (item) { return item.tempFilePath })
          that.setData({ evidenceImages: that.data.evidenceImages.concat(paths) })
        }
      })
      return
    }
    wx.chooseImage({
      count: remaining,
      success: function (res) {
        that.setData({ evidenceImages: that.data.evidenceImages.concat(res.tempFilePaths || []) })
      }
    })
  },

  previewEvidence: function (e) {
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: this.data.evidenceImages
    })
  },

  removeEvidence: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const nextImages = this.data.evidenceImages.slice()
    nextImages.splice(index, 1)
    this.setData({ evidenceImages: nextImages })
  },

  openRules: function () {
    wx.navigateTo({ url: '/pages/after-sale-rules/after-sale-rules' })
  },

  submitApplication: function () {
    if (this.data.submitting) {
      return
    }
    const payload = {
      type: this.data.selectedType,
      requestMethod: this.data.selectedMethod,
      description: this.data.description,
      evidenceImages: this.data.evidenceImages
    }
    const validation = afterSaleService.validateApplication(this.data.orderId, payload)
    if (!validation.ok) {
      if (validation.code === 'duplicate' && validation.afterSale) {
        wx.redirectTo({
          url: '/pages/after-sale-detail/after-sale-detail?id=' + encodeURIComponent(validation.afterSale.afterSaleId)
        })
        return
      }
      wx.showToast({ title: validation.message, icon: 'none', duration: 2600 })
      return
    }
    const that = this
    this.setData({ submitting: true })
    afterSaleService.persistEvidenceImages(this.data.evidenceImages)
      .then(function (paths) {
        const result = afterSaleService.createAfterSale(that.data.orderId, Object.assign({}, payload, {
          evidenceImages: paths
        }))
        that.setData({ submitting: false })
        if (!result.ok) {
          wx.showToast({ title: result.message, icon: 'none' })
          return
        }
        wx.showToast({ title: '售后申请已提交', icon: 'success' })
        setTimeout(function () {
          wx.redirectTo({
            url: '/pages/after-sale-detail/after-sale-detail?id=' + encodeURIComponent(result.record.afterSaleId)
          })
        }, 500)
      })
      .catch(function () {
        that.setData({ submitting: false })
        wx.showToast({ title: '凭证图片保存失败，请重试', icon: 'none' })
      })
  }
})
