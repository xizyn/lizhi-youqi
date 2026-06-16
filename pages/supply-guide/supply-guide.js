Page({
  data: {
    saleTimeText: '预计 2027 年 6 月底至 7 月中旬开售',
    varieties: [
      {
        name: '桂味荔枝',
        image: '/assets/images/products/guiwei-5.jpg',
        taste: '清甜带香，口感爽脆。',
        suitableFor: '适合喜欢清甜、不喜欢太腻口感的用户。',
        matureText: '预计 2027 年 6 月底至 7 月中旬，具体以果园成熟度为准。',
        deliveryAdvice: '深圳用户建议自提或同城配送，外地用户可选择顺丰快递。'
      },
      {
        name: '糯米糍荔枝',
        image: '/assets/images/products/nuomici-5.jpg',
        taste: '核小肉厚，甜度更高，口感更软糯。',
        suitableFor: '适合喜欢高甜、多汁、果肉厚实口感的用户。',
        matureText: '成熟期可能略晚，实际以当季采摘为准。',
        deliveryAdvice: '建议成熟后尽快自提或同城配送，外地用户可选择顺丰快递并由客服确认时效。'
      }
    ],
    deliveryItems: [
      {
        title: '到园自提',
        desc: '适合深圳本地用户，具体自提时间和地点由客服确认。',
        url: '/pages/picking/picking'
      },
      {
        title: '深圳同城配送',
        desc: '需客服确认配送范围、当天采摘情况和可配送时间。',
        url: '/pages/nearby-delivery/nearby-delivery'
      },
      {
        title: '顺丰快递',
        desc: '适合外地用户，运费以顺丰实际费用为准，由买家承担。',
        url: '/pages/express/express'
      },
      {
        title: '果园参观',
        desc: '山地果园暂未开放自由参观，如有特殊需求请联系客服。',
        url: '/pages/orchard-visit/orchard-visit'
      }
    ],
    orchardPhotos: [
      '/assets/images/products/guiwei-5.jpg',
      '/assets/images/products/guiwei-10.jpg',
      '/assets/images/products/nuomici-5.jpg',
      '/assets/images/products/nuomici-10.jpg',
      '/assets/images/products/mix-5.jpg',
      '/assets/images/products/mix-10.jpg'
    ]
  },

  goReminder: function () {
    wx.navigateTo({ url: '/pages/reminder/reminder' })
  },

  goHome: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  navigateTo: function (e) {
    const url = e.currentTarget.dataset.url
    if (url) {
      wx.navigateTo({ url: url })
    }
  },

  showVarietyDetail: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.varieties[index]

    if (!item) {
      return
    }

    wx.showModal({
      title: item.name,
      content: [
        '口感特点：' + item.taste,
        '适合人群：' + item.suitableFor,
        '成熟说明：' + item.matureText,
        '配送建议：' + item.deliveryAdvice
      ].join('\n\n'),
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#4f7d46'
    })
  },

  previewPhoto: function (e) {
    const current = e.currentTarget.dataset.src
    if (!current) {
      return
    }
    wx.previewImage({
      current: current,
      urls: this.data.orchardPhotos
    })
  },

  previewVarietyImage: function (e) {
    const current = e.currentTarget.dataset.src
    if (!current) {
      return
    }
    wx.previewImage({
      current: current,
      urls: this.data.varieties.map(function (item) {
        return item.image
      })
    })
  }
})
