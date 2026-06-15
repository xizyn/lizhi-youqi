# 荔枝有期

“荔枝有期”是一个使用微信小程序原生技术开发的深圳本地自家果园荔枝预约、下单和管理项目。

当前版本定位为**本地存储测试版**：用户端、订单、售后、优惠券、积分、开售提醒和管理后台均使用 `mockData` 与微信本地缓存运行，尚未接入微信支付、云开发、真实后端或顺丰接口。

## 当前工作目录

```text
C:\Users\ZhuanZ\WeChatProjects\lizhi-youqi-test\lizhi-youqi
```

后续在微信开发者工具中导入、编译和调试时，请选择该目录。

## 技术栈

- 微信小程序原生开发
- JavaScript
- WXML
- WXSS
- JSON
- `wx.setStorageSync` / `wx.getStorageSync`
- `wx.getFileSystemManager`
- `wx.shareFileMessage`
- `wx.requestSubscribeMessage`

项目未使用 TypeScript、Vue、React、npm 前端框架或大型 Excel 库。

## 当前业务定位

- 深圳本地自家果园，自家种植和采摘
- 主要品种：桂味、糯米糍
- 当前为 2027 年开售预约版本
- 支持到园自提、附近送和顺丰快递
- 不在小程序内完成在线支付
- 提交订单后进入“待付款”，由客服确认库存、价格、运费和交付时间

## 已实现功能

### 用户端

- 首页品牌展示和业务入口
- 自提下单
  - 桂味、糯米糍单品或混装
  - 支持自由填写斤数，允许一位小数
  - 支持礼盒数量和预计金额计算
- 附近送下单
  - 支持珠光村、新屋村、九祥岭、深圳职业技术大学附近区域
  - 支持自由填写斤数、礼盒、地址和配送费计算
- 顺丰快递下单
  - 固定 5 斤装、10 斤装 SKU
  - 展示参考运费区间
  - 快递不支持礼盒
- 确认订单
  - 优惠券选择
  - 积分抵扣
  - 费用实时计算
- 我的订单
  - 全部、待付款、待处理、已送出、历史订单、售后单
  - 查看详情、取消订单、联系客服、查看物流、申请售后
- 售后服务
  - 提交售后申请
  - 上传和预览凭证图片
  - 查看处理进度
  - 补充文字和图片记录
- 开售提醒
  - 选择提醒品种
  - 本地保存预约状态
  - 兼容订阅消息授权结果
- 我的优惠券
- 我的积分
- 常用地址
- 自提地点与三级地图指引
- 联系客服
- 帮助与须知
- 风险告知

### 管理后台

- 后台首页和今日概览
- 当前订单管理
- 历史订单查询
- 修改订单状态
- 自提订单确认
- 附近送订单标记送出
- 快递订单填写顺丰单号和标记发货
- 售后订单处理
- 商品工作台
  - 商品价格设置
  - 上架/下架
  - 售罄状态
  - 商品异常提醒
  - 本地操作记录
- 配送设置
  - 自提地址和自提时段
  - 附近送范围和配送费
  - 快递参考运费和说明
- 开售提醒管理
- 积分规则和手动调整
- 优惠券管理
- 售后管理
- 订单报表
  - 日期筛选
  - 订单、采摘和配送汇总
  - 小程序内报表预览
  - CSV 文件生成和分享
  - 报表摘要图片

## 页面清单

有效页面以 [`app.json`](./app.json) 中的 `pages` 配置为准。

| 页面路径 | 功能 |
| --- | --- |
| `pages/index/index` | 首页 |
| `pages/orders/orders` | 我的订单 |
| `pages/order-detail/order-detail` | 订单详情 |
| `pages/confirm-order/confirm-order` | 确认订单 |
| `pages/profile/profile` | 我的 |
| `pages/picking/picking` | 自提下单 |
| `pages/pickup-location/pickup-location` | 果园位置与导航 |
| `pages/express/express` | 快递商品选择 |
| `pages/mail-express/mail-express` | 快递订单填写 |
| `pages/nearby-delivery/nearby-delivery` | 附近送下单 |
| `pages/orchard-visit/orchard-visit` | 果园参观暂停说明 |
| `pages/reminder/reminder` | 开售提醒 |
| `pages/contact/contact` | 联系客服 |
| `pages/risk/risk` | 风险告知 |
| `pages/help/help` | 帮助与须知 |
| `pages/address/address` | 常用地址 |
| `pages/coupons/coupons` | 我的优惠券 |
| `pages/points/points` | 我的积分 |
| `pages/after-sales/after-sales` | 售后服务 |
| `pages/after-sale-apply/after-sale-apply` | 申请售后 |
| `pages/after-sale-detail/after-sale-detail` | 售后进度 |
| `pages/after-sale-rules/after-sale-rules` | 售后规则 |
| `pages/admin/admin` | 管理后台 |
| `pages/admin-coupons/admin-coupons` | 优惠券管理 |
| `pages/admin-reports/admin-reports` | 订单报表/导出 |
| `pages/report-preview/report-preview` | 报表预览 |
| `pages/admin-after-sales/admin-after-sales` | 售后管理 |

