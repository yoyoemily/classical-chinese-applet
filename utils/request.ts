import type { IApiResponse } from '../typings/index';

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

/** 基础请求 URL，发布前替换为正式后端地址 */
const BASE_URL: string = 'http://localhost:8080';

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

/**
 * 统一请求封装
 * @template T - 响应 data 的类型
 * @param options - 请求配置
 * @returns Promise<T>
 */
export function request<T = unknown>(options: IRequestOptions): Promise<T> {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    header: {
      ...DEFAULT_OPTIONS.header,
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

  // 过滤掉 data 中值为 undefined 的字段，避免 GET 请求拼出 ?key=undefined
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
            // 业务异常
            const errMsg: string = resData.message || '请求失败';
            wx.showToast({
              title: errMsg,
              icon: 'none',
              duration: 2000,
            });
            reject(new Error(errMsg));
          }
        } else {
          // HTTP 状态码异常
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
        // 网络异常
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
