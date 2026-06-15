const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')

function toNumber(value) {
  const number = Number(value)
  return isNaN(number) || number < 0 ? 0 : number
}

function toMoney(value) {
  return Math.round(toNumber(value) * 100) / 100
}

function moneyText(value) {
  return toMoney(value).toFixed(2)
}

function getSkuImage(draft) {
  const sku = mockData.skuOptions.find(function (item) {
    return item.id === draft.skuId
  })
  if (sku && sku.image) {
    return sku.image
  }
  if (toNumber(draft.guiweiWeight) > 0 && toNumber(draft.nuomiciWeight) > 0) {
    return '/assets/images/products/mix-5.jpg'
  }
  if (toNumber(draft.nuomiciWeight) > 0) {
    return '/assets/images/products/nuomici-5.jpg'
  }
  return '/assets/images/products/guiwei-5.jpg'
}

function getCouponScene(draft) {
  const method = String(draft.deliveryMethod || '')
  if (method.indexOf('自提') >= 0) {
    return '自提'
  }
  if (method.indexOf('附近') >= 0) {
    return '附近送'
  }
  if (method.indexOf('快递') >= 0 || method.indexOf('邮寄') >= 0) {
    return '快递'
  }
  return '全部'
}

function calculateCouponDiscount(coupon, productAmount) {
  if (!coupon || coupon.status !== '可用') {
    return 0
  }
  const threshold = toMoney(coupon.thresholdAmount)
  if (productAmount < threshold) {
    return 0
  }
  const fixedDiscount = toMoney(coupon.discountAmount)
  if (fixedDiscount > 0) {
    return Math.min(productAmount, fixedDiscount)
  }
  const rate = Number(coupon.discountRate)
  if (!rate || rate <= 0) {
    return 0
  }
  const discount = rate <= 1
    ? productAmount * (1 - rate)
    : productAmount * (10 - rate) / 10
  return Math.min(productAmount, toMoney(discount))
}

function getCouponLabel(coupon, discount) {
  if (toMoney(coupon.discountAmount) > 0) {
    return '-¥' + moneyText(discount)
  }
  if (Number(coupon.discountRate) > 0) {
    return String(coupon.discountRate) + '折'
  }
  return '可使用'
}

function getDeliveryDescription(draft) {
  if (String(draft.deliveryMethod || '').indexOf('自提') >= 0) {
    return [draft.pickupDate, draft.pickupTimeSlot].filter(Boolean).join(' ') || '提交后由客服确认自提时间'
  }
  if (String(draft.deliveryMethod || '').indexOf('附近') >= 0) {
    return '提交后由客服确认配送时间'
  }
  if (String(draft.deliveryMethod || '').indexOf('快递') >= 0) {
    return draft.expressTransitNotice || '库存和运费确认后安排顺丰冷运发货'
  }
  return '库存确认后安排采摘与发货'
}

function getRecipientInfo(draft) {
  const isPickup = String(draft.deliveryMethod || '').indexOf('自提') >= 0
  if (isPickup) {
    return {
      name: draft.buyerWechat ? '微信号：' + draft.buyerWechat : '自提客户',
      phone: draft.buyerPhone || draft.phone || '未填写',
      address: draft.pickupAddress || storage.getConfig().pickupAddress || '具体自提点由客服确认'
    }
  }
  return {
    name: draft.recipientName || '未填写',
    phone: draft.recipientPhone || draft.buyerPhone || draft.phone || '未填写',
    address: draft.address || '未填写'
  }
}

