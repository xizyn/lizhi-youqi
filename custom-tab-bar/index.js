Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/assets/tabbar/home.png',
        selectedIconPath: '/assets/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/orders/orders',
        text: '订单',
        iconPath: '/assets/tabbar/my.png',
        selectedIconPath: '/assets/tabbar/my-active.png'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: '/assets/tabbar/my.png',
        selectedIconPath: '/assets/tabbar/my-active.png'
      }
    ]
  },

  methods: {
    switchTab: function (e) {
      const index = Number(e.currentTarget.dataset.index)
      const item = this.data.list[index]

      if (!item) {
        return
      }

      wx.switchTab({
        url: item.pagePath
      })
    }
  }
})