`pages` 目录中还保留了少量未注册的旧页面目录。这些目录不属于当前有效路由，判断页面是否启用时请以 `app.json` 为准。

## 目录结构

```text
lizhi-youqi/
├─ assets/                 图片、商品图、地图图和 tabBar 图标
├─ custom-tab-bar/         旧自定义 tabBar，当前 app.json 使用原生 tabBar
├─ pages/                  小程序页面
├─ utils/
│  ├─ mockData.js          默认商品、价格、配送、管理员和开售配置
│  ├─ storage.js           本地配置、订单、地址、优惠券、积分和售后存储
│  ├─ orderPage.js         下单页共用逻辑
│  ├─ afterSaleService.js  售后申请与状态处理
│  ├─ afterSaleLogService.js 售后沟通记录
│  ├─ reportGenerator.js   报表统计、CSV 和工作簿数据生成
│  └─ reportImageGenerator.js 报表摘要图片生成
├─ app.js                  小程序启动入口
├─ app.json                页面、窗口和 tabBar 配置
├─ app.wxss                全局样式
├─ project.config.json     微信开发者工具项目配置
└─ sitemap.json            索引配置
```

## 在微信开发者工具中运行

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：

   ```text
   C:\Users\ZhuanZ\WeChatProjects\lizhi-youqi-test\lizhi-youqi
   ```

4. 使用项目现有 AppID，或在本地调试时按开发者工具要求配置测试 AppID。
5. 项目类型选择“微信小程序”。
6. 点击“编译”。
7. 首次调试如遇旧缓存数据结构问题，可在开发者工具中清除 Storage 后重新编译。

项目启动时会通过 `utils/storage.js` 初始化本地 mock 数据。

## 本地数据与缓存

当前业务数据保存在微信小程序本地 Storage 中，主要 key 包括：

```text
lizhi_youqi_config_v3
lizhi_youqi_orders_v3
lizhi_youqi_admin_coupons_v1
lizhi_youqi_user_coupons_v1
lizhi_youqi_point_records_v1
lizhi_youqi_sale_reminders_v1
lizhi_youqi_after_sales_v1
lizhi_youqi_addresses_v1
lizhi_youqi_admin_authed
```

这意味着：

- 数据只在当前微信或开发者工具环境中可见
- 不同手机之间不会同步
- 用户手机提交的订单不会自动出现在管理员的另一台手机上
- 清除缓存或卸载小程序会丢失本地演示数据
- 本地缓存不能作为正式生产数据库

## 管理员测试模式

管理员入口位于“我的”页面，并由 [`utils/mockData.js`](./utils/mockData.js) 中的管理员配置控制。

当前默认：

```js
isAdminMock: false
adminAuthMode: 'mock'
```

本地测试管理员模式时：

1. 将 `isAdminMock` 临时设置为 `true`。
2. 重新编译小程序。
3. 进入“我的”页面。
4. 点击“管理后台”。
5. 使用 `mockData.js` 中配置的本地测试密码。

注意：

- 该方式只用于开发调试
- 管理员密码、开关和权限判断都在客户端
- 正式上线不能依赖 `isAdminMock`
- 正式版应由服务端获取 OpenID，并通过管理员 OpenID 白名单校验权限
- 所有后台写操作还应在云函数或后端再次鉴权

## 配置位置

默认业务配置主要位于：

```text
utils/mockData.js
```

包括：

- 商品 SKU 和图片
- 自提、附近送单价
- 快递商品价格
- 礼盒费用
- 快递参考运费
- 附近送区域
- 自提地址和时间
- 客服微信
- 管理员测试配置
- 开售提醒配置
- 售后规则

运行后，部分配置会复制到本地 Storage。后台修改的是当前设备中的本地配置，不会修改 `mockData.js` 源文件。

如需恢复默认配置，可清除小程序 Storage 后重新进入。

## 图片资源

主要图片目录：

