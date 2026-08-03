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
    // 尝试捕获 scene（每次 onShow 都可能来自新的扫码进入）
    const hadScene = this.captureLaunchParams(options);

    // 小程序切前台时检查 token 是否过期/无效，过期则重新登录
    const token = wx.getStorageSync(STORAGE_KEYS.TOKEN);
    if (!token) {
      this.globalData.loginPromise = this.doLogin();
    } else if (hadScene) {
      // 有 token 但检测到新 scene → 重新登录以传递 scene 给后端绑定邀请关系
      console.log('[App] onShow 检测到新 scene，触发 reLogin 绑定邀请');
      this.globalData.loginPromise = this.doLogin();
    }
  },

  onHide(): void {
    // 小程序切后台
  },

  /**
   * 捕获启动参数中的 scene 和 inviter，存入 globalData 供 reLogin 使用。
   * scene 来自小程序码扫码，inviter 来自分享卡片 path 参数。
   *
   * 防重复：用 lastConsumedScene 记录全局已消费的 scene 值，
   * 同一次冷启动 onLaunch → reLogin → onShow 带着同一 scene，跳过。
   * 热启动扫码进入时 scene 值不同，允许重新捕获。
   *
   * @returns 是否捕获到新的 scene 或 inviter
   */
  captureLaunchParams(options: WechatMiniprogram.App.LaunchShowOption): boolean {
    const scene = decodeURIComponent(options.query?.scene || '');
    const inviter = options.query?.inviter;

    if (!scene && !inviter) {
      return false;
    }

    // 与上次已消费的 scene 相同 → 跳过（cold start onLaunch → onShow 重复）
    if (scene && scene === this.globalData.lastConsumedScene) {
      console.log('[App] scene 已被消费，跳过:', scene);
      return false;
    }

    if (scene) {
      this.globalData.launchScene = scene;
      console.log('[App] 捕获 scene:', scene);
    }
    if (inviter) {
      this.globalData.launchQuery = { inviter };
      console.log('[App] 捕获 inviter:', inviter);
    }
    return true;
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
    lastConsumedScene: undefined,
  },
});
