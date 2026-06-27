const mockData = require('./mockData')
const storage = require('./storage')
const stock = require('./stock')

function getIndex(list, value) {
  const index = list.indexOf(value)
  return index < 0 ? 0 : index
}

function normalizeQuantity(value) {
  const number = parseInt(value, 10)
  if (!number || number < 1) {
    return 0
  }
  return number
}

function normalizeWeight(value) {
  const number = parseFloat(value)
  if (!number || number < 0) {
    return 0
  }
  return Math.round(number * 10) / 10
}

function isValidWeightInput(value) {
  const text = String(value === null || typeof value === 'undefined' ? '' : value).trim()
  if (!text) {
    return true
  }
  if (!/^(?:\d+|\d+\.\d|\.\d)$/.test(text)) {
    return false
  }
  return Number(text) > 0
}

function formatMoney(value) {
  const number = Number(value)
  return (isNaN(number) || number < 0 ? 0 : number).toFixed(2)
}

function isPhone(value) {
  return /^1[3-9]\d{9}$/.test(String(value || '').trim())
}

function getCourierWeightRule(spec) {
  return mockData.courierWeightRules[spec] || mockData.courierWeightRules['5斤装']
}

function getSkuById(skuId) {
  return mockData.skuOptions.find(function (item) {
    return item.id === skuId
  }) || mockData.skuOptions[0]
}

function getSkuGiftText(spec) {
  return spec === '10斤装' ? '10斤装礼盒 +5元/箱' : '5斤装礼盒 +3元/箱'
}

function getSkuSpecText(item) {
  if (item.specDesc) {
    return item.specDesc
  }
  return item.spec === '10斤装' ? '约10斤鲜果' : '约5斤鲜果'
}

function getSkuProductPrice(config, sku, useExpressPrice) {
  if (useExpressPrice) {
    return Number((config.prices || {})[sku.priceKey]) || Number(sku.expressPrice) || 0
  }
  return storage.getProductPrice(config, sku.variety, sku.spec)
}

function buildSkuOptions(selectedSkuId, supportsGiftBox, quantity) {
  const config = storage.getConfig()
  const skuStatusMap = config.skuStatusMap || {}
  const orders = storage.getOrders()
  const selectedQuantity = normalizeQuantity(quantity) || 1
  return mockData.skuOptions.map(function (item) {
    const courierRule = getCourierWeightRule(item.spec)
    const status = skuStatusMap[item.id] || {}
    const stockState = stock.getSkuStockState(config, orders, item, selectedQuantity)
    const manuallyDisabled = status.isListed === false || status.isSoldOut === true
    const disabled = manuallyDisabled || stockState.disabled
    const statusText = status.isListed === false ? '已下架' : (status.isSoldOut === true ? '已售罄' : (stockState.disabled ? '库存不足' : ''))
    return Object.assign({}, item, {
      activeClass: item.id === selectedSkuId ? 'active' : '',
      disabled: disabled,
      statusText: statusText,
      maxQuantity: stockState.maxQuantity,
      weightText: item.spec,
      specText: getSkuSpecText(item),
      giftBoxText: getSkuGiftText(item.spec),
      metaText: supportsGiftBox ? getSkuGiftText(item.spec) : '预估计费 ' + courierRule.estimatedCourierWeightText
    })
  })
}

function createInitialForm(options) {
  const defaultSku = mockData.skuOptions[0]
  return {
    buyerPhone: '',
    buyerWechat: '',
    deliveryMethod: options.deliveryMethod,
    thirdPartyMethod: options.thirdPartyMethod || '',
    skuId: defaultSku.id,
    skuName: defaultSku.name,
    variety: defaultSku.variety,
    spec: defaultSku.spec,
    quantity: '1',
    purchaseMode: '单品购买',
    singleVariety: '桂味',
    singleWeight: '',
    guiweiWeight: '',
    nuomiciWeight: '',
    isMixed: '否',
    needGiftBox: '否',
    giftBox5Count: '0',
    giftBox10Count: '0',
    isGift: '否',
    hidePrice: '否',
    keepBranches: '否',
    giverName: '',
    giverContact: '',
    blessing: '',
    recipientName: '',
    recipientPhone: '',
    region: [],
    regionText: '',
    address: '',
    nearbyArea: mockData.nearbyAreaOptions[0],
    pickupDate: '',
    pickupTimeSlot: mockData.pickupTimeSlots[0],
    note: ''
  }
}

