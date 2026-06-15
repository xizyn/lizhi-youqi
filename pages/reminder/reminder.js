const mockData = require('../../utils/mockData')
const storage = require('../../utils/storage')

const PROGRESS_STAGES = ['开花', '挂果', '膨大', '转色', '成熟', '开售']

function getProgressIndex(stage) {
  const map = {
    '尚未挂果': 0,
    '生长中': 1,
    '膨大期': 2,
    '转色期': 3,
    '即将成熟': 4,
    '即将开售': 5,
    '已开售': 5,
    '本季售罄': 5
  }
  return typeof map[stage] === 'number' ? map[stage] : 0
}

function buildProgress(stage) {
  const activeIndex = getProgressIndex(stage)
  return PROGRESS_STAGES.map(function (label, index) {
    return {
      label: label,
      state: index < activeIndex ? 'done' : (index === activeIndex ? 'active' : 'pending')
    }
  })
}

function getNotificationText(auth) {
  const map = {
    accept: '微信通知已开启',
    reject: '已登记预约，微信通知尚未开启',
    ban: '已登记预约，微信通知被系统关闭',
    failed: '已登记预约，微信通知申请失败',
    unavailable: '已登记预约，当前环境无法申请微信通知',
    not_configured: '已登记预约，微信通知将在接入云服务后启用',
    not_requested: '已登记预约，尚未申请微信通知'
  }
  return map[auth] || map.not_requested
}

function getAuthTone(auth) {
  return auth === 'accept' ? 'success' : 'warning'
}

function buildVarietyCards(options, selected) {
  const selectedList = Array.isArray(selected) ? selected : []
  return (Array.isArray(options) ? options : []).map(function (label) {
    return {
      label: label,
      selected: selectedList.indexOf(label) >= 0
    }
  })
}

