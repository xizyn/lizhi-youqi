const storage = require('../../utils/storage')
const mockData = require('../../utils/mockData')

const BASE_LINKS = [
  { text: '售后服务', desc: '坏果、破损、少发等问题处理', icon: '后', url: '/pages/after-sales/after-sales' },
  { text: '我的优惠券', desc: '查看可用优惠券', icon: '券', url: '/pages/coupons/coupons' },
  { text: '我的积分', desc: '查看积分明细与兑换规则', icon: '积', url: '/pages/points/points' },
  { text: '常用地址', desc: '管理收货地址', icon: '址', url: '/pages/address/address' },
  { text: '联系客服', desc: '订单确认、配送沟通、售后处理', icon: '服', url: '/pages/contact/contact' },
  { text: '自提地点', desc: '查看自提地址、时间与地图', icon: '提', url: '/pages/pickup-location/pickup-location' },
  { text: '帮助与须知', desc: '配送说明、购买须知、鲜果售后', icon: '帮', url: '/pages/help/help' }
]

function normalizeStatus(status) {
  const map = {
    pending_payment: '待付款',
    paid: '已支付',
    pending_handle: '待处理',
    preparing: '待打包',
    packed: '待发货/待自提',
    shipped: '已送出',
    picked_up: '已完成',
    completed: '已完成',
    cancelled: '已取消',
    after_sale: '售后处理中'
  }
  return map[status] || status || '已提交'
}

function buildOrderShortcuts(orders) {
  const list = Array.isArray(orders) ? orders : []
  const definitions = [
    { key: 'pendingPay', label: '待付款', statuses: ['待付款'] },
    { key: 'pendingProcess', label: '待处理', statuses: ['已提交', '已支付', '待处理', '待采摘', '待打包', '待发货/待自提'] },
    { key: 'shipped', label: '待收货', statuses: ['已送出', '已发货'] },
    { key: 'history', label: '已完成', statuses: ['已完成'] }
  ]
  return definitions.map(function (item) {
    return Object.assign({}, item, {
      count: list.filter(function (order) {
        return item.statuses.indexOf(normalizeStatus(order.orderStatus || order.status)) >= 0
      }).length
    })
  })
}

function buildReminderEntry(config) {
  const reminderConfig = config.saleReminder || mockData.defaultSaleReminderConfig
  const record = storage.getSaleReminderRecord(reminderConfig.reservationYear, config)
  const active = record && record.status === 'active'
  let desc = '预约订阅，开售第一时间通知你'
  let statusText = '去预约'
  let statusTone = 'normal'

  if (reminderConfig.reservationOpen === false) {
    desc = '本季提醒预约已停止'
    statusText = '已结束'
    statusTone = 'muted'
  } else if (active && record.notificationAuth === 'accept') {
    desc = '已预约' + record.reservationYear + '年开售提醒'
    statusText = '已预约'
    statusTone = 'success'
  } else if (active) {
    desc = '已预约' + record.reservationYear + '年提醒，微信通知待开启'
    statusText = '待授权'
    statusTone = 'warning'
  }

  return {
    text: '开售提醒',
    desc: desc,
    icon: '铃',
    url: '/pages/reminder/reminder',
    statusText: statusText,
    statusTone: statusTone
  }
}

Page({
  data: {
    showAdminEntry: false,
    member: mockData.memberMock.normal,
    links: BASE_LINKS,
    reminderEntry: {},
    orderShortcuts: []
  },

  onShow: function () {
    const config = storage.getConfig()
    const isAdmin = storage.isAdminUser(config)
    const pointSummary = storage.getPointSummary()
    const member = Object.assign({}, isAdmin ? mockData.memberMock.admin : mockData.memberMock.normal, {
      points: pointSummary.availablePoints
    })
    const tabBar = this.getTabBar && this.getTabBar()
    if (tabBar) {
      tabBar.setData({ selected: 2 })
    }
    this.setData({
      showAdminEntry: isAdmin,
      member: member,
      reminderEntry: buildReminderEntry(config),
      orderShortcuts: buildOrderShortcuts(storage.getOrders())
    })
    if (!isAdmin) {
      storage.clearAdminSession()
    }
  },

  handleLinkTap: function (e) {
    const url = e.currentTarget.dataset.url

    if (url) {
      wx.navigateTo({ url: url })
    }
  },

  openOrderFilter: function (e) {
    storage.setOrderFilter(e.currentTarget.dataset.filter || 'all')
    wx.switchTab({
      url: '/pages/orders/orders'
    })
  },

  openAdmin: function () {
    const config = storage.getConfig()
    if (!storage.isAdminUser(config)) {
      wx.showToast({
        title: '无权限访问',
        icon: 'none'
      })
      return
    }

    if (!storage.requiresAdminPassword(config)) {
      storage.grantAdminSession(config)
      wx.navigateTo({ url: '/pages/admin/admin' })
      return
    }

    wx.showModal({
      title: '管理后台',
      content: '',
      editable: true,
      placeholderText: '请输入后台密码',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        if (storage.authorizeAdminWithPassword(config, res.content)) {
          wx.navigateTo({ url: '/pages/admin/admin' })
          return
        }
        wx.showToast({
          title: '无权限访问',
          icon: 'none'
        })
      }
    })
  }
})
