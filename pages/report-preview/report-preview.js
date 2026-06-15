const storage = require('../../utils/storage')
const reportGenerator = require('../../utils/reportGenerator')
const reportImageGenerator = require('../../utils/reportImageGenerator')

function pad(value) {
  return value < 10 ? '0' + value : String(value)
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function addDays(date, count) {
  const nextDate = new Date(date.getTime())
  nextDate.setDate(nextDate.getDate() + count)
  return nextDate
}

function getDateText(value) {
  return String(value || '').slice(0, 10)
}

function decodeOption(value, fallback) {
  try {
    return decodeURIComponent(value || fallback)
  } catch (error) {
    return value || fallback
  }
}

function getRangeDates(range, startDate, endDate) {
  const today = new Date()
  let start = formatDate(today)
  let end = start

  if (range === 'yesterday') {
    start = formatDate(addDays(today, -1))
    end = start
  } else if (range === 'last7') {
    start = formatDate(addDays(today, -6))
  } else if (range === 'month') {
    start = formatDate(new Date(today.getFullYear(), today.getMonth(), 1))
  } else if (range === 'custom') {
    start = startDate || formatDate(today)
    end = endDate || start
  }

  return {
    start: start,
    end: end
  }
}

function filterOrdersByRange(orders, range, startDate, endDate) {
  const dates = getRangeDates(range, startDate, endDate)
  return (Array.isArray(orders) ? orders : []).filter(function (order) {
    const date = getDateText(order.createdAt)
    return date >= dates.start && date <= dates.end
  })
}

function getRangeLabel(range, startDate, endDate) {
  if (range === 'yesterday') {
    return '昨日'
  }
  if (range === 'last7') {
    return '最近7天'
  }
  if (range === 'month') {
    return '本月'
  }
  if (range === 'custom') {
    return (startDate || '') + ' 至 ' + (endDate || startDate || '')
  }
  return '今日'
}

function getInitialTab(type) {
  const tabs = {
    harvest: 'harvest',
    delivery: 'delivery',
    order: 'orders',
    finance: 'summary'
  }
  return tabs[type] || 'summary'
}

function returnToProfile() {
  wx.switchTab({
    url: '/pages/profile/profile',
    fail: function () {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  })
}

function replaceTodayLabel(text, rangeLabel) {
  if (rangeLabel === '今日') {
    return text
  }
  return String(text || '').replace('今日', rangeLabel)
}

function formatGeneratedTime() {
  const date = new Date()
  return [
    formatDate(date),
    pad(date.getHours()) + ':' + pad(date.getMinutes())
  ].join(' ')
}

Page({
  data: {
    authorized: false,
    loading: true,
    reportType: 'order',
    reportLabel: '农户作业报表',
    activeTab: 'summary',
    tabs: [
      { key: 'summary', label: '汇总' },
      { key: 'harvest', label: '采摘备货' },
      { key: 'delivery', label: '发货配送' },
      { key: 'orders', label: '订单明细' }
    ],
    range: 'today',
    rangeLabel: '今日',
    startDate: '',
    endDate: '',
    orderCount: 0,
    summaryCards: [],
    overviewCards: [],
    harvestTotals: {
      guiweiWeight: '0',
      nuomiciWeight: '0',
      mixedWeight: '0',
      totalWeight: '0',
      giftBox5Count: 0,
      giftBox10Count: 0
    },
    harvestGroups: [],
    deliveryGroups: [],
    orderCards: [],
    finance: {
      paidAmount: '0',
      pendingPayAmount: '0',
      refundAmount: '0',
      actualIncome: '0'
    },
    report: {
      title: '',
      displayColumns: [],
      displayRecords: []
    },
    tableWidth: '740rpx',
    showTable: false,
    generatedFile: null,
    exporting: false,
    exportMessage: '正在生成报表文件',
    imageGenerating: false,
    generatedImagePath: '',
    showImageResult: false,
    showMoreSheet: false,
    lastUpdatedAt: ''
  },

  onLoad: function (options) {
    const reportType = decodeOption(options.type, 'order')
    this.setData({
      reportType: reportType,
      activeTab: getInitialTab(reportType),
      range: decodeOption(options.range, 'today'),
      startDate: decodeOption(options.startDate, ''),
      endDate: decodeOption(options.endDate, '')
    })
  },

  onShow: function () {
    const config = storage.getConfig()
    if (!storage.hasAdminAccess(config)) {
      wx.showModal({
        title: '报表预览',
        content: '无权限访问',
        showCancel: false,
        success: returnToProfile
      })
      return
    }

    const that = this
    this.setData({
      authorized: true,
      loading: true
    }, function () {
      that.loadReport()
    })
  },

  loadReport: function (showUpdatedToast) {
    const rangeLabel = getRangeLabel(
      this.data.range,
      this.data.startDate,
      this.data.endDate
    )
    const orders = filterOrdersByRange(
      storage.getOrders(),
      this.data.range,
      this.data.startDate,
      this.data.endDate
    )
    this.reportOrders = orders
    const report = reportGenerator.generateOrderDetailReport(orders)
    const reportView = reportGenerator.buildReportViewData(orders)
    const summaryCards = reportView.summaryCards.map(function (item) {
      return Object.assign({}, item, {
        label: replaceTodayLabel(item.label, rangeLabel)
      })
    })
    const tableWidth = Math.max(740, report.displayColumns.length * 190)

    this.setData({
      rangeLabel: rangeLabel,
      orderCount: orders.length,
      summaryCards: summaryCards,
      overviewCards: reportView.overviewCards.map(function (item) {
        return Object.assign({}, item, {
          label: replaceTodayLabel(item.label, rangeLabel)
        })
      }),
      harvestTotals: reportView.harvestTotals,
      harvestGroups: reportView.harvestGroups,
      deliveryGroups: reportView.deliveryGroups,
      orderCards: reportView.orderCards,
      finance: reportView.finance,
      report: report,
      tableWidth: tableWidth + 'rpx',
      showTable: false,
      generatedFile: null,
      generatedImagePath: '',
      showImageResult: false,
      lastUpdatedAt: formatGeneratedTime(),
      loading: false
    })
    if (showUpdatedToast) {
      wx.showToast({
        title: '报表已更新',
        icon: 'success'
      })
    }
  },

  refreshReport: function () {
    this.loadReport(true)
  },

  buildFileName: function () {
    const rangePart = this.data.rangeLabel.replace(/\s+/g, '').replace(/至/g, '_')
    return '荔枝有期_' + rangePart + '订单明细_' + reportGenerator.todayText() + '.csv'
  },

  selectTab: function (e) {
    this.setData({
      activeTab: e.currentTarget.dataset.tab
    })
  },

  toggleTable: function () {
    this.setData({
      showTable: !this.data.showTable
    })
  },

  showMoreActions: function () {
    this.setData({ showMoreSheet: true })
  },

  closeMoreActions: function () {
    this.setData({ showMoreSheet: false })
  },

  stopPropagation: function () {},

  handleMoreAction: function (e) {
    const action = e.currentTarget.dataset.action
    this.closeMoreActions()
    if (action === 'copy') {
      this.copyTableContent()
    } else if (action === 'csv') {
      this.generateCSVFile()
    } else if (action === 'share') {
      this.shareFile()
    }
  },

  generateReportImage: function () {
    if (this.data.imageGenerating) {
      return
    }
    const that = this
    this.setData({ imageGenerating: true })
    wx.createSelectorQuery()
      .in(this)
      .select('#reportCanvas')
      .fields({ node: true, size: true })
      .exec(function (result) {
        const canvasInfo = result && result[0]
        if (!canvasInfo || !canvasInfo.node || !canvasInfo.width || !canvasInfo.height) {
          that.setData({ imageGenerating: false })
          wx.showToast({
            title: '报表图片生成失败',
            icon: 'none'
          })
          return
        }

        const systemInfo = wx.getWindowInfo
          ? wx.getWindowInfo()
          : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : {})
        const imageData = reportImageGenerator.buildReportImageData({
          title: '荔枝有期报表摘要',
          rangeLabel: that.data.rangeLabel,
          generatedAt: formatGeneratedTime(),
          summaryCards: that.data.summaryCards,
          orderCards: that.data.orderCards
        })

        reportImageGenerator.generateReportImage(
          canvasInfo.node,
          canvasInfo.width,
          canvasInfo.height,
          imageData,
          systemInfo.pixelRatio
        ).then(function (filePath) {
          that.setData({
            imageGenerating: false,
            generatedImagePath: filePath,
            showImageResult: true
          })
        }).catch(function () {
          that.setData({ imageGenerating: false })
          wx.showToast({
            title: '报表图片生成失败',
            icon: 'none'
          })
        })
      })
  },

  closeImageResult: function () {
    this.setData({ showImageResult: false })
  },

  previewReportImage: function () {
    if (!this.data.generatedImagePath) {
      return
    }
    wx.previewImage({
      current: this.data.generatedImagePath,
      urls: [this.data.generatedImagePath]
    })
  },

  saveReportImage: function () {
    const filePath = this.data.generatedImagePath
    if (!filePath) {
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: function () {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        })
      },
      fail: function (error) {
        const denied = error && /auth deny|auth denied/.test(error.errMsg || '')
        if (!denied) {
          wx.showToast({
            title: '保存图片失败',
            icon: 'none'
          })
          return
        }
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中允许保存图片到相册。',
          confirmText: '去设置',
          success: function (result) {
            if (result.confirm && wx.openSetting) {
              wx.openSetting()
            }
          }
        })
      }
    })
  },

  shareReportImage: function () {
    const filePath = this.data.generatedImagePath
    if (!filePath) {
      return
    }
    if (typeof wx.showShareImageMenu === 'function') {
      wx.showShareImageMenu({
        path: filePath,
        fail: function () {
          wx.previewImage({
            current: filePath,
            urls: [filePath]
          })
        }
      })
      return
    }
    wx.showModal({
      title: '当前环境暂不支持直接转发',
      content: '已为你打开图片预览，可长按保存后发送到微信群或文件传输助手。',
      showCancel: false,
      success: function () {
        wx.previewImage({
          current: filePath,
          urls: [filePath]
        })
      }
    })
  },

  copyTableContent: function () {
    const text = reportGenerator.buildTSV(this.data.report)
    wx.setClipboardData({
      data: text,
      success: function () {
        wx.showToast({
          title: '已复制表格内容',
          icon: 'success'
        })
      }
    })
  },

  getCSVText: function () {
    const orders = Array.isArray(this.reportOrders) ? this.reportOrders : []
    return reportGenerator.buildOrderDetailCSV(orders)
  },

  ensureCSVFile: function () {
    if (this.data.generatedFile) {
      return Promise.resolve(this.data.generatedFile)
    }
    return reportGenerator.saveCSVFile(this.buildFileName(), this.getCSVText())
  },

  generateCSVFile: function () {
    if (this.data.exporting) {
      return
    }
    const that = this
    this.setData({
      exporting: true,
      exportMessage: '正在生成 CSV 文件'
    })
    this.ensureCSVFile().then(function (result) {
      that.setData({
        generatedFile: result,
        exporting: false
      })
      wx.showModal({
        title: 'CSV 文件已生成',
        content: '文件已准备好，可在“更多”中继续选择分享 CSV。',
        showCancel: false,
        confirmText: '知道了'
      })
    }).catch(function () {
      that.setData({ exporting: false })
      wx.showToast({
        title: 'CSV 生成失败',
        icon: 'none'
      })
    })
  },

  shareFile: function () {
    if (this.data.exporting) {
      return
    }
    const that = this
    this.setData({
      exporting: true,
      exportMessage: '正在准备分享 CSV 文件'
    })
    this.ensureCSVFile().then(function (result) {
      that.setData({
        generatedFile: result,
        exporting: false
      })
      return reportGenerator.shareCSVFile(result.filePath, result.fileName).then(function () {
        wx.showModal({
          title: '分享CSV文件',
          content: '报表文件已生成，可发送到文件传输助手或家人微信。',
          showCancel: false,
          confirmText: '知道了'
        })
      })
    }).catch(function (error) {
      that.setData({ exporting: false })
      const unsupported = error && error.message === '当前环境不支持分享文件'
      wx.showModal({
        title: unsupported ? '当前环境暂不支持分享' : '文件分享未完成',
        content: unsupported
          ? '请在真机微信中使用“分享CSV文件”，或先复制表格内容粘贴到 Excel / WPS。'
          : '可重新点击分享，或先复制表格内容使用。',
        showCancel: false
      })
    })
  }
})
