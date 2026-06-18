const salesStatuses = [
  {
    value: 'preparing',
    label: '下单准备中',
    description: '后台可先配置价格和说明，用户提交订单后由客服再确认库存、价格和时间。'
  },
  {
    value: 'presale',
    label: '可提交订单',
    description: '用户可以提交订单，最终库存、运费和发货时间由客服确认。'
  },
  {
    value: 'picking',
    label: '采摘安排中',
    description: '根据成熟批次安排采摘，发出时间受采摘影响。'
  },
  {
    value: 'weather_delay',
    label: '采摘受影响',
    description: '如遇天气或果园情况变化，客服会重新确认发货或自提时间。'
  },
  {
    value: 'paused',
    label: '暂停接单',
    description: '当前暂不接受新的订单。'
  },
  {
    value: 'sold_out',
    label: '暂时售罄',
    description: '当前批次暂时售罄，可等待客服后续通知。'
  }
]

const orchard = {
  name: '荔枝有期',
  city: '深圳',
  location: '深圳市南山区桃园街道珠光村西区后山处',
  headline: '深圳本地自家果园，等荔枝真正成熟再开售。',
  summary: '果子来自自家种植、自家采摘的本地果园。荔枝成熟窗口短，受天气和雨水影响明显，小程序先用于展示果园、收集提醒和订单意向。',
  sellingPoints: ['深圳本地', '自家果园', '桂味', '糯米糍', '附近配送', '预约自提'],
  process: [
    '观察天气、雨水和果树成熟度',
    '成熟前通知已登记客户',
    '按批次采摘、分拣和包装',
    '按客户选择安排自提、附近送、同城快送或顺丰快递'
  ],
  addressNote: '果园位置在深圳市南山区桃园街道珠光村西区后山处。来果园需要提前预约，具体到访时间由客服确认。'
}

const varietyOptions = ['桂味', '糯米糍', '混装']
const specOptions = ['5斤装', '10斤装']
const skuOptions = [
  { id: 'nuomici-5', name: '糯米糍5斤装', variety: '糯米糍', spec: '5斤装', specDesc: '约5斤鲜果', priceKey: 'nuomici5', displayPrice: 170, expressPrice: 170, image: '/assets/images/products/nuomici-5.jpg' },
  { id: 'nuomici-10', name: '糯米糍10斤装', variety: '糯米糍', spec: '10斤装', specDesc: '约10斤鲜果', priceKey: 'nuomici10', displayPrice: 270, expressPrice: 270, image: '/assets/images/products/nuomici-10.jpg' },
  { id: 'guiwei-5', name: '桂味5斤装', variety: '桂味', spec: '5斤装', specDesc: '约5斤鲜果', priceKey: 'guiwei5', displayPrice: 120, expressPrice: 120, image: '/assets/images/products/guiwei-5.jpg' },
  { id: 'guiwei-10', name: '桂味10斤装', variety: '桂味', spec: '10斤装', specDesc: '约10斤鲜果', priceKey: 'guiwei10', displayPrice: 220, expressPrice: 220, image: '/assets/images/products/guiwei-10.jpg' },
  { id: 'mixed-5', name: '混装5斤装', variety: '混装', spec: '5斤装', specDesc: '约5斤鲜果', priceKey: 'mixed5', displayPrice: 150, expressPrice: 150, image: '/assets/images/products/mix-5.jpg' },
  { id: 'mixed-10', name: '混装10斤装', variety: '混装', spec: '10斤装', specDesc: '约10斤鲜果', priceKey: 'mixed10', displayPrice: 245, expressPrice: 245, image: '/assets/images/products/mix-10.jpg' }
]
const yesNoOptions = ['否', '是']
const identityOptions = ['大学生', '附近居民', '普通客户', '企业客户']
const areaOptions = ['深圳职业技术大学', '珠光村', '新屋村', '九祥岭', '其他']
const purposeOptions = ['自用', '送礼']
const deliveryOptions = ['附近送货', '同城快送', '顺丰邮寄', '自提']
const freightAckOptions = ['否', '是']
const giftBoxOptions = ['需要礼盒', '不需要礼盒', '待确认']
const pickupConfirmOptions = ['否', '是']
const pickupTimeSlots = ['上午 9:00-11:00', '下午 14:00-17:00', '傍晚 17:00-19:00', '客服确认']
const expressMethods = ['同城快送', '顺丰快递']
const nearbyAreaOptions = ['珠光村', '新屋村', '九祥岭', '深圳职业技术大学附近', '其他区域']
const supportedNearbyAreas = ['珠光村', '新屋村', '九祥岭', '深圳职业技术大学附近']
const freightPayerOptions = ['买家承担']
const shipStatusOptions = ['待发货', '已送出', '已延迟']
const shippingFeeStatusOptions = ['未确认', '已预收', '已结算', '已退款', '异常待确认']
const adminPassword = '123456'

