function safeText(value, fallback) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return typeof fallback === 'undefined' ? '' : String(fallback)
  }
  return String(value)
}

function findCardValue(cards, key, fallback) {
  const list = Array.isArray(cards) ? cards : []
  const card = list.find(function (item) {
    return item && item.key === key
  })
  return safeText(card && card.value, fallback)
}

function buildReportImageData(payload) {
  const source = payload || {}
  const cards = Array.isArray(source.summaryCards) ? source.summaryCards : []
  const orders = Array.isArray(source.orderCards) ? source.orderCards : []
  const visibleOrders = orders.slice(0, 4).map(function (order) {
    return {
      orderNo: safeText(order.orderNo, '未生成'),
      customerName: safeText(order.customerName, '未填写'),
      deliveryMethod: safeText(order.deliveryMethod, '客服确认'),
      productDetail: safeText(order.productDetail, '未填写'),
      amount: safeText(order.amount, '0'),
      status: safeText(order.status, '已提交')
    }
  })

  return {
    title: safeText(source.title, '荔枝有期报表摘要'),
    rangeLabel: safeText(source.rangeLabel, '今日'),
    generatedAt: safeText(source.generatedAt, ''),
    metrics: [
      { label: '订单数', value: findCardValue(cards, 'orderCount', '0') },
      { label: '桂味', value: findCardValue(cards, 'guiweiWeight', '0斤') },
      { label: '糯米糍', value: findCardValue(cards, 'nuomiciWeight', '0斤') },
      { label: '总斤数', value: findCardValue(cards, 'totalWeight', '0斤') },
      { label: '快递', value: findCardValue(cards, 'expressCount', '0') + '单' },
      { label: '自提', value: findCardValue(cards, 'pickupCount', '0') + '单' },
      { label: '附近送', value: findCardValue(cards, 'nearbyCount', '0') + '单' },
      { label: '金额', value: findCardValue(cards, 'totalAmount', '0元') }
    ],
    orders: visibleOrders,
    totalOrderCount: orders.length,
    hiddenOrderCount: Math.max(0, orders.length - visibleOrders.length)
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + safeRadius, y)
  ctx.lineTo(x + width - safeRadius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  ctx.lineTo(x + width, y + height - safeRadius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  ctx.lineTo(x + safeRadius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  ctx.lineTo(x, y + safeRadius)
  ctx.quadraticCurveTo(x, y, x + safeRadius, y)
  ctx.closePath()
}

function fillRoundedRect(ctx, x, y, width, height, radius, color) {
  roundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = color
  ctx.fill()
}

function trimText(ctx, text, maxWidth) {
  const source = safeText(text)
  if (ctx.measureText(source).width <= maxWidth) {
    return source
  }
  let result = source
  while (result.length && ctx.measureText(result + '…').width > maxWidth) {
    result = result.slice(0, -1)
  }
  return result + '…'
}

function drawMetric(ctx, item, x, y, width, height) {
  fillRoundedRect(ctx, x, y, width, height, 8, '#ffffff')
  ctx.fillStyle = '#697465'
  ctx.font = '11px sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText(item.label, x + 12, y + 10)
  ctx.fillStyle = item.label === '金额' ? '#ad493f' : '#2f7339'
  ctx.font = 'bold 18px sans-serif'
  ctx.fillText(trimText(ctx, item.value, width - 24), x + 12, y + 29)
}

function drawOrderRow(ctx, order, x, y, width, height) {
  ctx.fillStyle = '#eef3ea'
  ctx.fillRect(x, y + height - 1, width, 1)

  ctx.fillStyle = '#263426'
  ctx.font = 'bold 11px sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText(trimText(ctx, order.orderNo, width * 0.46), x, y + 6)

  ctx.fillStyle = '#677164'
  ctx.font = '10px sans-serif'
  ctx.fillText(
    trimText(ctx, order.customerName + ' · ' + order.deliveryMethod, width * 0.46),
    x,
    y + 23
  )

  ctx.fillStyle = '#374537'
  ctx.font = '10px sans-serif'
  ctx.fillText(
    trimText(ctx, order.productDetail, width * 0.36),
    x + width * 0.49,
    y + 6
  )

  ctx.fillStyle = '#ad493f'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('¥' + order.amount, x + width, y + 23)
  ctx.textAlign = 'left'
}

function drawReport(ctx, width, height, data) {
  const margin = 16
  const contentWidth = width - margin * 2

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#f7f3e9'
  ctx.fillRect(0, 0, width, height)

  fillRoundedRect(ctx, margin, 16, contentWidth, 92, 14, '#e9f3e4')
  ctx.fillStyle = '#245329'
  ctx.font = 'bold 24px serif'
  ctx.textBaseline = 'top'
  ctx.fillText(data.title, margin + 18, 34)
  ctx.fillStyle = '#647461'
  ctx.font = '12px sans-serif'
  ctx.fillText(data.rangeLabel + ' · 生成于 ' + data.generatedAt, margin + 18, 72)

  const metricGap = 8
  const metricWidth = (contentWidth - metricGap) / 2
  const metricHeight = 52
  const metricStartY = 120
  data.metrics.forEach(function (item, index) {
    const column = index % 2
    const row = Math.floor(index / 2)
    drawMetric(
      ctx,
      item,
      margin + column * (metricWidth + metricGap),
      metricStartY + row * (metricHeight + metricGap),
      metricWidth,
      metricHeight
    )
  })

  const ordersY = metricStartY + 4 * (metricHeight + metricGap) + 8
  fillRoundedRect(ctx, margin, ordersY, contentWidth, height - ordersY - 34, 14, '#ffffff')
  ctx.fillStyle = '#253425'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillText('订单摘要', margin + 14, ordersY + 14)
  ctx.fillStyle = '#7a8377'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('共 ' + data.totalOrderCount + ' 单', margin + contentWidth - 14, ordersY + 18)
  ctx.textAlign = 'left'

  if (!data.orders.length) {
    ctx.fillStyle = '#8a9286'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('当前统计范围暂无订单', width / 2, ordersY + 74)
    ctx.textAlign = 'left'
  } else {
    const rowStart = ordersY + 42
    const rowHeight = 42
    data.orders.forEach(function (order, index) {
      drawOrderRow(ctx, order, margin + 14, rowStart + index * rowHeight, contentWidth - 28, rowHeight)
    })
  }

  ctx.fillStyle = '#7d8679'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  const footer = data.hiddenOrderCount > 0
    ? '仅展示前4笔，另有' + data.hiddenOrderCount + '笔，请在小程序内查看完整明细'
    : '完整明细可在小程序内查看，Excel 对账可使用 CSV'
  ctx.fillText(footer, width / 2, height - 20)
  ctx.textAlign = 'left'
}

function generateReportImage(canvas, width, height, data, pixelRatio) {
  return new Promise(function (resolve, reject) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      reject(new Error('报表画布不可用'))
      return
    }

    const ratio = Math.max(1, Math.min(Number(pixelRatio) || 2, 2))
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    drawReport(ctx, width, height, data)

    const exportImage = function () {
      wx.canvasToTempFilePath({
        canvas: canvas,
        fileType: 'png',
        quality: 1,
        destWidth: canvas.width,
        destHeight: canvas.height,
        success: function (result) {
          resolve(result.tempFilePath)
        },
        fail: reject
      })
    }

    if (typeof canvas.requestAnimationFrame === 'function') {
      canvas.requestAnimationFrame(exportImage)
    } else {
      setTimeout(exportImage, 16)
    }
  })
}

module.exports = {
  buildReportImageData,
  generateReportImage
}
