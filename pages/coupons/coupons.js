const storage = require('../../utils/storage')

function formatDiscount(coupon) {
  if (coupon.discountRate) {
    return coupon.discountRate + '折'
  }
  if (coupon.discountAmount) {
    return '¥' + coupon.discountAmount
  }
  return '待确认'
}

function formatThreshold(coupon) {
  return Number(coupon.thresholdAmount) > 0 ? '满' + coupon.thresholdAmount + '元可用' : '无门槛'
}

function formatCoupon(coupon, extra) {
  return Object.assign({}, coupon, extra || {}, {
    amountText: formatDiscount(coupon),
    thresholdText: formatThreshold(coupon),
    validTime: coupon.validStart + ' - ' + coupon.validEnd
  })
}

Page({
  data: {
    tabs: [
      { id: 'available', text: '可用优惠券' },
      { id: 'used', text: '已使用' },
      { id: 'expired', text: '已过期' }
    ],
    activeTab: 'available',
    coupons: []
  },

  onShow: function () {
    this.loadCoupons()
  },

  switchTab: function (e) {
    this.setData({
      activeTab: e.currentTarget.dataset.tab
    })
    this.loadCoupons()
  },

  loadCoupons: function () {
    const activeTab = this.data.activeTab
    const userCoupons = storage.getUserCoupons()
    const claimedIds = userCoupons.map(function (item) {
      return item.couponId
    })
    const claimableCoupons = storage.getAdminCoupons().filter(function (item) {
      return item.status === '已上架' && claimedIds.indexOf(item.couponId) === -1
    }).map(function (item) {
      return formatCoupon(item, {
        displayId: 'claim-' + item.couponId,
        status: '可领取',
        canClaim: true,
        statusClass: 'available'
      })
    })
    let coupons = []

    if (activeTab === 'available') {
      coupons = userCoupons.filter(function (item) {
        return item.status === '可用'
      }).map(function (item) {
        return formatCoupon(item, {
          displayId: item.recordId || item.couponId,
          statusClass: 'available'
        })
      }).concat(claimableCoupons)
    }
    if (activeTab === 'used') {
      coupons = userCoupons.filter(function (item) {
        return item.status === '已使用'
      }).map(function (item) {
        return formatCoupon(item, {
          displayId: item.recordId || item.couponId,
          statusClass: 'used'
        })
      })
    }
    if (activeTab === 'expired') {
      coupons = userCoupons.filter(function (item) {
        return item.status === '已过期'
      }).map(function (item) {
        return formatCoupon(item, {
          displayId: item.recordId || item.couponId,
          statusClass: 'expired'
        })
      })
    }

    this.setData({ coupons: coupons })
  },

  claimCoupon: function (e) {
    const couponId = e.currentTarget.dataset.id
    const result = storage.claimCoupon(couponId)
    this.loadCoupons()
    wx.showToast({
      title: result.ok ? '已领取' : result.message,
      icon: result.ok ? 'success' : 'none'
    })
  },

  openReminder: function () {
    wx.navigateTo({
      url: '/pages/reminder/reminder'
    })
  }
})