const orderStatuses = [
  '已提交',
  '待付款',
  '已支付',
  '待采摘',
  '待打包',
  '待发货/待自提',
  '已送出',
  '已完成',
  '已取消',
  '售后处理中',
  '售后已处理'
]

const currentOrderStatuses = [
  '已提交',
  '待付款',
  '已支付',
  '待采摘',
  '待打包',
  '待发货/待自提',
  '已送出',
  '售后处理中'
]

const historyOrderStatuses = ['已完成', '已取消', '售后已处理']

const priceFields = [
  { key: 'guiweiPickupNearbyUnit', label: '桂味自提/附近送单价（元/斤）' },
  { key: 'nuomiciPickupNearbyUnit', label: '糯米糍自提/附近送单价（元/斤）' },
  { key: 'guiwei5', label: '桂味 5斤装价格' },
  { key: 'guiwei10', label: '桂味 10斤装价格' },
  { key: 'nuomici5', label: '糯米糍 5斤装价格' },
  { key: 'nuomici10', label: '糯米糍 10斤装价格' },
  { key: 'mixed5', label: '混装 5斤装价格' },
  { key: 'mixed10', label: '混装 10斤装价格' },
  { key: 'giftBox5', label: '5斤装礼盒费用' },
  { key: 'giftBox10', label: '10斤装礼盒费用' }
]

const shippingFeeFields = [
  { key: 'city5', label: '同城快送 5斤装预收运费' },
  { key: 'city10', label: '同城快送 10斤装预收运费' },
  { key: 'sf5', label: '顺丰快递 5斤装预收运费' },
  { key: 'sf10', label: '顺丰快递 10斤装预收运费' }
]

const defaultPrices = {
  guiweiPickupNearbyUnit: 24,
  nuomiciPickupNearbyUnit: 34,
  guiwei5: 168,
  guiwei10: 308,
  nuomici5: 178,
  nuomici10: 328,
  mixed5: 178,
  mixed10: 318,
  giftBox5: 3,
  giftBox10: 5
}

const defaultShippingFees = {
  city5: 0,
  city10: 0,
  sf5: 0,
  sf10: 0
}

const defaultExpressDeliveryConfig = {
  shippingFeeRanges: {
    '5斤装': { min: 20, max: 35 },
    '10斤装': { min: 30, max: 50 }
  },
  remoteShippingFeeRanges: {
    '5斤装': { min: 35, max: 55 },
    '10斤装': { min: 50, max: 75 }
  },
  remoteRegions: ['新疆', '西藏', '青海', '内蒙古', '宁夏', '甘肃', '海南'],
  listNotice: '商品价格不含快递费，页面运费为参考估算，实际以发货前确认及顺丰结算为准。',
  coldChainSummary: '顺丰冷运配送，运费为参考估算，发货前会确认。',
  coldChainDetail: '快递订单采用顺丰冷运配送。页面展示的运费为参考估算，实际运费、发货时间和配送时效以发货前确认及顺丰实际服务为准。偏远地区可能需要单独确认。',
  remoteNotice: '偏远地区、海岛及顺丰特殊服务区域可能需要单独确认运费和是否可达。',
  transitNotice: '顺丰冷运配送，具体时效以顺丰实际揽收和目的地服务能力为准。',
  orderTip: '预估合计仅供参考，实际金额以发货前确认及顺丰实际结算为准。',
  mixNotice: '桂味 + 糯米糍组合，可在备注中说明搭配偏好。',
  submitNotice: '提交后等待客服确认库存、运费和发货时间。'
}