Page({
  data: {
    draft: {},
    productImage: '',
    productName: '',
    specification: '',
    deliveryName: '',
    deliveryDescription: '',
    recipient: {},
    quantity: 1,
    quantityEditable: true,
    unitPriceText: '0.00',
    productAmountText: '0.00',
    shippingFeeText: '0.00',
    giftBoxFeeText: '0.00',
    subtotalText: '0.00',
    couponDiscountText: '0.00',
    pointsDiscountText: '0.00',
    payableAmountText: '0.00',
    hasReferenceShipping: false,
    referenceShippingFeeText: '',
    estimatedPayableRangeText: '',
    expressOrderTip: '',
    isExpressOrder: false,
    availablePoints: 0,
    usablePoints: 0,
    pointsHint: '暂无可用积分',
    usePoints: false,
    availableCoupons: [],
    availableCouponCount: 0,
    selectedCouponRecordId: '',
    selectedCouponName: '请选择优惠券',
    couponValueText: '',
    showCouponSheet: false,
    submitting: false
  },

  onLoad: function () {
    this.loadDraft()
  },

  loadDraft: function () {
    const draft = storage.getOrderDraft()
    if (!draft || !draft.deliveryMethod || !draft.skuId) {
      wx.showModal({
        title: '暂无待确认订单',
        content: '请先选择商品并填写订单信息。',
        showCancel: false,
        success: function () {
          wx.navigateBack()
        }
      })
      return
    }

    const quantity = Math.max(1, parseInt(draft.quantity, 10) || 1)
    const customWeightOrder = draft.customWeightOrder === true
    const baseProductAmount = toMoney(draft.productAmount)
    const baseGiftBoxFee = toMoney(draft.giftBoxFee)
    const shippingFee = toMoney(draft.shippingFee || draft.freightAmount || draft.estimatedShippingFee)
    const referenceShippingFeeMin = toMoney(draft.referenceShippingFeeMin)
    const referenceShippingFeeMax = Math.max(referenceShippingFeeMin, toMoney(draft.referenceShippingFeeMax))
    const hasReferenceShipping = referenceShippingFeeMax > 0
    this.orderBase = {
      baseQuantity: quantity,
      unitProductAmount: customWeightOrder ? baseProductAmount : toMoney(draft.productPrice || draft.unitPrice || (baseProductAmount / quantity)),
      unitGiftBoxFee: customWeightOrder ? baseGiftBoxFee : toMoney(baseGiftBoxFee / quantity),
      shippingFee: shippingFee,
      unitReferenceShippingFeeMin: hasReferenceShipping ? referenceShippingFeeMin / quantity : 0,
      unitReferenceShippingFeeMax: hasReferenceShipping ? referenceShippingFeeMax / quantity : 0,
      hasReferenceShipping: hasReferenceShipping,
      customWeightOrder: customWeightOrder
    }

    const pointSummary = storage.getPointSummary()
    const specification = customWeightOrder
      ? [draft.guiweiWeight ? '桂味' + draft.guiweiWeight + '斤' : '', draft.nuomiciWeight ? '糯米糍' + draft.nuomiciWeight + '斤' : ''].filter(Boolean).join(' + ')
      : (draft.spec || draft.fruitWeightText || '规格待确认')

    this.setData({
      draft: draft,
      productImage: getSkuImage(draft),
      productName: draft.productName || draft.skuName || draft.productSkuName || '荔枝鲜果',
      specification: specification || '规格待确认',
      deliveryName: [draft.deliveryMethod, draft.thirdPartyMethod].filter(Boolean).join(' · '),
      deliveryDescription: getDeliveryDescription(draft),
      recipient: getRecipientInfo(draft),
      quantity: quantity,
      quantityEditable: !customWeightOrder,
      unitPriceText: moneyText(this.orderBase.unitProductAmount),
      availablePoints: pointSummary.availablePoints || 0,
      hasReferenceShipping: hasReferenceShipping,
      referenceShippingFeeText: draft.referenceShippingFeeText || '',
      expressOrderTip: draft.expressDeliveryNotice || '',
      isExpressOrder: String(draft.deliveryMethod || '').indexOf('快递') >= 0
    })
    this.recalculate(true)
  },

  buildAvailableCoupons: function (productAmount) {
    const scene = getCouponScene(this.data.draft)
    return storage.getUserCoupons().filter(function (coupon) {
      const sceneMatched = coupon.applyScene === '全部' || coupon.applyScene === scene
      return coupon.status === '可用' && sceneMatched && productAmount >= toMoney(coupon.thresholdAmount)
    }).map(function (coupon) {
      const discount = calculateCouponDiscount(coupon, productAmount)
      return Object.assign({}, coupon, {
        discount: discount,
        discountText: getCouponLabel(coupon, discount),
        conditionText: toMoney(coupon.thresholdAmount) > 0 ? '满' + moneyText(coupon.thresholdAmount) + '元可用' : '无门槛'
      })
    }).sort(function (a, b) {
      return b.discount - a.discount
    })
  },

  recalculate: function (autoSelectCoupon) {
    const base = this.orderBase
    if (!base) {
      return
    }
    const quantity = this.data.quantity
    const productAmount = base.customWeightOrder
      ? toMoney(base.unitProductAmount)
      : toMoney(base.unitProductAmount * quantity)
    const giftBoxFee = base.customWeightOrder
      ? toMoney(base.unitGiftBoxFee)
      : toMoney(base.unitGiftBoxFee * quantity)
    const shippingFee = base.shippingFee
    const coupons = this.buildAvailableCoupons(productAmount)
    let selectedId = this.data.selectedCouponRecordId
    let selectedCoupon = coupons.find(function (item) {
      return item.recordId === selectedId
    })

    if (autoSelectCoupon && !selectedId && coupons.length) {
      selectedCoupon = coupons[0]
      selectedId = selectedCoupon.recordId
    }
    if (selectedId && !selectedCoupon) {
      selectedId = ''
    }

    const couponDiscount = selectedCoupon ? selectedCoupon.discount : 0
    const maxPointDiscount = Math.min(
      toNumber(this.data.availablePoints) / 100,
      productAmount * 0.05,
      Math.max(0, productAmount - couponDiscount)
    )
    const usablePoints = Math.max(0, Math.floor(maxPointDiscount * 100))
    const pointsDiscount = this.data.usePoints ? usablePoints / 100 : 0
    const subtotal = productAmount + shippingFee + giftBoxFee
    const payableAmount = Math.max(0, subtotal - couponDiscount - pointsDiscount)
    const referenceShippingFeeMin = base.hasReferenceShipping
      ? toMoney(base.unitReferenceShippingFeeMin * quantity)
      : 0
    const referenceShippingFeeMax = base.hasReferenceShipping
      ? toMoney(base.unitReferenceShippingFeeMax * quantity)
      : 0
    const estimatedPayableMin = toMoney(payableAmount + referenceShippingFeeMin)
    const estimatedPayableMax = toMoney(payableAmount + referenceShippingFeeMax)
    const referenceShippingFeeText = referenceShippingFeeMin === referenceShippingFeeMax
      ? '约 ¥' + moneyText(referenceShippingFeeMin)
      : '约 ¥' + moneyText(referenceShippingFeeMin) + '-' + moneyText(referenceShippingFeeMax)
    const estimatedPayableRangeText = estimatedPayableMin === estimatedPayableMax
      ? '约 ¥' + moneyText(estimatedPayableMin)
      : '约 ¥' + moneyText(estimatedPayableMin) + '-' + moneyText(estimatedPayableMax)

    this.currentAmounts = {
      productAmount: productAmount,
      shippingFee: shippingFee,
      giftBoxFee: giftBoxFee,
      subtotal: subtotal,
      couponDiscount: couponDiscount,
      pointsDiscount: pointsDiscount,
      pointsUsed: this.data.usePoints ? usablePoints : 0,
      payableAmount: payableAmount,
      referenceShippingFeeMin: referenceShippingFeeMin,
      referenceShippingFeeMax: referenceShippingFeeMax,
      estimatedPayableMin: estimatedPayableMin,
      estimatedPayableMax: estimatedPayableMax,
      selectedCoupon: selectedCoupon || null
    }

    this.setData({
      availableCoupons: coupons,
      availableCouponCount: coupons.length,
      selectedCouponRecordId: selectedId,
      selectedCouponName: selectedCoupon ? selectedCoupon.couponName : (coupons.length ? '选择优惠券' : '暂无可用优惠券'),
      couponValueText: selectedCoupon ? selectedCoupon.discountText : '',
      usablePoints: usablePoints,
      pointsHint: usablePoints > 0 ? '可用' + usablePoints + '积分，抵扣¥' + moneyText(usablePoints / 100) : '本单暂无可抵扣积分',
      productAmountText: moneyText(productAmount),
      shippingFeeText: moneyText(shippingFee),
      giftBoxFeeText: moneyText(giftBoxFee),
      subtotalText: moneyText(subtotal),
      couponDiscountText: moneyText(couponDiscount),
      pointsDiscountText: moneyText(pointsDiscount),
      payableAmountText: moneyText(payableAmount),
      referenceShippingFeeText: base.hasReferenceShipping ? referenceShippingFeeText : '',
      estimatedPayableRangeText: base.hasReferenceShipping ? estimatedPayableRangeText : ''
    })
  },

  decreaseQuantity: function () {
    if (!this.data.quantityEditable || this.data.quantity <= 1) {
      return
    }
    this.setData({
      quantity: this.data.quantity - 1
    })
    this.recalculate(false)
  },

  increaseQuantity: function () {
    if (!this.data.quantityEditable) {
      return
    }
    this.setData({
      quantity: this.data.quantity + 1
    })
    this.recalculate(false)
  },

  togglePoints: function (event) {
    const usePoints = !!event.detail.value && this.data.usablePoints > 0
    this.setData({
      usePoints: usePoints
    })
    this.recalculate(false)
  },

  openCouponSheet: function () {
    this.setData({
      showCouponSheet: true
    })
  },

  closeCouponSheet: function () {
    this.setData({
      showCouponSheet: false
    })
  },

  chooseCoupon: function (event) {
    this.setData({
      selectedCouponRecordId: event.currentTarget.dataset.id || '',
      showCouponSheet: false
    })
    this.recalculate(false)
  },

  stopPropagation: function () {},

  editOrder: function () {
    wx.navigateBack()
  },

  submitOrder: function () {
    if (this.data.submitting || !this.currentAmounts) {
      return
    }

    const pointSummary = storage.getPointSummary()
    if (this.currentAmounts.pointsUsed > pointSummary.availablePoints) {
      wx.showToast({
        title: '积分余额已变化，请重新确认',
        icon: 'none'
      })
      this.setData({
        availablePoints: pointSummary.availablePoints,
        usePoints: false
      })
      this.recalculate(false)
      return
    }

    if (this.currentAmounts.selectedCoupon) {
      const couponStillAvailable = storage.getUserCoupons().some(function (coupon) {
        return coupon.recordId === this.currentAmounts.selectedCoupon.recordId && coupon.status === '可用'
      }, this)
      if (!couponStillAvailable) {
        wx.showToast({
          title: '优惠券状态已变化，请重新选择',
          icon: 'none'
        })
        this.setData({
          selectedCouponRecordId: ''
        })
        this.recalculate(false)
        return
      }
    }

    this.setData({
      submitting: true
    })
    const amounts = this.currentAmounts
    const selectedCoupon = amounts.selectedCoupon
    const orderPayload = Object.assign({}, this.data.draft, {
      quantity: this.data.quantity,
      productAmount: amounts.productAmount,
      giftBoxFee: amounts.giftBoxFee,
      shippingFee: amounts.shippingFee,
      freightAmount: amounts.shippingFee,
      estimatedShippingFee: amounts.shippingFee,
      referenceShippingFeeMin: amounts.referenceShippingFeeMin,
      referenceShippingFeeMax: amounts.referenceShippingFeeMax,
      referenceShippingFeeText: this.data.referenceShippingFeeText,
      estimatedTotalMin: amounts.estimatedPayableMin,
      estimatedTotalMax: amounts.estimatedPayableMax,
      originalAmount: amounts.subtotal,
      subtotalAmount: amounts.subtotal,
      couponRecordId: selectedCoupon ? selectedCoupon.recordId : '',
      couponId: selectedCoupon ? selectedCoupon.couponId : '',
      couponName: selectedCoupon ? selectedCoupon.couponName : '',
      couponDiscountAmount: amounts.couponDiscount,
      pointsUsed: amounts.pointsUsed,
      pointsDiscountAmount: amounts.pointsDiscount,
      discountAmount: toMoney(amounts.couponDiscount + amounts.pointsDiscount),
      payableAmount: amounts.payableAmount,
      totalAmount: amounts.payableAmount,
      orderStatus: '待付款'
    })
    const result = storage.saveOrder(orderPayload)

    if (!result.ok) {
      this.setData({
        submitting: false
      })
      wx.showToast({
        title: result.message || '订单提交失败',
        icon: 'none'
      })
      return
    }

    if (selectedCoupon) {
      storage.useUserCoupon(selectedCoupon.recordId, result.record)
    }
    if (amounts.pointsUsed > 0) {
      storage.redeemOrderPoints(amounts.pointsUsed, result.record)
    }
    storage.clearOrderDraft()

    wx.showToast({
      title: '订单已提交',
      icon: 'success',
      duration: 1200
    })
    setTimeout(function () {
      wx.switchTab({
        url: '/pages/orders/orders'
      })
    }, 500)
  }
})
