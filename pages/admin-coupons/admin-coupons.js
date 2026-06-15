const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')

function returnToProfile() {
  wx.switchTab({
    url: '/pages/profile/profile',
    fail: function () {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  })
}

function indexOfValue(list, value) {
  const index = list.indexOf(value)
  return index < 0 ? 0 : index
}

function toNumber(value) {
  const number = Number(value)
  return isNaN(number) || number < 0 ? 0 : number
}

function formatDiscount(coupon) {
  if (coupon.discountRate) {
    return coupon.discountRate + '折'
  }
  if (coupon.discountAmount) {
    return '减' + coupon.discountAmount + '元'
  }
  return '待设置'
}

function formatThreshold(coupon) {
  return Number(coupon.thresholdAmount) > 0 ? '满' + coupon.thresholdAmount + '元可用' : '无门槛'
}

function normalizeCoupon(coupon) {
  return Object.assign({}, coupon, {
    thresholdText: formatThreshold(coupon),
    discountText: formatDiscount(coupon),
    stockText: coupon.totalCount ? coupon.issuedCount + '/' + coupon.totalCount : coupon.issuedCount + '/不限',
    statusClass: coupon.status === '已上架' ? 'active' : (coupon.status === '已停用' ? 'disabled' : 'draft')
  })
}

function defaultForm() {
  return {
    couponName: '',
    couponType: '满减券',
    thresholdAmount: '',
    discountAmount: '',
    discountRate: '',
    applyScene: '全部',
    validStart: '2027-06-20',
    validEnd: '2027-07-20',
    totalCount: '',
    status: '未上架'
  }
}

Page({
  data: {
    authorized: false,
    coupons: [],
    form: defaultForm(),
    couponTypes: mockData.couponTypes,
    applyScenes: mockData.couponApplyScenes,
    statuses: mockData.couponStatuses,
    couponTypeIndex: 0,
    applySceneIndex: 0,
    statusIndex: 0
  },

  onShow: function () {
    const config = storage.getConfig()
    if (!storage.hasAdminAccess(config)) {
      wx.showModal({
        title: '优惠券管理',
        content: '无权限访问',
        showCancel: false,
        success: returnToProfile
      })
      return
    }

    this.setData({ authorized: true })
    this.loadCoupons()
  },

  loadCoupons: function () {
    this.setData({
      coupons: storage.getAdminCoupons().map(normalizeCoupon)
    })
  },

  handleInput: function (e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: e.detail.value
    })
  },

  handlePicker: function (e) {
    const field = e.currentTarget.dataset.field
    const index = Number(e.detail.value)
    const maps = {
      couponType: this.data.couponTypes,
      applyScene: this.data.applyScenes,
      status: this.data.statuses
    }
    const indexFields = {
      couponType: 'couponTypeIndex',
      applyScene: 'applySceneIndex',
      status: 'statusIndex'
    }

    this.setData({
      ['form.' + field]: maps[field][index],
      [indexFields[field]]: index
    })
  },

  resetForm: function () {
    const form = defaultForm()
    this.setData({
      form: form,
      couponTypeIndex: indexOfValue(this.data.couponTypes, form.couponType),
      applySceneIndex: indexOfValue(this.data.applyScenes, form.applyScene),
      statusIndex: indexOfValue(this.data.statuses, form.status)
    })
  },

  addCoupon: function () {
    const form = this.data.form
    if (!form.couponName) {
      wx.showToast({ title: '请填写优惠券名称', icon: 'none' })
      return
    }
    if (!form.discountAmount && !form.discountRate) {
      wx.showToast({ title: '请填写减免金额或折扣', icon: 'none' })
      return
    }

    storage.addAdminCoupon({
      couponName: form.couponName,
      couponType: form.couponType,
      thresholdAmount: toNumber(form.thresholdAmount),
      discountAmount: form.discountAmount ? toNumber(form.discountAmount) : '',
      discountRate: form.discountRate ? toNumber(form.discountRate) : '',
      applyScene: form.applyScene,
      validStart: form.validStart,
      validEnd: form.validEnd,
      totalCount: toNumber(form.totalCount),
      issuedCount: 0,
      usedCount: 0,
      status: form.status
    })
    this.resetForm()
    this.loadCoupons()
    wx.showToast({ title: '已新增优惠券', icon: 'success' })
  },

  setCouponStatus: function (e) {
    const couponId = e.currentTarget.dataset.id
    const status = e.currentTarget.dataset.status
    storage.updateAdminCoupon(couponId, { status: status })
    this.loadCoupons()
    wx.showToast({ title: '已更新状态', icon: 'success' })
  },

  simulateIssue: function (e) {
    const couponId = e.currentTarget.dataset.id
    const result = storage.simulateIssueCoupon(couponId)
    this.loadCoupons()
    wx.showToast({
      title: result.ok ? '已模拟发放' : result.message,
      icon: result.ok ? 'success' : 'none'
    })
  }
})