const defaultNearbyDeliveryConfig = {
  subtitle: '深圳本地指定区域配送，现摘后安排送达',
  supportedAreas: ['珠光村', '新屋村', '九祥岭', '深圳职业技术大学附近'],
  areaOptions: ['珠光村', '新屋村', '九祥岭', '深圳职业技术大学附近', '其他区域'],
  areaLabels: {
    '深圳职业技术大学附近': '深职大附近'
  },
  scopeNote: '超出以上区域，可选择到园自提或顺丰冷运。',
  summaryNotice: '提交后客服会确认库存、价格和配送时间。',
  detailNotice: '附近送订单提交后，客服会根据当天采摘情况确认库存、价格和配送时间。荔枝按成熟批次安排采摘，配送时间可能受采摘进度、天气和当天订单量影响。超出配送范围的订单，建议改为自提或顺丰冷运。',
  unsupportedNotice: '当前区域暂不支持附近送，可选择到园自提或顺丰冷运。',
  scheduleNotice: '当天采摘后安排配送，具体时间以客服确认为准。',
  deliveryFee: 0,
  priceNotice: '预计金额按当前参考单价计算，最终以客服确认库存和当日价格为准。',
  submitSuccessNotice: '订单已提交，客服会尽快联系您确认库存、价格和配送时间，请保持电话畅通。'
}

const reminderStages = ['尚未挂果', '生长中', '膨大期', '转色期', '即将成熟', '即将开售', '已开售', '本季售罄']

const defaultSaleReminderConfig = {
  reservationYear: 2027,
  reservationOpen: true,
  currentStage: '尚未挂果',
  lastUpdated: '2026-06-13',
  expectedMaturityDate: '预计2027年6月底',
  expectedSaleDate: '预计2027年6月底至7月中旬',
  actualSaleDate: '',
  situationNote: '果园会根据天气、挂果和成熟情况持续更新，实际时间以当季采摘安排为准。',
  varieties: ['桂味', '糯米糍', '黄皮'],
  subscriptionTemplateId: '',
  cloudEnabled: false,
  purchasePage: '/pages/express/express',
  orchardUpdates: []
}

const defaultAfterSaleConfig = {
  applicationWindowHours: 24,
  evidenceMinCount: 1,
  evidenceMaxCount: 6,
  descriptionMaxLength: 300,
  types: ['坏果/腐烂', '运输破损', '少发/漏发', '商品与订单不符', '其他问题'],
  requestMethods: ['补发', '部分退款', '联系客服协商'],
  evidenceTip: '坏果问题建议上传坏果整体、细节和快递面单；其他问题按实际情况提供清晰凭证。',
  perishableNotice: '荔枝属于鲜活易腐商品，不支持无理由退货；如存在坏果、破损、少发或商品不符，请在规定时间内提交凭证，我们会根据实际情况处理。',
  serviceNotice: '当前为本机演示模式，售后记录和图片不能跨设备同步，退款及补发由客服线下确认处理。',
  contactWechat: 'lizhi-youqi'
}

const defaultSkuStatusMap = skuOptions.reduce(function (map, sku) {
  map[sku.id] = {
    isListed: true,
    isSoldOut: false
  }
  return map
}, {})