Page({
  data: {
    reminderConfig: {},
    reservation: null,
    selectedVarieties: ['全部品种'],
    varietyCards: [],
    reservationVarietiesText: '',
    progressSteps: [],
    notificationText: '',
    notificationTone: 'warning',
    isReserved: false,
    isSaleOpen: false,
    isSoldOut: false,
    isReservationClosed: false,
    mainButtonText: '立即预约提醒',
    orchardUpdates: [],
    faqItems: [
      {
        title: '预计日期会变化吗？',
        content: '会。荔枝成熟受天气、雨水、温度和果园实际成熟度影响，页面日期均为预计时间。'
      },
      {
        title: '预约后一定能收到微信通知吗？',
        content: '登记预约和微信通知授权是两件事。当前本地演示版不能主动发送通知，正式上线需接入云函数或后端。'
      },
      {
        title: '一次授权可以收到多次提醒吗？',
        content: '不能默认这样理解。是否可发送以及可发送次数取决于订阅消息模板类型和微信返回的授权结果。'
      }
    ],
    expandedFaqIndex: -1,
    localDemo: true
  },

  onShow: function () {
    this.loadPage()
  },

  loadPage: function () {
    const config = storage.getConfig()
    const reminderConfig = config.saleReminder || mockData.defaultSaleReminderConfig
    const reservation = storage.getSaleReminderRecord(reminderConfig.reservationYear, config)
    const isReserved = !!(reservation && reservation.status === 'active')
    const selectedVarieties = isReserved && reservation.varieties.length
      ? reservation.varieties
      : ['全部品种']
    const isSaleOpen = reminderConfig.currentStage === '已开售'
    const isSoldOut = reminderConfig.currentStage === '本季售罄'
    const isReservationClosed = reminderConfig.reservationOpen === false
    const varietyOptions = (reminderConfig.varieties || []).concat(['全部品种'])
    let mainButtonText = isReserved ? '保存提醒品种' : '立即预约提醒'

    if (isSaleOpen) {
      mainButtonText = '立即选购'
    } else if (isSoldOut) {
      mainButtonText = '预约下一季提醒'
    } else if (isReservationClosed) {
      mainButtonText = '预约已结束'
    }

    this.setData({
      reminderConfig: reminderConfig,
      reservation: reservation,
      selectedVarieties: selectedVarieties,
      varietyCards: buildVarietyCards(varietyOptions, selectedVarieties),
      reservationVarietiesText: isReserved ? reservation.varieties.join('、') : '',
      progressSteps: buildProgress(reminderConfig.currentStage),
      notificationText: isReserved ? getNotificationText(reservation.notificationAuth) : '尚未登记预约',
      notificationTone: isReserved ? getAuthTone(reservation.notificationAuth) : 'muted',
      isReserved: isReserved,
      isSaleOpen: isSaleOpen,
      isSoldOut: isSoldOut,
      isReservationClosed: isReservationClosed,
      mainButtonText: mainButtonText,
      orchardUpdates: Array.isArray(reminderConfig.orchardUpdates) ? reminderConfig.orchardUpdates : [],
      localDemo: reminderConfig.cloudEnabled !== true
    })
  },

  toggleVariety: function (event) {
    const value = event.currentTarget.dataset.value
    let selected = this.data.selectedVarieties.slice()

    if (value === '全部品种') {
      selected = ['全部品种']
    } else {
      selected = selected.filter(function (item) {
        return item !== '全部品种'
      })
      const index = selected.indexOf(value)
      if (index >= 0) {
        selected.splice(index, 1)
      } else {
        selected.push(value)
      }
      if (!selected.length) {
        selected = ['全部品种']
      }
    }
    this.setData({
      selectedVarieties: selected,
      varietyCards: buildVarietyCards(
        (this.data.reminderConfig.varieties || []).concat(['全部品种']),
        selected
      )
    })
  },

  handleMainAction: function () {
    const config = this.data.reminderConfig
    if (this.data.isSaleOpen) {
      wx.navigateTo({
        url: config.purchasePage || '/pages/express/express'
      })
      return
    }
    if (this.data.isReservationClosed && !this.data.isSoldOut) {
      wx.showToast({
        title: '当前已停止预约',
        icon: 'none'
      })
      return
    }
    if (this.data.isReserved && this.data.reservation.notificationAuth === 'accept' && !this.data.isSoldOut) {
      this.saveReservation(
        this.data.reservation.reservationYear,
        'accept',
        this.data.reservation.notificationMessage || '用户同意订阅消息'
      )
      wx.showToast({
        title: '提醒品种已更新',
        icon: 'success'
      })
      return
    }
    this.requestNotificationAndSave(this.data.isSoldOut ? Number(config.reservationYear) + 1 : config.reservationYear)
  },

  requestNotificationAndSave: function (reservationYear) {
    const config = storage.getConfig().saleReminder || this.data.reminderConfig
    const templateId = String(config.subscriptionTemplateId || '').trim()
    const that = this

    if (!templateId) {
      this.saveReservation(reservationYear, 'not_configured', '未配置订阅消息模板 ID')
      wx.showModal({
        title: '预约已登记',
        content: '当前为本地演示模式，尚未配置订阅消息模板 ID。预约已保存，但微信通知将在接入云服务后启用。',
        showCancel: false
      })
      return
    }

    if (typeof wx.requestSubscribeMessage !== 'function') {
      this.saveReservation(reservationYear, 'unavailable', '当前环境不支持订阅消息')
      wx.showToast({
        title: '预约已登记，当前环境无法授权',
        icon: 'none'
      })
      return
    }

    wx.requestSubscribeMessage({
      tmplIds: [templateId],
      success: function (result) {
        const auth = result[templateId] || 'reject'
        that.saveReservation(reservationYear, auth, auth === 'accept' ? '用户同意订阅消息' : '用户未开启订阅消息')
        wx.showToast({
          title: auth === 'accept' ? '预约成功' : '已登记预约',
          icon: auth === 'accept' ? 'success' : 'none'
        })
      },
      fail: function (error) {
        that.saveReservation(reservationYear, 'failed', error && error.errMsg ? error.errMsg : '订阅消息调用失败')
        wx.showToast({
          title: '预约已登记，通知申请失败',
          icon: 'none'
        })
      }
    })
  },

  saveReservation: function (reservationYear, notificationAuth, notificationMessage) {
    storage.upsertSaleReminder({
      reservationYear: reservationYear,
      varieties: this.data.selectedVarieties,
      notificationAuth: notificationAuth,
      notificationMessage: notificationMessage,
      status: 'active'
    })
    storage.awardReminderPoints()
    this.loadPage()
  },

  retryNotification: function () {
    const year = this.data.reservation
      ? this.data.reservation.reservationYear
      : this.data.reminderConfig.reservationYear
    this.requestNotificationAndSave(year)
  },

  cancelReservation: function () {
    const that = this
    wx.showModal({
      title: '取消开售提醒',
      content: '取消后，本机预约状态会停止。微信系统中的订阅授权不能由小程序完全撤销。',
      confirmText: '确认取消',
      success: function (result) {
        if (!result.confirm) {
          return
        }
        storage.cancelSaleReminder(that.data.reservation.reservationYear)
        that.loadPage()
        wx.showToast({
          title: '已取消预约',
          icon: 'none'
        })
      }
    })
  },

  showUpdateDetail: function (event) {
    const index = Number(event.currentTarget.dataset.index)
    const item = this.data.orchardUpdates[index]
    if (!item) {
      return
    }
    wx.showModal({
      title: item.title || '果园近况',
      content: [item.date, item.stage, item.summary].filter(Boolean).join('\n'),
      showCancel: false
    })
  },

  toggleFaq: function (event) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({
      expandedFaqIndex: this.data.expandedFaqIndex === index ? -1 : index
    })
  }
})
