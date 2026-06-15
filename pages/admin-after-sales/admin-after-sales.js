const storage = require('../../utils/storage')
const afterSaleService = require('../../utils/afterSaleService')
const afterSaleLogService = require('../../utils/afterSaleLogService')

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'rejected', label: '已拒绝' }
]

function returnToProfile() {
  wx.switchTab({
    url: '/pages/profile/profile',
    fail: function () { wx.reLaunch({ url: '/pages/index/index' }) }
  })
}

function formatRecord(record) {
  const meta = afterSaleService.getStatusMeta(record.status)
  return Object.assign({}, record, {
    statusText: meta.label,
    statusTone: meta.tone,
    productText: record.productName || '商品信息待确认',
    weightText: record.specText || ((Number(record.totalWeight) || 0) + '斤'),
    deliveryTag: formatDeliveryTag(record.deliveryMethod),
    communicationLogs: afterSaleLogService.getLogs(record.afterSaleId),
    logTypeIndex: 0,
    newLogContent: '',
    logRemaining: 200,
    expanded: false
  })
}

function formatDeliveryTag(method) {
  const value = String(method || '')
  if (value.indexOf('快递') >= 0 || value.indexOf('顺丰') >= 0 || value === 'express') {
    return '顺丰冷运'
  }
  if (value.indexOf('附近') >= 0 || value.indexOf('同城') >= 0 || value === 'localDelivery') {
    return '附近送'
  }
  if (value.indexOf('自提') >= 0 || value === 'pickup') {
    return '果园自提'
  }
  return value || '配送待确认'
}

