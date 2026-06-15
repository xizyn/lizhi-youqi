const storage = require('../../utils/storage')

function hasValidCoordinate(value, min, max) {
  const number = Number(value)
  return !isNaN(number) && isFinite(number) && number >= min && number <= max && number !== 0
}

function buildMarker(marker) {
  const source = marker || {}
  return Object.assign({}, source, {
    style: 'left:' + Number(source.x || 0) + '%;top:' + Number(source.y || 0) + '%;'
  })
}

function buildMapItem(item) {
  const source = item || {}
  const routeArrow = source.routeArrow
    ? Object.assign({}, source.routeArrow, {
      style: [
        'left:' + Number(source.routeArrow.x || 0) + '%',
        'top:' + Number(source.routeArrow.y || 0) + '%',
        'width:' + Number(source.routeArrow.width || 0) + '%',
        'height:' + Number(source.routeArrow.height || 0) + '%'
      ].join(';') + ';'
    })
    : null

  return Object.assign({}, source, {
    markers: Array.isArray(source.markers) ? source.markers.map(buildMarker) : [],
    routeArrow: routeArrow
  })
}

Page({
  data: {
    orchard: {},
    maps: [],
    activeIndex: 1,
    activeMap: {},
    imageUrls: [],
    coordinateReady: false
  },

  onShow: function () {
    const config = storage.getConfig()
    const orchard = config.orchardLocation || {}
    const maps = Array.isArray(orchard.maps) ? orchard.maps.map(buildMapItem) : []
    const activeIndex = maps.length > 1 ? 1 : 0

    this.setData({
      orchard: orchard,
      maps: maps,
      activeIndex: activeIndex,
      activeMap: maps[activeIndex] || {},
      imageUrls: maps.map(function (item) {
        return item.image
      }),
      coordinateReady: hasValidCoordinate(orchard.latitude, -90, 90) &&
        hasValidCoordinate(orchard.longitude, -180, 180)
    })
  },

  selectMap: function (event) {
    const index = Number(event.currentTarget.dataset.index)
    this.updateActiveMap(index)
  },

  handleSwiperChange: function (event) {
    this.updateActiveMap(Number(event.detail.current))
  },

  updateActiveMap: function (index) {
    const activeIndex = Math.max(0, Math.min(index, this.data.maps.length - 1))
    this.setData({
      activeIndex: activeIndex,
      activeMap: this.data.maps[activeIndex] || {}
    })
  },

  previewMap: function () {
    const current = this.data.activeMap.image
    if (!current) {
      return
    }
    wx.previewImage({
      current: current,
      urls: this.data.imageUrls
    })
  },

  openNavigation: function () {
    const orchard = this.data.orchard
    if (!this.data.coordinateReady) {
      wx.showModal({
        title: '暂未配置准确坐标',
        content: '请管理员补充果园准确纬度和经度后再使用地图导航。当前可先复制地址或联系果园。',
        showCancel: false
      })
      return
    }

    wx.openLocation({
      latitude: Number(orchard.latitude),
      longitude: Number(orchard.longitude),
      name: orchard.name || '荔枝有期果园',
      address: orchard.address || '',
      scale: 18
    })
  },

  copyAddress: function () {
    wx.setClipboardData({
      data: this.data.orchard.address || '',
      success: function () {
        wx.showToast({
          title: '地址已复制',
          icon: 'success'
        })
      }
    })
  },

  contactService: function () {
    const phone = String(this.data.orchard.contactPhone || '').trim()
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone,
        fail: function () {
          wx.navigateTo({ url: '/pages/contact/contact' })
        }
      })
      return
    }
    wx.navigateTo({ url: '/pages/contact/contact' })
  }
})