const orchardLocation = {
  name: '荔枝有期果园',
  address: '广东省深圳市南山区珠光路314号',
  latitude: null,
  longitude: null,
  contactPhone: '',
  guideNotice: '山地入口不明显，建议先导航至珠光路314号，再按照下方入口指引前往。',
  parkingNotice: '停车位置以现场情况和客服确认为准，请勿占用居民通道。',
  entranceNotice: '红色定位点为果园入口附近，请按照箭头方向进入。山地道路较窄，建议步行进入。',
  maps: [
    {
      id: 'area',
      title: '周边位置',
      image: '/assets/images/maps/orchard-map-area.jpg',
      description: '先沿珠光路前往珠光村方向。',
      markers: [
        { label: '果园大致方向', x: 45, y: 62, tone: 'green' },
        { label: '珠光村', x: 16, y: 86, tone: 'dark' },
        { label: '珠光登山口', x: 63, y: 78, tone: 'green' }
      ]
    },
    {
      id: 'landmark',
      title: '附近地标',
      image: '/assets/images/maps/orchard-map-landmark.jpg',
      description: '到达珠光路314号附近后，请根据“果园入口”地图继续前往。',
      markers: [
        { label: '塘朗雅苑', x: 13, y: 8, tone: 'dark' },
        { label: '停车位置', x: 13, y: 21, tone: 'blue' },
        { label: '果园所在方向', x: 57, y: 17, tone: 'green' },
        { label: '珠光村', x: 7, y: 64, tone: 'dark' },
        { label: '珠光路', x: 27, y: 91, tone: 'green' }
      ]
    },
    {
      id: 'entrance',
      title: '果园入口',
      image: '/assets/images/maps/orchard-map-entrance.jpg',
      description: '红色定位点为果园入口附近，请按照箭头方向进入。',
      routeArrow: {
        image: '/assets/icons/map-route-arrow.png',
        x: 38,
        y: 54,
        width: 28,
        height: 34
      },
      markers: [
        { label: '荔枝有期果园入口', x: 45, y: 43, tone: 'red' },
        { label: '从这里进入', x: 51, y: 76, tone: 'green' },
        { label: '建议步行进入', x: 8, y: 84, tone: 'dark' }
      ]
    }
  ]
}

const defaultConfig = {
  salesStatus: 'presale',
  isAdminMock: true,
  adminAuthMode: 'mock',
  mockOpenid: 'mock-user-openid',
  adminOpenidWhitelist: ['mock-admin-openid'],
  adminRole: 'superAdmin',
  adminPassword: adminPassword,
  announcement: '提交订单后，客服会根据当天采摘情况确认库存、价格、运费和发货时间。',
  harvestStatus: '根据成熟批次安排采摘，发出时间受采摘影响。',
  pickupAddress: '深圳市南山区桃园街道珠光村西区后山处',
  pickupTime: '具体自提时间以客服确认为准',
  pickupTimeSlots: ['9:00-11:00', '14:00-17:00'],
  pickupMapImage: '/assets/images/pickup-map.png',
  orchardLocation: orchardLocation,
  saleReminder: defaultSaleReminderConfig,
  afterSale: defaultAfterSaleConfig,
  prices: defaultPrices,
  varietyStock: {
    guiweiWeight: '',
    nuomiciWeight: ''
  },
  shippingFees: defaultShippingFees,
  expressDelivery: defaultExpressDeliveryConfig,
  nearbyDelivery: defaultNearbyDeliveryConfig,
  skuStatusMap: defaultSkuStatusMap
}

const deliveryNotice = [
  '同城快送和顺丰快递均为第三方平台配送。',
  '果品价格不包含运费。',
  '运费由买家承担。',
  '顺丰快递不支持礼盒包装。',
  '自提、附近送和同城快送支持礼盒，5斤礼盒+3元，10斤礼盒+5元。',
  '快递不支持到付。',
  '5斤装按4kg预估运费，10斤装按6kg预估运费。',
  '发货后以顺丰实际运费为准。',
  '实际运费明显异常或远高于预估时，发货前由客服确认。',
  '提交订单后由客服确认最终运费和发货时间。',
  '发出时间受采摘影响。'
]

