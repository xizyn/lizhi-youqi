const storage = require('../../utils/storage')
const reportGenerator = require('../../utils/reportGenerator')

const REMINDER_KEY = 'lizhi_youqi_report_reminder_v1'

function pad(value) {
  return value < 10 ? '0' + value : String(value)
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function formatTime(date) {
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function addDays(date, count) {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + count)
  return next
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(function (item) {
    return item && typeof item === 'object'
  }) : []
}

function getCompatibleOrders() {
  const primaryOrders = safeArray(storage.getOrders())
  if (primaryOrders.length) {
    return primaryOrders
  }

  const fallbackKeys = ['orderList', 'orders']
  for (let index = 0; index < fallbackKeys.length; index += 1) {
    try {
      const orders = safeArray(wx.getStorageSync(fallbackKeys[index]))
      if (orders.length) {
        return orders
      }
    } catch (error) {
      // Continue to the next legacy storage key.
    }
  }
  return []
}

function getRangeDates(range, startDate, endDate) {
  const today = new Date()
  const todayText = formatDate(today)
  if (range === 'yesterday') {
    const yesterday = formatDate(addDays(today, -1))
    return { start: yesterday, end: yesterday }
  }
  if (range === 'custom') {
    return {
      start: startDate || todayText,
      end: endDate || startDate || todayText
    }
  }
  return { start: todayText, end: todayText }
}

function getRangeLabel(range) {
  if (range === 'yesterday') {
    return '昨日'
  }
  if (range === 'custom') {
    return '自定义'
  }
  return '今日'
}

function getRangeText(dates) {
  return dates.start === dates.end ? dates.start : dates.start + ' 至 ' + dates.end
}

function getFileDatePart(dates) {
  return dates.start === dates.end ? dates.start : dates.start + '至' + dates.end
}

function returnToProfile() {
  wx.switchTab({
    url: '/pages/profile/profile',
    fail: function () {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  })
}

function getReminderRecord() {
  try {
    const value = wx.getStorageSync(REMINDER_KEY)
    return value && typeof value === 'object' ? value : {}
  } catch (error) {
    return {}
  }
}

function saveReminderRecord(action) {
  try {
    const now = new Date()
    wx.setStorageSync(REMINDER_KEY, {
      date: formatDate(now),
      action: action,
      updatedAt: formatDate(now) + ' ' + formatTime(now)
    })
  } catch (error) {
    // Reminder persistence must not block report access.
  }
}

function getXLSXRuntime() {
  if (typeof XLSX !== 'undefined' && XLSX && XLSX.utils) {
    return XLSX
  }
  return null
}

Page({
  data: {
    authorized: false,
    loading: true,
    ranges: [
      { id: 'today', label: '今日' },
      { id: 'yesterday', label: '昨日' },
      { id: 'custom', label: '自定义' }
    ],
    activeRange: 'today',
    startDate: formatDate(new Date()),
    endDate: formatDate(new Date()),
    currentRangeText: formatDate(new Date()),
    currentRangeLabel: '今日',
    lastUpdatedAt: '',
    hasGenerated: false,
    hasOrders: false,
    exporting: false,
    exportMessage: '正在生成报表',
    excelAvailable: false,
    activeTab: 'all',
    activeTabLabel: '全部订单',
    reportTabs: [
      { id: 'all', label: '全部订单', count: 0 },
      { id: 'pickup', label: '自提订单', count: 0 },
      { id: 'nearby', label: '附近送订单', count: 0 },
      { id: 'express', label: '顺丰快递', count: 0 }
    ],
    overviewCards: [],
    harvestCards: [],
    dashboard: {
      orderCount: 0,
      pendingPaymentCount: 0,
      pendingHandleCount: 0,
      shippedCount: 0,
      completedCount: 0,
      afterSaleCount: 0,
      guiweiWeight: '0',
      nuomiciWeight: '0',
      totalWeight: '0',
      pickupCount: 0,
      nearbyCount: 0,
      expressCount: 0,
      productAmount: '0',
      shippingFee: '0',
      totalAmount: '0'
    },
    deliveryStats: [],
    visibleOrders: [],
    emptyText: '当前日期暂无订单',
    report: {
      displayColumns: [],
      displayRecords: []
    },
    tableWidth: '900rpx',
    showTable: false,
    previewCards: [],
    reminderStatusText: '每日17:00后打开页面时检查',
    generatedFile: null
  },

  onShow: function () {
    const config = storage.getConfig()
    if (!storage.hasAdminAccess(config)) {
      wx.showModal({
        title: '订单报表 / 导出',
        content: '无权限访问',
        showCancel: false,
        success: returnToProfile
      })
      return
    }

    const that = this
    this.setData({
      authorized: true,
      excelAvailable: !!getXLSXRuntime(),
      loading: true
    }, function () {
      that.generateReport(false)
      that.checkDailyReminder()
    })
  },

  selectRange: function (event) {
    const range = event.currentTarget.dataset.range || 'today'
    const dates = getRangeDates(range, this.data.startDate, this.data.endDate)
    this.setData({
      activeRange: range,
      startDate: dates.start,
      endDate: dates.end,
      showTable: false
    }, function () {
      this.generateReport(false)
    })
  },

  handleDateChange: function (event) {
    const field = event.currentTarget.dataset.field
    const patch = {
      activeRange: 'custom',
      showTable: false
    }
    patch[field] = event.detail.value
    this.setData(patch, function () {
      this.generateReport(false)
    })
  },

  getFilteredOrders: function () {
    const dates = getRangeDates(
      this.data.activeRange,
      this.data.startDate,
      this.data.endDate
    )
    if (dates.end < dates.start) {
      return {
        error: '结束日期不能早于开始日期',
        dates: dates,
        orders: []
      }
    }
    return {
      error: '',
      dates: dates,
      orders: reportGenerator.filterOrdersByDateRange(
        getCompatibleOrders(),
        dates.start,
        dates.end
      )
    }
  },

  generateReport: function (showToast) {
    const result = this.getFilteredOrders()
    if (result.error) {
      wx.showToast({
        title: result.error,
        icon: 'none'
      })
      return
    }

    const orders = result.orders
    const dashboard = reportGenerator.buildOrderReportDashboard(orders)
    const orderCards = reportGenerator.buildReportOrderCards(orders)
    const report = reportGenerator.generateOrderDetailReport(orders)
    const currentRangeText = getRangeText(result.dates)
    const overviewCards = [
      { key: 'orders', label: '订单总数', value: dashboard.orderCount, tone: 'green' },
      { key: 'pending', label: '待付款', value: dashboard.pendingPaymentCount, tone: 'red' },
      { key: 'handling', label: '待处理', value: dashboard.pendingHandleCount, tone: 'orange' },
      { key: 'shipped', label: '已送出', value: dashboard.shippedCount, tone: 'blue' },
      { key: 'completed', label: '已完成', value: dashboard.completedCount, tone: 'green' },
      { key: 'afterSale', label: '售后订单', value: dashboard.afterSaleCount, tone: 'purple' }
    ]
    const harvestCards = [
      { key: 'guiwei', label: '桂味总斤数', value: dashboard.guiweiWeight, unit: '斤', tone: 'red' },
      { key: 'nuomici', label: '糯米糍总斤数', value: dashboard.nuomiciWeight, unit: '斤', tone: 'purple' },
      { key: 'total', label: '备货总斤数', value: dashboard.totalWeight, unit: '斤', tone: 'green' }
    ]
    const deliveryStats = [
      { id: 'pickup', label: '自提订单', value: dashboard.pickupCount, desc: '核对自提人和时间', tone: 'green' },
      { id: 'nearby', label: '附近送订单', value: dashboard.nearbyCount, desc: '核对区域和详细地址', tone: 'orange' },
      { id: 'express', label: '顺丰快递订单', value: dashboard.expressCount, desc: '核对地址和顺丰单号', tone: 'blue' }
    ]
    const reportTabs = [
      { id: 'all', label: '全部订单', count: orderCards.length },
      {
        id: 'pickup',
        label: '自提订单',
        count: orderCards.filter(function (item) { return item.deliveryGroup === 'pickup' }).length
      },
      {
        id: 'nearby',
        label: '附近送订单',
        count: orderCards.filter(function (item) { return item.deliveryGroup === 'nearby' }).length
      },
      {
        id: 'express',
        label: '顺丰快递',
        count: orderCards.filter(function (item) { return item.deliveryGroup === 'express' }).length
      }
    ]
    const previewCards = [
      {
        id: 'summary',
        sheet: 'Sheet1',
        title: '汇总表',
        line1: dashboard.orderCount + ' 单 · 备货 ' + dashboard.totalWeight + '斤',
        line2: '预计金额 ¥' + dashboard.totalAmount
      },
      {
        id: 'detail',
        sheet: 'Sheet2',
        title: '订单明细',
        line1: orders.length + ' 条完整订单记录',
        line2: '客户、斤数、金额、地址和备注'
      },
      {
        id: 'delivery',
        sheet: 'Sheet3',
        title: '发货配送',
        line1: '自提' + dashboard.pickupCount + ' · 附近送' + dashboard.nearbyCount + ' · 快递' + dashboard.expressCount,
        line2: '按配送方式分组核对'
      }
    ]

    this.allOrderCards = orderCards
    this.reportOrders = orders
    this.reportDates = result.dates
    this.workbookSheets = reportGenerator.buildOrderWorkbookSheets(
      orders,
      currentRangeText
    )

    this.setData({
      currentRangeText: currentRangeText,
      currentRangeLabel: getRangeLabel(this.data.activeRange),
      lastUpdatedAt: formatDate(new Date()) + ' ' + formatTime(new Date()),
      hasGenerated: true,
      hasOrders: orders.length > 0,
      dashboard: dashboard,
      overviewCards: overviewCards,
      harvestCards: harvestCards,
      deliveryStats: deliveryStats,
      reportTabs: reportTabs,
      report: report,
      tableWidth: Math.max(900, report.displayColumns.length * 190) + 'rpx',
      previewCards: previewCards,
      generatedFile: null,
      loading: false
    })
    this.applyOrderFilter(this.data.activeTab)

    if (showToast !== false) {
      wx.showToast({
        title: orders.length ? '报表已更新' : '当前日期暂无订单',
        icon: 'none'
      })
    }
  },

  selectReportTab: function (event) {
    const tab = event.currentTarget.dataset.tab || 'all'
    this.setData({ activeTab: tab })
    this.applyOrderFilter(tab)
  },

  applyOrderFilter: function (tab) {
    const allOrders = Array.isArray(this.allOrderCards) ? this.allOrderCards : []
    const visibleOrders = tab === 'all'
      ? allOrders
      : allOrders.filter(function (order) {
        return order.deliveryGroup === tab
      })
    const tabMeta = this.data.reportTabs.find(function (item) {
      return item.id === tab
    })
    this.setData({
      visibleOrders: visibleOrders,
      activeTabLabel: tabMeta ? tabMeta.label : '全部订单',
      emptyText: tab === 'all' ? '当前日期暂无订单' : '当前日期暂无' + (tabMeta ? tabMeta.label : '订单')
    })
  },

  toggleTable: function () {
    this.setData({
      showTable: !this.data.showTable
    })
  },

  buildCSVFileName: function () {
    return '荔枝有期_订单报表_' + getFileDatePart(this.reportDates || {
      start: this.data.startDate,
      end: this.data.endDate
    }) + '.csv'
  },

  buildExcelFileName: function () {
    return '荔枝有期_订单报表_' + getFileDatePart(this.reportDates || {
      start: this.data.startDate,
      end: this.data.endDate
    }) + '.xlsx'
  },

  ensureExportable: function () {
    if (!this.data.hasGenerated) {
      this.generateReport(false)
    }
    if (!Array.isArray(this.reportOrders) || this.reportOrders.length === 0) {
      wx.showToast({
        title: '当前日期暂无订单',
        icon: 'none'
      })
      return false
    }
    return true
  },

  beginExport: function (message) {
    this.setData({
      exporting: true,
      exportMessage: message || '正在生成报表'
    })
  },

  finishExport: function () {
    this.setData({ exporting: false })
  },

  exportCSV: function (fallbackFromExcel) {
    if (this.data.exporting || !this.ensureExportable()) {
      return
    }

    const that = this
    const isFallback = fallbackFromExcel === true
    const csvText = reportGenerator.buildOrderDetailCSV(this.reportOrders)
    let generatedFile = null
    this.beginExport(isFallback ? '正在生成 CSV 备用文件' : '正在生成 CSV 报表')
    reportGenerator.saveCSVFile(this.buildCSVFileName(), csvText)
      .then(function (file) {
        generatedFile = file
        that.setData({ generatedFile: file })
        return reportGenerator.shareCSVFile(file.filePath, file.fileName)
      })
      .then(function () {
        that.finishExport()
        wx.showModal({
          title: isFallback ? '已改用 CSV 导出' : '报表已生成',
          content: '报表已生成，可分享至微信或文件传输助手。',
          showCancel: false
        })
      })
      .catch(function (error) {
        that.finishExport()
        const unsupported = error && error.message === '当前环境不支持分享文件'
        if (generatedFile) {
          wx.showModal({
            title: 'CSV 已生成',
            content: unsupported
              ? '开发者工具不支持文件分享。请在真机微信中重新点击导出，即可发送到文件传输助手或其他微信联系人。'
              : '报表文件已经生成，但本次分享没有完成。请在真机微信中重新点击导出并分享。',
            showCancel: false
          })
          return
        }
        wx.showModal({
          title: '文件生成失败',
          content: '报表数据仍可在当前页面查看，请稍后重新生成文件。',
          showCancel: false
        })
      })
  },

  exportExcel: function () {
    if (this.data.exporting || !this.ensureExportable()) {
      return
    }

    const xlsx = getXLSXRuntime()
    if (!xlsx) {
      const that = this
      wx.showModal({
        title: '自动改用 CSV',
        content: '当前项目未引入轻量 xlsx 库，将导出可直接用 Excel/WPS 打开的 CSV 文件。',
        confirmText: '继续导出',
        success: function (result) {
          if (result.confirm) {
            that.exportCSV(true)
          }
        }
      })
      return
    }

    const that = this
    this.beginExport('正在生成 Excel 报表')
    try {
      const workbook = xlsx.utils.book_new()
      this.workbookSheets.forEach(function (sheet) {
        const worksheet = xlsx.utils.aoa_to_sheet([sheet.headers].concat(sheet.rows))
        xlsx.utils.book_append_sheet(workbook, worksheet, sheet.name)
      })
      const output = xlsx.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      })
      const fileName = this.buildExcelFileName()
      const filePath = wx.env.USER_DATA_PATH + '/' + fileName
      wx.getFileSystemManager().writeFile({
        filePath: filePath,
        data: output,
        success: function () {
          if (typeof wx.shareFileMessage !== 'function') {
            that.finishExport()
            wx.showModal({
              title: 'Excel 已生成',
              content: '开发者工具不支持分享文件，请在真机微信中导出并分享。',
              showCancel: false
            })
            return
          }
          wx.shareFileMessage({
            filePath: filePath,
            fileName: fileName,
            success: function () {
              that.finishExport()
              wx.showModal({
                title: '报表已生成',
                content: '报表已生成，可分享至微信或文件传输助手。',
                showCancel: false
              })
            },
            fail: function () {
              that.finishExport()
              wx.showModal({
                title: 'Excel 已生成',
                content: '文件分享未完成，请在真机微信中重试。',
                showCancel: false
              })
            }
          })
        },
        fail: function () {
          that.finishExport()
          that.exportCSV(true)
        }
      })
    } catch (error) {
      this.finishExport()
      this.exportCSV(true)
    }
  },

  checkDailyReminder: function () {
    const now = new Date()
    const today = formatDate(now)
    const record = getReminderRecord()
    if (now.getHours() < 17 || record.date === today) {
      this.updateReminderStatus(record)
      return
    }

    saveReminderRecord('shown')
    this.updateReminderStatus(getReminderRecord())
    const that = this
    wx.showModal({
      title: '备货提醒',
      content: '今天的订单可以导出备货表了，请及时核对采摘、分拣和发货安排。',
      cancelText: '稍后',
      confirmText: '立即导出',
      success: function (result) {
        saveReminderRecord(result.confirm ? 'export' : 'later')
        that.updateReminderStatus(getReminderRecord())
        if (result.confirm) {
          that.exportCurrentSelection()
        }
      }
    })
  },

  updateReminderStatus: function (record) {
    const today = formatDate(new Date())
    let text = '每日17:00后打开页面时检查'
    if (record && record.date === today) {
      if (record.action === 'never') {
        text = '今天已关闭提醒'
      } else if (record.action === 'export') {
        text = '今天已处理导出提醒'
      } else {
        text = '今天已提醒，可随时手动导出'
      }
    }
    this.setData({ reminderStatusText: text })
  },

  exportCurrentSelection: function () {
    this.generateReport(false)
    this.exportExcel()
  },

  remindLater: function () {
    saveReminderRecord('later')
    this.updateReminderStatus(getReminderRecord())
    wx.showToast({
      title: '已保留手动导出入口',
      icon: 'none'
    })
  },

  disableReminderToday: function () {
    saveReminderRecord('never')
    this.updateReminderStatus(getReminderRecord())
    wx.showToast({
      title: '今天不再提醒',
      icon: 'success'
    })
  }
})
