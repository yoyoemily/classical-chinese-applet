import type { IApiResponse } from '../typings/index';
import { STORAGE_KEYS } from '../constants/config';

/** 请求配置项 */
interface IRequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, unknown>;
  header?: Record<string, string>;
  showLoading?: boolean;
  timeout?: number;
}

/** 请求默认配置 */
const DEFAULT_OPTIONS: Required<Pick<IRequestOptions, 'method' | 'showLoading' | 'timeout' | 'header'>> = {
  method: 'GET',
  showLoading: true,
  timeout: 30000,
  header: {
    'content-type': 'application/json',
  },
};

/** 基础请求 URL，开发/体验版走本地，正式版走线上 */
function getBaseUrl(): string {
  try {
    const { envVersion } = wx.getAccountInfoSync().miniProgram;
    return envVersion === 'release'
      ? 'https://wyq.yinque-ai.com'
      : 'http://localhost:8080';
  } catch {
    return 'http://localhost:8080';
  }
}

const BASE_URL: string = getBaseUrl();

/** 是否正在刷新 token（防止并发请求触发多次登录） */
let isLoggingIn = false;
let loginPromise: Promise<void> | null = null;

/**
 * 显示 loading
 */
function showLoading(): void {
  wx.showLoading({
    title: '加载中...',
    mask: true,
  });
}

/**
 * 隐藏 loading
 */
function hideLoading(): void {
  wx.hideLoading();
}

/** 获取存储的 token */
function getToken(): string {
  return wx.getStorageSync(STORAGE_KEYS.TOKEN) || '';
}

/**
 * 重新执行微信登录，返回新的 token（内置防并发）
 */
export function reLogin(): Promise<string> {
  if (!isLoggingIn) {
    isLoggingIn = true;
    loginPromise = new Promise<string>((resolve, reject) => {
      wx.login({
        success: (loginRes) => {
          wx.request({
            url: `${BASE_URL}/api/auth/login`,
            method: 'POST',
            header: { 'content-type': 'application/json' },
            data: { code: loginRes.code },
            success: (resp) => {
              const body = resp.data as { code: number; data?: { token: string } };
              if (resp.statusCode === 200 && body.code === 0 && body.data?.token) {
                wx.setStorageSync(STORAGE_KEYS.TOKEN, body.data.token);
                resolve(body.data.token);
              } else {
                reject(new Error(body.message || '登录失败'));
              }
            },
            fail: reject,
          });
        },
        fail: reject,
      });
    }).finally(() => {
      isLoggingIn = false;
      loginPromise = null;
    });
  }
  return loginPromise!;
}

/**
 * 获取有效 token（无则自动登录）
 */
async function ensureToken(): Promise<string> {
  const token = getToken();
  if (token) return token;
  return reLogin().then(() => getToken());
}

/**
 * 统一请求封装
 * @template T - 响应 data 的类型
 * @param options - 请求配置
 * @returns Promise<T>
 */
export function request<T = unknown>(options: IRequestOptions): Promise<T> {
  // 登录接口不需要 token
  const isAuthRequest = options.url.includes('/api/auth/');

  const doRequest = (): Promise<T> => {
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      header: {
        ...DEFAULT_OPTIONS.header,
        ...(isAuthRequest ? {} : { Authorization: `Bearer ${getToken()}` }),
        ...options.header,
      },
    };

    // 拼接完整 URL
    const fullUrl: string = mergedOptions.url.startsWith('http')
      ? mergedOptions.url
      : `${BASE_URL}${mergedOptions.url}`;

    // 显示 loading
    if (mergedOptions.showLoading) {
      showLoading();
    }

    // 过滤掉 data 中值为 undefined 的字段
    const cleanData = mergedOptions.data
      ? Object.fromEntries(
          Object.entries(mergedOptions.data).filter(([, v]) => v !== undefined)
        )
      : undefined;

    return new Promise<T>((resolve, reject) => {
      wx.request({
        url: fullUrl,
        method: mergedOptions.method,
        data: cleanData,
        header: mergedOptions.header,
        timeout: mergedOptions.timeout,
        success(
          res: WechatMiniprogram.RequestSuccessCallbackResult<IApiResponse<T>>
        ): void {
          const { statusCode, data: resData } = res;

          if (statusCode === 200) {
            if (resData.code === 0) {
              resolve(resData.data);
            } else {
              const errMsg: string = resData.message || '请求失败';
              wx.showToast({
                title: errMsg,
                icon: 'none',
                duration: 2000,
              });
              reject(new Error(errMsg));
            }
          } else if (statusCode === 401 && !isAuthRequest) {
            // token 过期，重新登录后重试
            console.log('[Request] token 过期，重新登录...');
            reLogin()
              .then(() => {
                // 更新 header 中的 token 后重试
                mergedOptions.header = {
                  ...mergedOptions.header,
                  Authorization: `Bearer ${getToken()}`,
                };
                wx.request({
                  url: fullUrl,
                  method: mergedOptions.method,
                  data: cleanData,
                  header: mergedOptions.header,
                  timeout: mergedOptions.timeout,
                  success(retryRes) {
                    const retryData = retryRes.data as IApiResponse<T>;
                    if (retryRes.statusCode === 200 && retryData.code === 0) {
                      resolve(retryData.data);
                    } else {
                      reject(new Error(retryData.message || '请求失败'));
                    }
                  },
                  fail: reject,
                  complete() {
                    if (mergedOptions.showLoading) hideLoading();
                  },
                });
              })
              .catch(reject);
          } else {
            const errMsg: string = `请求错误 ${statusCode}`;
            wx.showToast({
              title: errMsg,
              icon: 'none',
              duration: 2000,
            });
            reject(new Error(errMsg));
          }
        },
        fail(err: WechatMiniprogram.GeneralCallbackResult): void {
          const errMsg: string = err.errMsg || '网络连接失败，请检查网络';
          wx.showToast({
            title: errMsg,
            icon: 'none',
            duration: 2000,
          });
          reject(new Error(errMsg));
        },
        complete(): void {
          if (mergedOptions.showLoading) {
            hideLoading();
          }
        },
      });
    });
  };

  // 非登录接口先确保有 token
  if (!isAuthRequest) {
    return ensureToken().then(doRequest);
  }
  return doRequest();
}

/**
 * GET 请求
 */
export function get<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  options?: Partial<IRequestOptions>
): Promise<T> {
  return request<T>({ ...options, url, method: 'GET', data });
}

/**
 * POST 请求
 */
export function post<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  options?: Partial<IRequestOptions>
): Promise<T> {
  return request<T>({ ...options, url, method: 'POST', data });
}

/**
 * PUT 请求
 */
export function put<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  options?: Partial<IRequestOptions>
): Promise<T> {
  return request<T>({ ...options, url, method: 'PUT', data });
}

/**
 * DELETE 请求
 */
export function del<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
  options?: Partial<IRequestOptions>
): Promise<T> {
  return request<T>({ ...options, url, method: 'DELETE', data });
}
