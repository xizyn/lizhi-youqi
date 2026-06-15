const orderPage = require('../../utils/orderPage')

Page(orderPage.createOrderPage({
  title: '同城快送下单',
  subtitle: '第三方平台配送，果品价格不含运费，提交后客服确认最终运费和发货时间。',
  deliveryMethod: '快递',
  thirdPartyMethod: '同城快送',
  requiresRecipient: true,
  submitText: '提交同城快送订单'
}))