function createOrderPage(options) {
  const requiresRecipient = !!options.requiresRecipient
  const requiresPickup = !!options.requiresPickup
  const requiresNearbyArea = !!options.requiresNearbyArea
  const requiresRegion = !!options.requiresRegion
  const useRecipientAsBuyerPhone = !!options.useRecipientAsBuyerPhone
  const useExpressPrice = !!options.useExpressPrice
  const simpleExpressOrder = !!options.simpleExpressOrder
  const customWeightOrder = !!options.customWeightOrder
  const isExpressOrder = options.deliveryMethod === '快递'
  const supportsGiftBox = options.thirdPartyMethod !== '顺丰快递'
  const config = storage.getConfig()
  const pickupTimeSlots = Array.isArray(config.pickupTimeSlots) && config.pickupTimeSlots.length ? config.pickupTimeSlots : mockData.pickupTimeSlots
  const initialForm = createInitialForm(options)
  initialForm.pickupTimeSlot = pickupTimeSlots[0]
  const initialSubmitBlocked = storage.shouldBlockNewOrders(config.salesStatus)
  const initialSku = mockData.skuOptions[0]
  const initialCourierRule = getCourierWeightRule(initialSku.spec)

  return {
    data: {
      title: options.title,
      subtitle: options.subtitle,
      submitText: options.submitText || '提交订单',
      config: config,
      salesStatus: storage.getSalesStatus(),
      submitBlocked: initialSubmitBlocked,
      submitButtonText: initialSubmitBlocked ? '当前不可提交' : (options.submitText || '提交订单'),
      statusBannerClass: initialSubmitBlocked ? 'danger' : '',
      form: initialForm,
      varietyOptions: mockData.varietyOptions,
      specOptions: mockData.specOptions,
      skuOptions: buildSkuOptions(initialSku.id, supportsGiftBox, initialForm.quantity),
      yesNoOptions: mockData.yesNoOptions,
      pickupTimeSlots: pickupTimeSlots,
      nearbyAreaOptions: mockData.nearbyAreaOptions,
      deliveryNotice: mockData.deliveryNotice,
      courierFeeNotice: mockData.courierFeeNotice,
      branchNotice: mockData.branchNotice,
      giftNotice: mockData.giftNotice,
      weightNotice: mockData.weightNotice,
      unsupportedNearbyNotice: mockData.unsupportedNearbyNotice,
      isExpressOrder: isExpressOrder,
      customWeightOrder: customWeightOrder,
      purchaseModeOptions: ['单品购买', '混装购买'],
      singleVarietyOptions: ['桂味', '糯米糍'],
      quickWeightOptions: [1, 3, 5, 10],
      supportsGiftBox: supportsGiftBox,
      showGiftBoxField: supportsGiftBox,
      showGiftBoxNotice: !supportsGiftBox && !simpleExpressOrder,
      simpleExpressOrder: simpleExpressOrder,
      requiresRecipient: requiresRecipient,
      requiresPickup: requiresPickup,
      requiresNearbyArea: requiresNearbyArea,
      requiresRegion: requiresRegion,
      varietyIndex: 0,
      specIndex: 0,
      purchaseModeIndex: 0,
      singleVarietyIndex: 0,
      needGiftBoxIndex: 0,
      isMixedIndex: 0,
      isGiftIndex: 0,
      hidePriceIndex: 0,
      keepBranchesIndex: 0,
      pickupTimeSlotIndex: 0,
      nearbyAreaIndex: 0,
      productPrice: 0,
      productPriceText: '后台确认',
      guiweiUnitPrice: 0,
      nuomiciUnitPrice: 0,
      guiweiAmount: 0,
      nuomiciAmount: 0,
      totalWeight: 0,
      totalWeightText: '0斤',
      giftBoxUnitFee: 0,
      giftBox5Fee: 0,
      giftBox10Fee: 0,
      giftBoxFee: 0,
      giftBoxCount: 0,
      productAmount: 0,
      estimatedAmount: 0,
      estimatedAmountText: '后台确认',
      estimatedAmountMoneyText: '0.00',
      selectedSkuName: initialSku.name,
      selectedSkuImage: initialSku.image,
      selectedSkuSpecText: getSkuSpecText(initialSku),
      selectedSkuGiftText: getSkuGiftText(initialSku.spec),
      fruitWeightText: initialCourierRule.fruitWeightText,
      estimatedCourierWeight: initialCourierRule.estimatedCourierWeight,
      estimatedCourierWeightText: initialCourierRule.estimatedCourierWeightText,
      estimatedShippingFee: 0,
      estimatedShippingFeeText: '客服确认',
      pickupAddressText: storage.getConfig().pickupAddress || '',
      pickupTimeText: storage.getConfig().pickupTime || '',
      pickupMapImage: storage.getConfig().pickupMapImage || '/assets/images/pickup-map.png',
      pickupDateText: '请选择日期',
      defaultAddressApplied: false
    },

    onShow: function () {
      this.reloadConfig()
      this.applyDefaultAddress()
    },

    onLoad: function (query) {
      if (query && query.skuId) {
        this.setSelectedSku(query.skuId)
      }
    },

    reloadConfig: function () {
      const config = storage.getConfig()
      const submitBlocked = storage.shouldBlockNewOrders(config.salesStatus)
      this.setData({
        config: config,
        salesStatus: storage.getSalesStatus(),
        submitBlocked: submitBlocked,
        submitButtonText: submitBlocked ? '当前不可提交' : this.data.submitText,
        statusBannerClass: submitBlocked ? 'danger' : '',
        pickupAddressText: config.pickupAddress || '',
        pickupTimeText: config.pickupTime || '',
        pickupMapImage: config.pickupMapImage || '/assets/images/pickup-map.png',
        skuOptions: buildSkuOptions(this.data.form.skuId, this.data.supportsGiftBox, this.data.form.quantity)
      })
      this.updateAmounts()
    },

    applyDefaultAddress: function () {
      if (!requiresRecipient || this.data.defaultAddressApplied) {
        return
      }
      const address = storage.getDefaultAddress()
      if (!address) {
        this.setData({
          defaultAddressApplied: true
        })
        return
      }
      const form = this.data.form || {}
      const updates = {
        defaultAddressApplied: true
      }
      if (!String(form.recipientName || '').trim()) {
        updates['form.recipientName'] = address.name || ''
      }
      if (!String(form.recipientPhone || '').trim()) {
        updates['form.recipientPhone'] = address.phone || ''
      }
      if (!String(form.address || '').trim()) {
        updates['form.address'] = address.detailAddress || ''
      }
      if ((!Array.isArray(form.region) || !form.region.length) && Array.isArray(address.region)) {
        updates['form.region'] = address.region
        updates['form.regionText'] = address.regionText || address.region.join(' ')
      }
      this.setData(updates)
    },

    handleInput: function (e) {
      const field = e.currentTarget.dataset.field
      const value = e.detail.value
      if (customWeightOrder && field === 'singleWeight') {
        const selectedField = this.data.form.singleVariety === '糯米糍' ? 'nuomiciWeight' : 'guiweiWeight'
        const otherField = selectedField === 'guiweiWeight' ? 'nuomiciWeight' : 'guiweiWeight'
        this.setData({
          'form.singleWeight': value,
          ['form.' + selectedField]: value,
          ['form.' + otherField]: ''
        })
        this.updateAmounts()
        return
      }
      this.setData({
        ['form.' + field]: value
      })
      if (field === 'quantity') {
        this.setData({
          skuOptions: buildSkuOptions(this.data.form.skuId, this.data.supportsGiftBox, value)
        })
        this.updateAmounts()
      }
      if (customWeightOrder && (field === 'guiweiWeight' || field === 'nuomiciWeight' || field === 'giftBox5Count' || field === 'giftBox10Count')) {
        this.updateAmounts()
      }
    },

    setSelectedSku: function (skuId) {
      const sku = getSkuById(skuId)
      const config = storage.getConfig()
      const status = (config.skuStatusMap || {})[sku.id] || {}
      if (status.isListed === false || status.isSoldOut === true) {
        wx.showToast({
          title: status.isListed === false ? '商品已下架' : '商品已售罄',
          icon: 'none'
        })
        return
      }
      const stockState = stock.getSkuStockState(config, storage.getOrders(), sku, this.data.form.quantity)
      if (stockState.disabled) {
        wx.showToast({
          title: stock.STOCK_ERROR_MESSAGE,
          icon: 'none'
        })
        return
      }
      const nextData = {
        'form.skuId': sku.id,
        'form.skuName': sku.name,
        'form.variety': sku.variety,
        'form.spec': sku.spec,
        skuOptions: buildSkuOptions(sku.id, this.data.supportsGiftBox, this.data.form.quantity),
        selectedSkuName: sku.name,
        selectedSkuImage: sku.image,
        selectedSkuSpecText: getSkuSpecText(sku),
        selectedSkuGiftText: getSkuGiftText(sku.spec)
      }

      if (!this.data.supportsGiftBox) {
        nextData['form.needGiftBox'] = '否'
        nextData.needGiftBoxIndex = 0
      }

      this.setData(nextData)
      this.updateAmounts()
    },

    selectSku: function (e) {
      this.setSelectedSku(e.currentTarget.dataset.id)
    },

    handlePicker: function (e) {
      const field = e.currentTarget.dataset.field
      const index = Number(e.detail.value)
      const listMap = {
        variety: this.data.varietyOptions,
        spec: this.data.specOptions,
        purchaseMode: this.data.purchaseModeOptions,
        singleVariety: this.data.singleVarietyOptions,
        needGiftBox: this.data.yesNoOptions,
        isMixed: this.data.yesNoOptions,
        isGift: this.data.yesNoOptions,
        hidePrice: this.data.yesNoOptions,
        keepBranches: this.data.yesNoOptions,
        pickupTimeSlot: this.data.pickupTimeSlots,
        nearbyArea: this.data.nearbyAreaOptions
      }
      const indexMap = {
        variety: 'varietyIndex',
        spec: 'specIndex',
        purchaseMode: 'purchaseModeIndex',
        singleVariety: 'singleVarietyIndex',
        needGiftBox: 'needGiftBoxIndex',
        isMixed: 'isMixedIndex',
        isGift: 'isGiftIndex',
        hidePrice: 'hidePriceIndex',
        keepBranches: 'keepBranchesIndex',
        pickupTimeSlot: 'pickupTimeSlotIndex',
        nearbyArea: 'nearbyAreaIndex'
      }
      const list = listMap[field] || []
      const value = list[index] || list[0]

      this.setData({
        ['form.' + field]: value,
        [indexMap[field]]: index
      })

      if (field === 'purchaseMode') {
        if (value === '单品购买') {
          const selectedField = this.data.form.singleVariety === '糯米糍' ? 'nuomiciWeight' : 'guiweiWeight'
          const otherField = selectedField === 'guiweiWeight' ? 'nuomiciWeight' : 'guiweiWeight'
          const singleWeight = this.data.form[selectedField] || ''
          this.setData({
            'form.isMixed': '否',
            'form.singleWeight': singleWeight,
            ['form.' + otherField]: ''
          })
        } else {
          this.setData({
            'form.isMixed': '是',
            'form.singleWeight': ''
          })
        }
      }

      if (field === 'singleVariety') {
        const selectedField = value === '糯米糍' ? 'nuomiciWeight' : 'guiweiWeight'
        const otherField = selectedField === 'guiweiWeight' ? 'nuomiciWeight' : 'guiweiWeight'
        this.setData({
          ['form.' + selectedField]: this.data.form.singleWeight,
          ['form.' + otherField]: ''
        })
      }

      if (field === 'nearbyArea' && mockData.supportedNearbyAreas.indexOf(value) === -1) {
        wx.showModal({
          title: '附近送',
          content: mockData.unsupportedNearbyNotice,
          showCancel: false
        })
      }

      if (field === 'needGiftBox' || field === 'isMixed' || field === 'purchaseMode' || field === 'singleVariety') {
        this.updateAmounts()
      }
    },

    fillQuickWeight: function (e) {
      const field = e.currentTarget.dataset.field
      const value = String(e.currentTarget.dataset.weight || '')
      if (!field || !value) {
        return
      }

      if (field === 'singleWeight') {
        const selectedField = this.data.form.singleVariety === '糯米糍' ? 'nuomiciWeight' : 'guiweiWeight'
        const otherField = selectedField === 'guiweiWeight' ? 'nuomiciWeight' : 'guiweiWeight'
        this.setData({
          'form.singleWeight': value,
          ['form.' + selectedField]: value,
          ['form.' + otherField]: ''
        })
      } else {
        this.setData({
          ['form.' + field]: value
        })
      }
      this.updateAmounts()
    },

    selectPurchaseMode: function (e) {
      const mode = e.currentTarget.dataset.mode === '混装购买' ? '混装购买' : '单品购买'
      if (mode === '单品购买') {
        const selectedField = this.data.form.singleVariety === '糯米糍' ? 'nuomiciWeight' : 'guiweiWeight'
        const otherField = selectedField === 'guiweiWeight' ? 'nuomiciWeight' : 'guiweiWeight'
        const singleWeight = this.data.form[selectedField] || ''
        this.setData({
          'form.purchaseMode': mode,
          'form.isMixed': '否',
          'form.singleWeight': singleWeight,
          ['form.' + otherField]: '',
          purchaseModeIndex: 0
        })
      } else {
        this.setData({
          'form.purchaseMode': mode,
          'form.isMixed': '是',
          'form.singleWeight': '',
          purchaseModeIndex: 1
        })
      }
      this.updateAmounts()
    },

    selectSingleVariety: function (e) {
      const variety = e.currentTarget.dataset.variety === '糯米糍' ? '糯米糍' : '桂味'
      const selectedField = variety === '糯米糍' ? 'nuomiciWeight' : 'guiweiWeight'
      const otherField = selectedField === 'guiweiWeight' ? 'nuomiciWeight' : 'guiweiWeight'
      this.setData({
        'form.singleVariety': variety,
        ['form.' + selectedField]: this.data.form.singleWeight,
        ['form.' + otherField]: '',
        singleVarietyIndex: variety === '糯米糍' ? 1 : 0
      })
      this.updateAmounts()
    },

    selectGiftBox: function (e) {
      const value = e.currentTarget.dataset.value === '是' ? '是' : '否'
      this.setData({
        'form.needGiftBox': value,
        needGiftBoxIndex: value === '是' ? 1 : 0
      })
      this.updateAmounts()
    },

    handleDateChange: function (e) {
      this.setData({
        'form.pickupDate': e.detail.value,
        pickupDateText: e.detail.value || '请选择日期'
      })
    },

    handleRegionChange: function (e) {
      const region = Array.isArray(e.detail.value) ? e.detail.value : []
      this.setData({
        'form.region': region,
        'form.regionText': region.join(' ')
      })
      this.updateAmounts()
    },

    updateAmounts: function () {
      const form = this.data.form
      const config = this.data.config
      const quantity = normalizeQuantity(form.quantity)

      if (customWeightOrder) {
        const prices = config.prices || {}
        const guiweiWeight = normalizeWeight(form.guiweiWeight)
        const nuomiciWeight = normalizeWeight(form.nuomiciWeight)
        const totalWeight = Math.round((guiweiWeight + nuomiciWeight) * 10) / 10
        const guiweiUnitPrice = Number(prices.guiweiPickupNearbyUnit) || 0
        const nuomiciUnitPrice = Number(prices.nuomiciPickupNearbyUnit) || 0
        const guiweiAmount = Math.round(guiweiWeight * guiweiUnitPrice * 100) / 100
        const nuomiciAmount = Math.round(nuomiciWeight * nuomiciUnitPrice * 100) / 100
        const productAmount = guiweiAmount + nuomiciAmount
        const giftBox5Count = form.needGiftBox === '是' ? normalizeQuantity(form.giftBox5Count) : 0
        const giftBox10Count = form.needGiftBox === '是' ? normalizeQuantity(form.giftBox10Count) : 0
        const giftBox5Fee = storage.getGiftBoxUnitFee(config, '5斤装') * giftBox5Count
        const giftBox10Fee = storage.getGiftBoxUnitFee(config, '10斤装') * giftBox10Count
        const giftBoxFee = giftBox5Fee + giftBox10Fee
        const estimatedAmount = productAmount + giftBoxFee

        this.setData({
          guiweiUnitPrice: guiweiUnitPrice,
          nuomiciUnitPrice: nuomiciUnitPrice,
          guiweiAmount: guiweiAmount,
          nuomiciAmount: nuomiciAmount,
          productPriceText: '桂味 ' + guiweiUnitPrice + '元/斤；糯米糍 ' + nuomiciUnitPrice + '元/斤',
          productAmount: productAmount,
          totalWeight: totalWeight,
          totalWeightText: totalWeight + '斤',
          giftBox5Fee: giftBox5Fee,
          giftBox10Fee: giftBox10Fee,
          giftBoxFee: giftBoxFee,
          giftBoxCount: giftBox5Count + giftBox10Count,
          estimatedAmount: estimatedAmount,
          estimatedAmountText: estimatedAmount > 0 ? estimatedAmount + '元' : '后台确认',
          estimatedAmountMoneyText: formatMoney(estimatedAmount)
        })
        return
      }

      const sku = getSkuById(form.skuId)
      const productPrice = getSkuProductPrice(config, sku, useExpressPrice)
      const giftBoxUnitFee = this.data.supportsGiftBox ? storage.getGiftBoxUnitFee(config, sku.spec) : 0
      const giftBoxFee = this.data.supportsGiftBox && form.needGiftBox === '是' ? giftBoxUnitFee * quantity : 0
      const productAmount = productPrice * quantity
      const courierRule = getCourierWeightRule(sku.spec)
      const estimatedShippingFee = this.data.isExpressOrder ? storage.getEstimatedShippingFee(config, form.thirdPartyMethod, sku.spec) : 0

      this.setData({
        'form.skuName': sku.name,
        'form.variety': sku.variety,
        'form.spec': sku.spec,
        skuOptions: buildSkuOptions(sku.id, this.data.supportsGiftBox, quantity),
        productPrice: productPrice,
        productPriceText: productPrice > 0 ? productPrice + '元/箱' : '后台确认',
        giftBoxUnitFee: giftBoxUnitFee,
        giftBoxFee: giftBoxFee,
        productAmount: productAmount,
        estimatedAmount: productAmount + giftBoxFee,
        estimatedAmountText: productPrice > 0 ? (productAmount + giftBoxFee) + '元（不含运费）' : '后台确认',
        estimatedAmountMoneyText: formatMoney(productAmount + giftBoxFee),
        selectedSkuName: sku.name,
        selectedSkuImage: sku.image,
        selectedSkuSpecText: getSkuSpecText(sku),
        selectedSkuGiftText: getSkuGiftText(sku.spec),
        fruitWeightText: courierRule.fruitWeightText,
        estimatedCourierWeight: courierRule.estimatedCourierWeight,
        estimatedCourierWeightText: courierRule.estimatedCourierWeightText,
        estimatedShippingFee: estimatedShippingFee,
        estimatedShippingFeeText: estimatedShippingFee > 0 ? estimatedShippingFee + '元' : '客服确认'
      })
    },

    validateForm: function () {
      const form = this.data.form
      const quantity = normalizeQuantity(form.quantity)
      const guiweiWeight = normalizeWeight(form.guiweiWeight)
      const nuomiciWeight = normalizeWeight(form.nuomiciWeight)

      if (!useRecipientAsBuyerPhone && !isPhone(form.buyerPhone)) {
        return '请填写正确的预留手机号'
      }
      if (requiresPickup && !form.buyerWechat.trim()) {
        return '请填写微信号'
      }

      if (customWeightOrder) {
        if (!isValidWeightInput(form.guiweiWeight) || !isValidWeightInput(form.nuomiciWeight)) {
          return '请输入正确的购买斤数'
        }
        if (!guiweiWeight && !nuomiciWeight) {
          return '请输入正确的购买斤数'
        }
        if (form.needGiftBox === '是' && !normalizeQuantity(form.giftBox5Count) && !normalizeQuantity(form.giftBox10Count)) {
          return '请选择礼盒数量，或改为不需要礼盒'
        }
      } else {
        if (!form.skuId) {
          return '请选择商品规格'
        }
        if (!quantity) {
          return '请填写购买箱数'
        }
        if (!this.data.supportsGiftBox && form.needGiftBox === '是') {
          return '快递订单不支持礼盒包装'
        }
      }

      const stockOrder = customWeightOrder ? {
        customWeightOrder: true,
        productName: guiweiWeight && nuomiciWeight ? '混装' : (guiweiWeight ? '桂味' : '糯米糍'),
        guiweiWeight: guiweiWeight,
        nuomiciWeight: nuomiciWeight,
        totalWeight: Math.round((guiweiWeight + nuomiciWeight) * 10) / 10,
        quantity: 1
      } : Object.assign({}, getSkuById(form.skuId), {
        skuId: form.skuId,
        quantity: quantity
      })
      const stockCheck = stock.validateOrderStock(this.data.config || storage.getConfig(), storage.getOrders(), stockOrder)
      if (!stockCheck.ok) {
        return stockCheck.message
      }

      if (requiresRecipient) {
        if (!form.recipientName.trim()) {
          return '请填写收件人姓名'
        }
        if (!isPhone(form.recipientPhone)) {
          return '请填写正确的收件人手机号'
        }
        if (requiresRegion && (!Array.isArray(form.region) || form.region.length < 3)) {
          return '请选择省市区'
        }
        if (!form.address.trim()) {
          return '请填写详细地址'
        }
      }
      if (requiresPickup) {
        if (!form.pickupDate) {
          return '请选择期望自提日期'
        }
        if (!form.pickupTimeSlot) {
          return '请选择期望自提时间段'
        }
      }
      if (requiresNearbyArea && mockData.supportedNearbyAreas.indexOf(form.nearbyArea) === -1) {
        return mockData.unsupportedNearbyNotice
      }
      return ''
    },

    submitForm: function () {
      const error = this.validateForm()
      if (error) {
        if (error === mockData.unsupportedNearbyNotice) {
          wx.showModal({
            title: '附近送',
            content: error,
            showCancel: false
          })
        } else {
          wx.showToast({
            title: error,
            icon: 'none'
          })
        }
        return
      }

      const form = this.data.form
      const quantity = normalizeQuantity(form.quantity)
      const buyerPhone = useRecipientAsBuyerPhone ? form.recipientPhone.trim() : form.buyerPhone.trim()
      const estimatedShippingFee = this.data.isExpressOrder ? Number(this.data.estimatedShippingFee) || 0 : ''
      const region = Array.isArray(form.region) ? form.region : []
      const regionText = form.regionText || region.join(' ')
      const fullAddress = [regionText, form.address.trim()].filter(Boolean).join(' ')
      let orderPayload = null

      if (customWeightOrder) {
        const guiweiWeight = normalizeWeight(form.guiweiWeight)
        const nuomiciWeight = normalizeWeight(form.nuomiciWeight)
        const totalWeight = Math.round((guiweiWeight + nuomiciWeight) * 10) / 10
        const giftBox5Count = form.needGiftBox === '是' ? normalizeQuantity(form.giftBox5Count) : 0
        const giftBox10Count = form.needGiftBox === '是' ? normalizeQuantity(form.giftBox10Count) : 0
        const productName = guiweiWeight && nuomiciWeight ? '混装' : (guiweiWeight ? '桂味' : '糯米糍')

        orderPayload = {
          customWeightOrder: true,
          buyerPhone: buyerPhone,
          phone: buyerPhone,
          buyerWechat: form.buyerWechat.trim(),
          wechat: form.buyerWechat.trim(),
          deliveryMethod: form.deliveryMethod,
          thirdPartyMethod: form.thirdPartyMethod,
          skuId: 'custom-weight',
          skuName: productName + totalWeight + '斤',
          productSkuName: productName + totalWeight + '斤',
          productName: productName,
          variety: productName,
          spec: totalWeight + '斤',
          quantity: 1,
          guiweiWeight: guiweiWeight,
          nuomiciWeight: nuomiciWeight,
          totalWeight: totalWeight,
          guiweiUnitPrice: this.data.guiweiUnitPrice,
          nuomiciUnitPrice: this.data.nuomiciUnitPrice,
          guiweiAmount: this.data.guiweiAmount,
          nuomiciAmount: this.data.nuomiciAmount,
          productAmount: this.data.productAmount,
          totalAmount: this.data.estimatedAmount,
          needGiftBox: form.needGiftBox,
          giftBox5Count: giftBox5Count,
          giftBox10Count: giftBox10Count,
          giftBoxCount: giftBox5Count + giftBox10Count,
          giftBoxFee: this.data.giftBoxFee,
          recipientName: form.recipientName.trim(),
          recipientPhone: form.recipientPhone.trim(),
          address: fullAddress,
          detailAddress: form.address.trim(),
          recipientRegion: region,
          province: region[0] || '',
          city: region[1] || '',
          district: region[2] || '',
          nearbyArea: form.nearbyArea,
          pickupDate: form.pickupDate,
          pickupTimeSlot: form.pickupTimeSlot,
          pickupAddress: this.data.pickupAddressText,
          pickupTimeText: this.data.pickupTimeText,
          freightPayer: requiresRecipient ? '买家承担' : '',
          freightAmount: '',
          estimatedShippingFee: '',
          actualShippingFee: '',
          shippingFeeDiff: '',
          refundShippingFee: '',
          absorbedShippingDiff: '',
          shippingFeeStatus: '',
          refundNote: '',
          trackingNo: '',
          shipTime: '',
          shipStatus: '',
          delayReason: '',
          serviceNote: '',
          note: form.note.trim()
        }
      } else {
        const sku = getSkuById(form.skuId)
        const courierRule = getCourierWeightRule(sku.spec)
        orderPayload = {
          buyerPhone: buyerPhone,
          phone: buyerPhone,
          buyerWechat: form.buyerWechat.trim(),
          wechat: form.buyerWechat.trim(),
          deliveryMethod: form.deliveryMethod,
          thirdPartyMethod: form.thirdPartyMethod,
          skuId: sku.id,
          skuName: sku.name,
          productSkuName: sku.name,
          productName: sku.name,
          variety: sku.variety,
          spec: sku.spec,
          productPrice: this.data.productPrice,
          unitPrice: this.data.productPrice,
          productAmount: this.data.productAmount,
          fruitWeightText: courierRule.fruitWeightText,
          estimatedCourierWeight: this.data.isExpressOrder ? courierRule.estimatedCourierWeight : '',
          quantity: quantity,
          recipientName: form.recipientName.trim(),
          recipientPhone: form.recipientPhone.trim(),
          address: fullAddress,
          detailAddress: form.address.trim(),
          recipientRegion: region,
          province: region[0] || '',
          city: region[1] || '',
          district: region[2] || '',
          nearbyArea: form.nearbyArea,
          pickupDate: form.pickupDate,
          pickupTimeSlot: form.pickupTimeSlot,
          freightPayer: this.data.isExpressOrder ? '下单人承担' : (requiresRecipient ? '买家承担' : ''),
          freightAmount: Number(this.data.referenceShippingFeeMax) > 0 ? '' : estimatedShippingFee,
          estimatedShippingFee: Number(this.data.referenceShippingFeeMax) > 0 ? '' : estimatedShippingFee,
          referenceShippingFeeMin: Number(this.data.referenceShippingFeeMin) || 0,
          referenceShippingFeeMax: Number(this.data.referenceShippingFeeMax) || 0,
          referenceShippingFeeText: this.data.referenceShippingFeeText || '',
          isRemoteDelivery: !!this.data.isRemoteDelivery,
          expressDeliveryNotice: this.data.expressDeliveryNotice || '',
          expressTransitNotice: this.data.expressTransitNotice || '',
          actualShippingFee: '',
          shippingFeeDiff: '',
          refundShippingFee: '',
          absorbedShippingDiff: '',
          shippingFeeStatus: this.data.isExpressOrder ? '未确认' : '',
          refundNote: '',
          trackingNo: '',
          shipTime: '',
          shipStatus: form.deliveryMethod === '快递' ? '待配送' : '',
          delayReason: '',
          serviceNote: '',
          note: form.note.trim()
        }

        if (!simpleExpressOrder) {
          Object.assign(orderPayload, {
            needGiftBox: this.data.supportsGiftBox ? form.needGiftBox : '否',
            giftBoxUnitFee: this.data.giftBoxUnitFee,
            giftBoxFee: this.data.giftBoxFee,
            isGift: form.isGift,
            hidePrice: form.hidePrice,
            keepBranches: form.keepBranches,
            giverName: form.giverName.trim(),
            giverContact: form.giverContact.trim(),
            blessing: form.blessing.trim()
          })
        }
      }

      const stockCheck = stock.validateOrderStock(storage.getConfig(), storage.getOrders(), orderPayload)
      if (!stockCheck.ok) {
        wx.showToast({
          title: stockCheck.message,
          icon: 'none'
        })
        return
      }

      storage.saveOrderDraft(orderPayload)
      wx.navigateTo({
        url: '/pages/confirm-order/confirm-order',
        fail: function () {
          wx.showToast({
            title: '确认订单页打开失败',
            icon: 'none'
          })
        }
      })
    },

    goContact: function () {
      wx.navigateTo({ url: '/pages/contact/contact' })
    },

    goPickupLocation: function () {
      wx.navigateTo({ url: '/pages/pickup-location/pickup-location' })
    },

    syncPickerIndexes: function () {
      const form = this.data.form
      const sku = getSkuById(form.skuId)
      this.setData({
        skuOptions: buildSkuOptions(sku.id, this.data.supportsGiftBox, form.quantity),
        selectedSkuName: sku.name,
        selectedSkuImage: sku.image,
        selectedSkuSpecText: getSkuSpecText(sku),
        selectedSkuGiftText: getSkuGiftText(sku.spec),
        varietyIndex: getIndex(mockData.varietyOptions, form.variety),
        specIndex: getIndex(mockData.specOptions, form.spec),
        purchaseModeIndex: getIndex(this.data.purchaseModeOptions, form.purchaseMode),
        singleVarietyIndex: getIndex(this.data.singleVarietyOptions, form.singleVariety),
        needGiftBoxIndex: getIndex(mockData.yesNoOptions, form.needGiftBox),
        isMixedIndex: getIndex(mockData.yesNoOptions, form.isMixed),
        isGiftIndex: getIndex(mockData.yesNoOptions, form.isGift),
        hidePriceIndex: getIndex(mockData.yesNoOptions, form.hidePrice),
        keepBranchesIndex: getIndex(mockData.yesNoOptions, form.keepBranches),
        pickupTimeSlotIndex: getIndex(this.data.pickupTimeSlots, form.pickupTimeSlot),
        nearbyAreaIndex: getIndex(mockData.nearbyAreaOptions, form.nearbyArea)
      })
    }
  }
}

module.exports = {
  createOrderPage: createOrderPage
}
