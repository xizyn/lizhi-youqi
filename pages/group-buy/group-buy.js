const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')

function getInitialForm() {
  return {
    companyName: '',
    contact: '',
    phone: '',
    quantity: '',
    budget: '',
    variety: '桂味',
    giftBox: '待确认',
    delivery: '附近送货',
    area: '',
    freightAccepted: '否',
    note: ''
  }
}

function needsFreightConfirm(delivery) {
  return mockData.freightRequiredDelivery.indexOf(delivery) !== -1
}

function isNearbyArea(area) {
  return ['珠光村', '新屋村', '九祥岭', '深圳职业技术大学', '深职大'].some(function (keyword) {
    return area.indexOf(keyword) !== -1
  })
}

Page({
  data: {
    form: getInitialForm(),
    varietyOptions: mockData.varietyOptions,
    giftBoxOptions: mockData.giftBoxOptions,
    deliveryOptions: mockData.deliveryOptions,
    freightAckOptions: mockData.freightAckOptions,
    freightNotice: mockData.freightNotice,
    nearbyDeliveryScope: mockData.nearbyDeliveryScope,
    freightRequired: false,
    varietyIndex: 0,
    giftBoxIndex: 2,
    deliveryIndex: 0,
    freightAckIndex: 0
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: e.detail.value
    })
  },

  handlePicker(e) {
    const field = e.currentTarget.dataset.field
    const indexField = e.currentTarget.dataset.indexField
    const index = Number(e.detail.value)
    const optionMap = {
      variety: this.data.varietyOptions,
      giftBox: this.data.giftBoxOptions,
      delivery: this.data.deliveryOptions,
      freightAccepted: this.data.freightAckOptions
    }
    const value = optionMap[field][index]
    const updates = {
      ['form.' + field]: value,
      [indexField]: index
    }

    if (field === 'delivery') {
      updates.freightRequired = needsFreightConfirm(value)
    }

    this.setData(updates)
  },

  validateForm(form) {
    if (!form.companyName.trim()) {
      return '请填写公司或个人名称'
    }
    if (!form.contact.trim()) {
      return '请填写联系人'
    }
    if (!/^1\d{10}$/.test(form.phone.trim())) {
      return '请填写有效手机号'
    }
    if (!form.quantity.trim()) {
      return '请填写预计采购份数'
    }
    if (!form.budget.trim()) {
      return '请填写每份预算'
    }
    if (!form.variety) {
      return '请选择想购买品种'
    }
    if (!form.delivery) {
      return '请选择配送方式'
    }
    if (!form.area.trim()) {
      return '请填写配送区域'
    }
    if (form.delivery === '附近送货' && !isNearbyArea(form.area.trim())) {
      return '附近送货仅限指定附近区域'
    }
    if (needsFreightConfirm(form.delivery) && form.freightAccepted !== '是') {
      return '请确认运费由买家承担'
    }
    return ''
  },

  submitForm() {
    const form = Object.assign({}, this.data.form, {
      companyName: this.data.form.companyName.trim(),
      contact: this.data.form.contact.trim(),
      phone: this.data.form.phone.trim(),
      quantity: this.data.form.quantity.trim(),
      budget: this.data.form.budget.trim(),
      area: this.data.form.area.trim(),
      note: this.data.form.note.trim()
    })
    const message = this.validateForm(form)

    if (message) {
      wx.showToast({
        title: message,
        icon: 'none'
      })
      return
    }

    storage.saveRecord('groupBuys', form)
    wx.showToast({
      title: '已保存登记',
      icon: 'success'
    })
    this.setData({
      form: getInitialForm(),
      varietyIndex: 0,
      giftBoxIndex: 2,
      deliveryIndex: 0,
      freightAckIndex: 0,
      freightRequired: false
    })
  }
})
