/** 小程序自定义类型声明 */
declare namespace WechatMiniprogram {
  interface SystemInfo {
    /** 设备品牌 */
    brand: string
    /** 设备型号 */
    model: string
    /** 设备像素比 */
    pixelRatio: number
    /** 屏幕宽度（px） */
    screenWidth: number
    /** 屏幕高度（px） */
    screenHeight: number
    /** 窗口宽度（px） */
    windowWidth: number
    /** 窗口高度（px） */
    windowHeight: number
    /** 状态栏高度（px） */
    statusBarHeight: number
    /** 语言 */
    language: string
    /** 微信版本号 */
    version: string
    /** 操作系统及版本 */
    system: string
    /** 客户端平台 */
    platform: string
    /** 用户字体大小（单位 px） */
    fontSizeSetting: number
    /** 客户端基础库版本 */
    SDKVersion: string
    /** 设备性能等级 */
    benchmarkLevel: number
    /** 设备方向 */
    deviceOrientation: 'portrait' | 'landscape'
    /** 安全区域 */
    safeArea: {
      left: number
      right: number
      top: number
      bottom: number
      width: number
      height: number
    }
  }

  interface UserInfo {
    nickName: string
    avatarUrl: string
    gender: number
    country: string
    province: string
    city: string
    language: string
  }

  interface OnUnhandledRejectionCallbackResult {
    reason: string | Error
    promise: Promise<unknown>
  }
}