const courierWeightRules = {
  '5斤装': {
    fruitWeightText: '5斤装',
    estimatedCourierWeight: 4,
    estimatedCourierWeightText: '4kg'
  },
  '10斤装': {
    fruitWeightText: '10斤装',
    estimatedCourierWeight: 6,
    estimatedCourierWeightText: '6kg'
  }
}

const courierFeeNotice = '快递订单按预估计费重量收取运费：5斤装按4kg预估，10斤装按6kg预估。预估计费重量包含纸箱、保鲜材料、果柄枝叶及包装体积等因素。快递费不作为利润来源，发货后以顺丰实际运费为准，多收部分退还；小额超出由荔枝有期自行承担，明显异常运费将由客服确认。'

const freightNotice = '运费以顺丰实际价格为准，需由买家承担，提交预约后由客服确认最终费用。'
const nearbyDeliveryScope = '附近送货范围仅限：珠光村、新屋村、九祥岭、深圳职业技术大学附近区域。'
const freightRequiredDelivery = ['同城快送', '顺丰邮寄']
const branchNotice = '保留少量枝叶更有现摘感，但会占用一定包装空间，默认不大量保留。'
const giftNotice = '送礼订单建议选择下单人预付运费，避免收礼人承担运费。'
const unsupportedNearbyNotice = '该区域暂不支持附近送，可选择自提、同城快送或顺丰快递。'
const weightNotice = '荔枝为鲜果，出货前会按规格称重装箱。运输途中可能因水分挥发、果柄枝叶及自然损耗产生轻微重量浮动，属于鲜果正常情况。如出现明显异常，可在签收后及时联系客服处理。'
const contactService = {
  wechatId: 'lizhi-youqi',
  qrCode: '/assets/images/contact-qrcode.png',
  qrCodeReady: false,
  serviceTime: '每日 09:00 - 21:00',
  description: '添加客服微信，方便接收开售提醒、确认订单、配送沟通和售后处理。'
}

const memberMock = {
  normal: {
    avatar: '/assets/images/products/mix-5.jpg',
    nickname: '荔枝爱好者',
    memberTag: '普通会员',
    userCode: 'WeChat_1234',
    totalSpend: '328.00',
    totalWeight: '12.5',
    points: 268
  },
  admin: {
    avatar: '/assets/images/products/guiwei-5.jpg',
    nickname: '果园管理员',
    memberTag: '管理员',
    userCode: 'WeChat_5678',
    totalSpend: '328.00',
    totalWeight: '12.5',
    points: 268
  }
}

const coupons = [
  { id: 'c1', title: '满100减10', amount: '10', desc: '满100元可用', validTime: '2026.06.01-2026.06.30', status: '可用' },
  { id: 'c2', title: '采摘专享券', amount: '9折', desc: '果园订单可用', validTime: '2026.06.01-2026.06.30', status: '可用' },
  { id: 'c3', title: '老客提醒券', amount: '5', desc: '开售后客服确认使用', validTime: '2026.05.01-2026.05.31', status: '已过期' }
]

const couponTypes = ['满减券', '折扣券', '自提券', '新人券', '老客户券']
const couponApplyScenes = ['全部', '自提', '快递', '附近送']
const couponStatuses = ['未上架', '已上架', '已停用']

