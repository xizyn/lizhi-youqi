Page({
  data: {
    notice: {
      title: '开售提醒',
      content: '今年为小年，预计2027年6月底至7月中旬开售'
    },
    entries: [
      { title: '到园自提', desc: '自提更便宜', iconPath: '/assets/icons/home-pickup.png', url: '/pages/picking/picking' },
      { title: '全国快递', desc: '顺丰冷链', iconPath: '/assets/icons/home-express.png', url: '/pages/express/express' },
      { title: '附近送', desc: '深圳同城', iconPath: '/assets/icons/home-nearby.png', url: '/pages/nearby-delivery/nearby-delivery' },
      { title: '果园参观', desc: '暂未开放', iconPath: '/assets/icons/home-orchard.png', url: '/pages/orchard-visit/orchard-visit', disabled: true }
    ],
    supplyItems: [
      { name: '桂味荔枝', desc: '清甜带香', image: '/assets/images/products/guiwei-5.jpg' },
      { name: '糯米糍荔枝', desc: '核小肉厚', image: '/assets/images/products/nuomici-5.jpg' }
    ],
    supplyTags: ['支持自提', '深圳同城配送', '顺丰快递'],
    orchardPhotos: [
      '/assets/images/products/guiwei-5.jpg',
      '/assets/images/products/nuomici-10.jpg',
      '/assets/images/products/mix-10.jpg'
    ]
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) {
      tabBar.setData({ selected: 0 })
    }
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url

    if (url) {
      wx.navigateTo({ url: url })
    }
  },

  contactService() {
    wx.navigateTo({ url: '/pages/contact/contact' })
  },

  showDeliveryInfo() {
    wx.showModal({
      title: '配送说明',
      content: '附近送、顺丰快递和自提均需客服确认。快递运费以顺丰实际费用为准。',
      showCancel: false
    })
  }
})