```text
assets/images/
assets/images/products/
assets/images/maps/
assets/tabbar/
```

首页 Banner：

```text
assets/images/banner-lychee.png
```

替换图片时应：

- 保持代码引用路径不变，或同步修改页面路径
- 尽量将单张图片控制在 200KB 以内
- Banner 建议控制在 200KB 左右
- 商品图建议控制在 100KB 至 150KB
- 不要将 UI 参考图、截图、PPT 或 Word 图片放入项目包

## 报表与文件导出

当前报表支持：

- 小程序内查看订单汇总和订单明细
- 复制 TSV 内容到 Excel/WPS
- 生成 CSV 文件
- 分享 CSV 文件
- 生成报表摘要图片

CSV 文件写入：

```js
wx.env.USER_DATA_PATH
```

项目当前没有集成完整的 XLSX 库。页面请求 Excel 导出时，如果 XLSX 能力不可用，会降级为 CSV，避免白屏或导出失败。

文件分享相关能力建议使用真机测试，微信开发者工具不一定完整支持 `wx.shareFileMessage`。

## 开售提醒说明

当前开售提醒属于本地演示模式：

- 用户可以选择提醒品种
- 可以保存预约状态
- 可以调用订阅消息授权窗口
- 未配置模板 ID 时会进行容错提示

当前不能实现：

- 跨设备统计真实预约人数
- 管理员统一查询全部预约用户
- 后台主动发送开售通知
- 可靠记录订阅消息发送结果

正式上线需增加云数据库或后端，并由云函数安全调用订阅消息接口。不得将 `access_token` 写入小程序前端。

## 售后说明

当前售后模块支持同一设备上的完整演示流程：

```text
选择订单 → 提交问题和凭证 → 管理员处理 → 用户查看结果
```

售后记录独立于订单主状态保存，订单中只保存售后标记和售后编号。

当前限制：

- 图片保存在本地用户目录，不是云存储
- 用户和管理员必须在同一设备或同一开发者工具缓存环境
- 退款只记录线下处理结果，不会调用微信退款
- 补发不会自动操作真实库存

## 当前订单状态

项目兼容中文状态和部分英文旧状态，主要业务状态包括：

- 待付款
- 已支付
- 待采摘
- 待打包
- 待发货/待自提
- 已送出
- 已完成
- 已取消
- 售后处理中
- 售后已处理

新增或修改状态时，需要同步检查：

- 用户订单页
- 订单详情页
- 管理后台
- 报表统计
- 用户中心订单数量
- 售后资格判断

## 代码质量配置

当前 `project.config.json` 已开启：

- JS 压缩
- WXML 压缩
- WXSS 压缩

`app.json` 已开启：

```json
"lazyCodeLoading": "requiredComponents"
```

当前全部注册页面仍在主包中。功能和页面继续增加后，应考虑将后台、售后和报表页面拆分为分包。

## 当前版本限制

以下能力尚未正式接入：

- 真实用户登录
- OpenID 用户绑定
- 云数据库
- 多设备订单同步
- 服务端管理员权限
- 微信支付
- 微信退款
- 顺丰接口
- 云存储
- 真实库存流水
- 后台自动消息推送
- 正式 Excel 多 Sheet 文件生成

因此当前版本适合：

- 页面和交互测试
- 业务流程演示
- 本地订单数据测试
- 管理后台 UI 测试
- 报表和售后流程验证

不适合直接作为正式线上经营系统使用。

## 正式上线前建议

1. 接入云开发或独立后端。
2. 订单绑定用户 OpenID。
3. 普通用户只能读取自己的订单。
4. 管理员通过服务端 OpenID 白名单鉴权。
5. 将订单、售后、积分、优惠券、提醒和地址迁移到共享数据库。
6. 将售后图片和商品图片迁移到云存储或 CDN。
7. 建立真实库存数量、入库、出库和库存流水。
8. 统一订单状态枚举和状态转换规则。
9. 完成支付、退款和财务对账设计后再接微信支付。
10. 使用真机验证文件分享、订阅消息、地图导航和图片保存能力。

## 开发注意事项

- 有效页面以 `app.json` 为准。
- 不要在未确认用途前删除旧页面或缓存兼容逻辑。
- 修改商品价格时，同时检查 SKU 默认价格和本地配置价格。
- 修改订单结构时，应为旧缓存数据提供默认值。
- 不要在前端保存生产环境密钥、`access_token` 或服务端管理员凭证。
- 提交重要修改前建议先创建 Git 提交，避免当前开发成果丢失。
