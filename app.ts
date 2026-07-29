import type { IAppOption } from './typings/index.d';
import { getCurrentBookId } from './utils/storage';
import { STORAGE_KEYS } from './constants/config';
import { reLogin } from './utils/request';

App<IAppOption>({
  onLaunch(options: WechatMiniprogram.App.LaunchShowOption): void {
    // 获取系统信息（使用新版 API 替代已废弃的 wx.getSystemInfoSync）
    const systemInfo = {
      ...wx.getWindowInfo(),
      ...wx.getDeviceInfo(),
      ...wx.getAppBaseInfo(),
    } as WechatMiniprogram.SystemInfo;
    this.globalData.systemInfo = systemInfo;
    this.globalData.statusBarHeight = systemInfo.statusBarHeight;

    // 恢复当前词书选择
    this.globalData.currentWordBookId = getCurrentBookId();

    // 解析小程序码 scene、分享卡片 inviter 参数（一次性的，reLogin 读取后清除）
    this.captureLaunchParams(options);

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

  onShow(options: WechatMiniprogram.App.LaunchShowOption): void {
    // 小程序切前台时检查 token 是否过期/无效，过期则重新登录
    const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
    if (!token) {
      this.globalData.loginPromise = this.doLogin();
    }
    // 切前台时也可能有新的 scene 参数（从小程序码进来）
    this.captureLaunchParams(options);
  },

  onHide(): void {
    // 小程序切后台
  },

  /**
   * 捕获启动参数中的 scene 和 inviter，存入 globalData 供 reLogin 使用。
   * scene 来自小程序码扫码，inviter 来自分享卡片 path 参数。
   * 如果上一轮 scene 已被 reLogin 消费，不再覆盖（防止 stale scene 残留）。
   */
  captureLaunchParams(options: WechatMiniprogram.App.LaunchShowOption): void {
    if (this.globalData.launchSceneConsumed) {
      return;
    }
    const scene = decodeURIComponent(options.query?.scene || '');
    if (scene) {
      this.globalData.launchScene = scene;
      console.log('[App] 捕获 scene:', scene);
    }
    const inviter = options.query?.inviter;
    if (inviter) {
      this.globalData.launchQuery = { inviter };
      console.log('[App] 捕获 inviter:', inviter);
    }
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
    launchScene: undefined,
    launchQuery: undefined,
    launchSceneConsumed: false,
  },
});