const adminCoupons = [
  {
    couponId: 'CP2027061001',
    couponName: '开售提醒满100减10',
    couponType: '满减券',
    thresholdAmount: 100,
    discountAmount: 10,
    discountRate: '',
    applyScene: '全部',
    validStart: '2027-06-20',
    validEnd: '2027-07-20',
    totalCount: 200,
    issuedCount: 24,
    usedCount: 3,
    status: '已上架'
  },
  {
    couponId: 'CP2027061002',
    couponName: '自提客户专享券',
    couponType: '自提券',
    thresholdAmount: 80,
    discountAmount: 5,
    discountRate: '',
    applyScene: '自提',
    validStart: '2027-06-20',
    validEnd: '2027-07-20',
    totalCount: 100,
    issuedCount: 10,
    usedCount: 0,
    status: '已上架'
  },
  {
    couponId: 'CP2027061003',
    couponName: '老客户九折券',
    couponType: '老客户券',
    thresholdAmount: 0,
    discountAmount: '',
    discountRate: 9,
    applyScene: '全部',
    validStart: '2027-06-20',
    validEnd: '2027-07-20',
    totalCount: 80,
    issuedCount: 8,
    usedCount: 1,
    status: '未上架'
  }
]

const userCoupons = [
  {
    recordId: 'UC2027061001',
    couponId: 'CP2027061001',
    couponName: '开售提醒满100减10',
    couponType: '满减券',
    thresholdAmount: 100,
    discountAmount: 10,
    discountRate: '',
    applyScene: '全部',
    validStart: '2027-06-20',
    validEnd: '2027-07-20',
    status: '可用',
    receivedAt: '2026-06-05 15:00'
  },
  {
    recordId: 'UC2027061002',
    couponId: 'CP2027061002',
    couponName: '自提客户专享券',
    couponType: '自提券',
    thresholdAmount: 80,
    discountAmount: 5,
    discountRate: '',
    applyScene: '自提',
    validStart: '2027-06-20',
    validEnd: '2027-07-20',
    status: '已使用',
    receivedAt: '2026-06-05 15:00'
  },
  {
    recordId: 'UC2026050101',
    couponId: 'CP2026050101',
    couponName: '旧季提醒券',
    couponType: '满减券',
    thresholdAmount: 100,
    discountAmount: 10,
    discountRate: '',
    applyScene: '全部',
    validStart: '2026-05-01',
    validEnd: '2026-05-31',
    status: '已过期',
    receivedAt: '2026-05-01 10:00'
  }
]

const pointRules = [
  '荔枝商品金额 1元 = 1积分。',
  '快递费、礼盒费不计积分。',
  '订单完成后积分到账。',
  '退款或取消订单后扣回对应积分。',
  '100积分 = 1元，每单最多抵扣商品金额的5%。',
  '积分有效期12个月。',
  '积分不能提现，不能兑换现金。',
  '首次订阅开售提醒 +20积分。',
  '有效评价/反馈可由管理员手动加20积分。',
  '积分兑换当前只用于优惠券，不做实物兑换、充值、签到或分享裂变。'
]

const pointRecords = [
  { id: 'p1', title: '下单获得积分', time: '2026-05-20 14:30', points: 68, value: '+68', reason: '订单完成后按商品金额入账', type: 'order_complete', expiresAt: '2027-05-20' },
  { id: 'p2', title: '评价/反馈获得积分', time: '2026-05-21 10:12', points: 20, value: '+20', reason: '管理员手动奖励有效反馈', type: 'manual_add', expiresAt: '2027-05-21' },
  { id: 'p3', title: '积分兑换优惠券', time: '2026-05-22 09:45', points: -100, value: '-100', reason: '积分兑换优惠券', type: 'coupon_exchange', expiresAt: '' }
]

const addressList = []

const riskItems = [
  '荔枝是季节性鲜果，成熟时间会受天气、雨水和温度影响。',
  '采摘、分拣、下山、同城快送和顺丰揽收都可能因天气顺延。',
  '鲜果运输可能出现少量自然损耗，提交订单前请先了解配送风险。',
  '自提时间和地点需由客服确认。',
  '果品价格不含运费，同城快送和顺丰快递费用由买家承担。'
]

