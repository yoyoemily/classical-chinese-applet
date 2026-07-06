import type { IAppOption } from './typings/index.d';
import { getCurrentBookId } from './utils/storage';
import { STORAGE_KEYS } from './constants/config';
import { reLogin } from './utils/request';

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

    // 启动登录（异步，不阻塞页面渲染）
    this.globalData.loginPromise = this.doLogin();
  },

  onShow(): void {
    // 小程序切前台时检查 token 是否过期，过期则重新登录
    const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
    if (!token) {
      this.globalData.loginPromise = this.doLogin();
    }
  },

  onHide(): void {
    // 小程序切后台
  },

  /**
   * 执行微信登录流程（复用 request.ts 的 reLogin，内置防并发）
   */
  async doLogin(): Promise<void> {
    try {
      const token = await reLogin();
      if (token) {
        console.log('[App] 登录成功');
      }
    } catch (err) {
      console.error('[App] 登录异常:', err);
    }
  },

  globalData: {
    systemInfo: {} as WechatMiniprogram.SystemInfo,
    statusBarHeight: 0,
    userInfo: undefined,
    currentWordBookId: undefined,
    todayTask: undefined,
    loginPromise: undefined as Promise<void> | undefined,
  },
});
