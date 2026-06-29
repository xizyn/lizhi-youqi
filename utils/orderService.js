// 云端订单服务层：第一阶段只提供封装，不替换现有 wx storage 订单流程。
// 后续页面迁移时优先调用这里，避免把 wx.cloud.callFunction 分散到页面 JS。

const CLOUD_FUNCTION_NAME = 'orders'

function isCloudReady() {
  return !!(wx && wx.cloud && typeof wx.cloud.callFunction === 'function')
}

function callOrders(action, data) {
  if (!isCloudReady()) {
    return Promise.resolve({
      ok: false,
      code: 'CLOUD_NOT_READY',
      message: '云开发尚未初始化，暂不能使用云端订单'
    })
  }

  return wx.cloud.callFunction({
    name: CLOUD_FUNCTION_NAME,
    data: Object.assign({ action: action }, data || {})
  }).then(function (res) {
    const result = res && res.result ? res.result : {}
    if (result && typeof result.ok !== 'undefined') {
      return result
    }
    return {
      ok: false,
      code: 'INVALID_CLOUD_RESPONSE',
      message: '云函数返回格式异常',
      raw: result
    }
  }).catch(function (error) {
    return {
      ok: false,
      code: 'CLOUD_CALL_FAILED',
      message: error && error.errMsg ? error.errMsg : '云端订单服务调用失败',
      error: error
    }
  })
}

function createOrder(payload) {
  return callOrders('create', { payload: payload || {} })
}

function listMyOrders(options) {
  return callOrders('listMine', { options: options || {} })
}

function getOrderDetail(id) {
  return callOrders('detail', { id: id })
}

function adminListOrders(options) {
  return callOrders('adminList', { options: options || {} })
}

function adminUpdateOrder(payload) {
  return callOrders('adminUpdate', { payload: payload || {} })
}

function cancelMyOrder(id) {
  return callOrders('cancelMine', { id: id })
}

module.exports = {
  createOrder: createOrder,
  listMyOrders: listMyOrders,
  getOrderDetail: getOrderDetail,
  adminListOrders: adminListOrders,
  adminUpdateOrder: adminUpdateOrder,
  cancelMyOrder: cancelMyOrder
}
