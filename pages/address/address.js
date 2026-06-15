const storage = require('../../utils/storage')

function emptyForm() {
  return {
    id: '',
    name: '',
    phone: '',
    region: [],
    regionText: '',
    detailAddress: '',
    isDefault: false
  }
}

function normalizeAddress(item) {
  const source = item || {}
  return Object.assign({}, source, {
    fullAddress: [source.regionText, source.detailAddress].filter(Boolean).join(' '),
    defaultText: source.isDefault ? '默认' : ''
  })
}

Page({
  data: {
    addresses: [],
    showEditor: false,
    editorTitle: '新增地址',
    form: emptyForm()
  },

  onShow: function () {
    this.loadAddresses()
  },

  loadAddresses: function () {
    this.setData({
      addresses: storage.getAddressList().map(normalizeAddress)
    })
  },

  openCreate: function () {
    this.setData({
      showEditor: true,
      editorTitle: '新增地址',
      form: emptyForm()
    })
  },

  openEdit: function (event) {
    const id = event.currentTarget.dataset.id
    const address = storage.getAddressList().find(function (item) {
      return item.id === id
    })
    if (!address) {
      return
    }
    this.setData({
      showEditor: true,
      editorTitle: '编辑地址',
      form: Object.assign(emptyForm(), address)
    })
  },

  closeEditor: function () {
    this.setData({
      showEditor: false,
      form: emptyForm()
    })
  },

  stopPropagation: function () {},

  handleInput: function (event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      ['form.' + field]: event.detail.value
    })
  },

  handleRegionChange: function (event) {
    const region = event.detail.value || []
    this.setData({
      'form.region': region,
      'form.regionText': region.join(' ')
    })
  },

  handleDefaultChange: function (event) {
    this.setData({
      'form.isDefault': !!event.detail.value
    })
  },

  saveAddress: function () {
    const form = Object.assign({}, this.data.form, {
      name: String(this.data.form.name || '').trim(),
      phone: String(this.data.form.phone || '').trim(),
      detailAddress: String(this.data.form.detailAddress || '').trim()
    })

    if (!form.name) {
      wx.showToast({ title: '请填写联系人', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      wx.showToast({ title: '请填写正确手机号', icon: 'none' })
      return
    }
    if (!form.regionText) {
      wx.showToast({ title: '请选择省市区', icon: 'none' })
      return
    }
    if (!form.detailAddress) {
      wx.showToast({ title: '请填写详细地址', icon: 'none' })
      return
    }

    storage.saveAddress(form)
    this.closeEditor()
    this.loadAddresses()
    wx.showToast({
      title: '地址已保存',
      icon: 'success'
    })
  },

  setDefault: function (event) {
    storage.setDefaultAddress(event.currentTarget.dataset.id)
    this.loadAddresses()
    wx.showToast({
      title: '已设为默认',
      icon: 'success'
    })
  },

  deleteAddress: function (event) {
    const id = event.currentTarget.dataset.id
    const that = this
    wx.showModal({
      title: '删除地址',
      content: '确定删除这个常用地址吗？',
      confirmText: '删除',
      success: function (result) {
        if (!result.confirm) {
          return
        }
        storage.deleteAddress(id)
        that.loadAddresses()
      }
    })
  }
})
