import type { IAppOption } from './typings/index.d';
import { getCurrentBookId } from './utils/storage';

App<IAppOption>({
  onLaunch(): void {
    // 获取系统信息
    const systemInfo: WechatMiniprogram.SystemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;

    // 恢复当前词书选择
    this.globalData.currentWordBookId = getCurrentBookId();

    // 注册全局错误监听
    wx.onError((error: string): void => {
      console.error('[App onError]', error);
    });

    wx.onUnhandledRejection((res: WechatMiniprogram.OnUnhandledRejectionCallbackResult): void => {
      console.error('[App onUnhandledRejection]', res.reason);
    });
  },

  onShow(): void {
    // 小程序切前台
  },

  onHide(): void {
    // 小程序切后台
  },

  globalData: {
    systemInfo: {} as WechatMiniprogram.SystemInfo,
    statusBarHeight: 0,
    userInfo: undefined,
    currentWordBookId: undefined,
    todayTask: undefined,
  },
});