Page({
  data: {
    authorized: false,
    config: {},
    filters: [],
    activeFilter: 'all',
    records: [],
    allRecords: [],
    orders: [],
    orderLabels: [],
    rulesExpanded: false,
    manualExpanded: false,
    manualOrderIndex: 0,
    manualTypeIndex: 0,
    manualForm: {
      description: '',
      adminReply: ''
    },
    adminRecordTypes: afterSaleLogService.ADMIN_RECORD_TYPES,
    resultOptions: ['接受并处理中', '补发', '部分退款', '全额退款', '其他协商方案', '拒绝申请']
  },

  onShow: function () {
    const config = storage.getConfig()
    if (!storage.hasAdminAccess(config)) {
      wx.showModal({
        title: '售后管理',
        content: '无权限访问',
        showCancel: false,
        success: returnToProfile
      })
      return
    }
    this.setData({ authorized: true })
    this.loadData()
  },

  loadData: function () {
    const allRecords = storage.getAfterSales().map(formatRecord)
    const activeFilter = this.data.activeFilter
    const records = activeFilter === 'all'
      ? allRecords
      : allRecords.filter(function (item) { return item.status === activeFilter })
    const orders = storage.getOrders()
    this.setData({
      config: afterSaleService.getConfig(),
      allRecords: allRecords,
      records: records,
      orders: orders,
      orderLabels: orders.map(function (item) {
        return (item.orderNo || item.id) + ' · ' + (item.recipientName || item.pickupName || item.name || item.wechatId || '未填写')
      }),
      filters: FILTERS.map(function (item) {
        return Object.assign({}, item, {
          count: item.key === 'all'
            ? allRecords.length
            : allRecords.filter(function (record) { return record.status === item.key }).length,
          active: item.key === activeFilter
        })
      })
    })
  },

  switchFilter: function (e) {
    this.setData({ activeFilter: e.currentTarget.dataset.key || 'all' })
    this.loadData()
  },

  toggleRules: function () {
    this.setData({ rulesExpanded: !this.data.rulesExpanded })
  },

  toggleManualRegistration: function () {
    this.setData({ manualExpanded: !this.data.manualExpanded })
  },

  toggleDetail: function (e) {
    const id = e.currentTarget.dataset.id
    this.setData({
      records: this.data.records.map(function (item) {
        return Object.assign({}, item, {
          expanded: item.afterSaleId === id ? !item.expanded : item.expanded
        })
      })
    })
  },

  previewImage: function (e) {
    const record = this.data.records[Number(e.currentTarget.dataset.recordIndex)]
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: (record && record.evidenceImages) || []
    })
  },

  previewLogImage: function (e) {
    const record = this.data.records[Number(e.currentTarget.dataset.recordIndex)]
    const log = record && record.communicationLogs[Number(e.currentTarget.dataset.logIndex)]
    wx.previewImage({
      current: e.currentTarget.dataset.src,
      urls: (log && log.images) || []
    })
  },

  copyOrderNo: function (e) {
    const record = this.data.records[Number(e.currentTarget.dataset.index)]
    this.copyText((record && record.orderNo) || '', '订单号已复制')
  },

  copyPhone: function (e) {
    const record = this.data.records[Number(e.currentTarget.dataset.index)]
    this.copyText((record && record.customerPhone) || '', '手机号已复制')
  },

  copyText: function (value, successText) {
    if (!value || value === '未填写') {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: String(value),
      success: function () {
        wx.showToast({ title: successText, icon: 'success' })
      }
    })
  },

  inputRecordField: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    this.setData({
      ['records[' + index + '].' + field]: e.detail.value
    })
  },

  inputAdminLog: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const value = e.detail.value || ''
    this.setData({
      ['records[' + index + '].newLogContent']: value,
      ['records[' + index + '].logRemaining']: Math.max(0, 200 - value.length)
    })
  },

  changeAdminLogType: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({
      ['records[' + index + '].logTypeIndex']: Number(e.detail.value)
    })
  },

  addAdminLog: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const record = this.data.records[index]
    const content = String((record && record.newLogContent) || '').trim()
    if (!content) {
      wx.showToast({ title: '请填写处理记录', icon: 'none' })
      return
    }
    const result = afterSaleLogService.appendLog(record.afterSaleId, {
      recordType: this.data.adminRecordTypes[record.logTypeIndex] || '其他',
      content: content,
      images: []
    }, { role: 'admin' })
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }
    this.loadData()
    this.setData({
      records: this.data.records.map(function (item) {
        return Object.assign({}, item, {
          expanded: item.afterSaleId === record.afterSaleId
        })
      })
    })
    wx.showToast({ title: '处理记录已保存', icon: 'success' })
  },

  processRecord: function (e) {
    const index = Number(e.currentTarget.dataset.index)
    const action = e.currentTarget.dataset.action
    if (action === 'reject') {
      const that = this
      wx.showModal({
        title: '确认拒绝',
        content: '确定要驳回该售后申请吗？驳回后将记录到处理日志。',
        cancelText: '取消',
        confirmText: '确定拒绝',
        confirmColor: '#a34a43',
        success: function (res) {
          if (res.confirm) {
            that.executeProcessRecord(index, action)
          }
        }
      })
      return
    }
    this.executeProcessRecord(index, action)
  },

  executeProcessRecord: function (index, action) {
    const record = this.data.records[index]
    const actionMap = {
      processing: 'processing',
      replacement: '补发',
      partialRefund: '部分退款',
      fullRefund: '全额退款',
      negotiate: '其他协商方案',
      resolved: '线下处理完成',
      reject: 'reject'
    }
    const result = afterSaleService.processAfterSale(record.afterSaleId, {
      action: actionMap[action],
      adminReply: record.adminReply,
      rejectReason: record.rejectReason,
      approvedAmount: record.approvedAmount,
      replacementInfo: record.replacementInfo
    })
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }
    if (action === 'reject') {
      afterSaleLogService.appendLog(record.afterSaleId, {
        recordType: '拒绝原因',
        content: String(record.rejectReason || '').trim(),
        images: []
      }, { role: 'admin' })
    }
    this.loadData()
    wx.showToast({ title: '售后记录已更新', icon: 'success' })
  },

  changeManualOrder: function (e) {
    this.setData({ manualOrderIndex: Number(e.detail.value) })
  },

  changeManualType: function (e) {
    this.setData({ manualTypeIndex: Number(e.detail.value) })
  },

  inputManual: function (e) {
    this.setData({
      ['manualForm.' + e.currentTarget.dataset.field]: e.detail.value
    })
  },

  inputConfig: function (e) {
    this.setData({
      ['config.' + e.currentTarget.dataset.field]: e.detail.value
    })
  },

  saveConfig: function () {
    const config = storage.getConfig()
    config.afterSale = Object.assign({}, config.afterSale || {}, {
      applicationWindowHours: Math.max(1, Number(this.data.config.applicationWindowHours) || 24)
    })
    storage.saveConfig(config)
    this.loadData()
    wx.showToast({ title: '售后规则已保存', icon: 'success' })
  },

  createManualRecord: function () {
    const order = this.data.orders[this.data.manualOrderIndex]
    const config = afterSaleService.getConfig()
    if (!order) {
      wx.showToast({ title: '暂无可关联订单', icon: 'none' })
      return
    }
    const result = afterSaleService.createAfterSale(order.id, {
      type: (config.types || [])[this.data.manualTypeIndex] || '其他问题',
      requestMethod: '联系客服协商',
      description: this.data.manualForm.description || '管理员手动登记',
      adminReply: this.data.manualForm.adminReply || '管理员已登记，正在处理中。',
      evidenceImages: []
    }, { admin: true })
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: 'none' })
      return
    }
    this.setData({
      manualForm: { description: '', adminReply: '' },
      manualExpanded: false
    })
    this.loadData()
    wx.showToast({ title: '售后记录已登记', icon: 'success' })
  }
})