const helpSections = [
  { id: 'h1', title: '配送说明', desc: '附近送、同城快送、顺丰快递和自提说明。', items: deliveryNotice },
  { id: 'h2', title: '购买须知', desc: '荔枝成熟时间、价格和库存由客服按实际情况确认。', items: ['当前为本地模拟下单，不接微信支付。', '果品价格不含快递费。', '提交后客服会确认库存、采摘时间和最终费用。'] },
  { id: 'h3', title: '鲜果售后说明', desc: '鲜果运输存在自然损耗，签收后请及时检查。', items: riskItems },
  { id: 'h4', title: '运输损耗说明', desc: '压果、裂果和少量坏果属于鲜果运输风险。', items: ['快递配送受温度、时效和包装挤压影响。', '建议优先选择附近送、自提或同城快送。', '明显异常请保留照片并联系客服。'] },
  { id: 'h5', title: '采摘延迟说明', desc: '成熟期受天气、雨水和温度影响。', items: ['荔枝成熟时间以果园实际通知为准。', '雨天、台风或采摘条件不佳时可能顺延。', '客服会按登记顺序沟通确认。'] }
]

const products = [
  {
    id: 'guiwei',
    name: '桂味荔枝',
    status: '预计2027年开放预约',
    season: '预计6月底至7月中旬',
    description: '桂味为后续重点展示品种，具体上市时间以当年果园成熟度为准。',
    features: ['自家果园', '自家采摘', '成熟后现摘现发'],
    delivery: deliveryOptions
  },
  {
    id: 'nuomici',
    name: '糯米糍荔枝',
    status: '预计2027年开放预约',
    season: '预计6月底至7月中旬',
    description: '糯米糍后续按果量开放，实际供应以果园成熟批次为准。',
    features: ['自家果园', '自家采摘', '成熟后现摘现发'],
    delivery: deliveryOptions
  }
]

const updates = [
  {
    id: 'u2026-01',
    date: '2026年',
    title: '今年是小年，暂无荔枝销售',
    content: '2026年果量有限，暂不做正式销售。'
  },
  {
    id: 'u2027-01',
    date: '预计2027年6月底',
    title: '关注成熟和开售通知',
    content: '成熟时间会受天气、雨水和温度影响，届时会按果园实际情况通知已登记客户。'
  }
]

module.exports = {
  salesStatuses,
  orchard,
  products,
  updates,
  varietyOptions,
  specOptions,
  skuOptions,
  yesNoOptions,
  identityOptions,
  areaOptions,
  purposeOptions,
  deliveryOptions,
  freightAckOptions,
  giftBoxOptions,
  pickupConfirmOptions,
  pickupTimeSlots,
  expressMethods,
  nearbyAreaOptions,
  supportedNearbyAreas,
  freightPayerOptions,
  shipStatusOptions,
  shippingFeeStatusOptions,
  adminPassword,
  orderStatuses,
  currentOrderStatuses,
  historyOrderStatuses,
  priceFields,
  shippingFeeFields,
  defaultPrices,
  defaultShippingFees,
  defaultExpressDeliveryConfig,
  defaultNearbyDeliveryConfig,
  reminderStages,
  defaultSaleReminderConfig,
  defaultAfterSaleConfig,
  defaultSkuStatusMap,
  orchardLocation,
  defaultConfig,
  deliveryNotice,
  courierWeightRules,
  courierFeeNotice,
  freightNotice,
  nearbyDeliveryScope,
  freightRequiredDelivery,
  branchNotice,
  giftNotice,
  unsupportedNearbyNotice,
  weightNotice,
  contactService,
  memberMock,
  coupons,
  couponTypes,
  couponApplyScenes,
  couponStatuses,
  adminCoupons,
  userCoupons,
  pointRules,
  pointRecords,
  addressList,
  helpSections,
  riskItems
}
