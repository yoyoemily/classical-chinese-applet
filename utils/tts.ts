// ============================================
// TTS 语音播报工具
// 优先使用句子预录音频(audioUrl)，无则走 TTS 合成
//
// 引擎切换：修改 TTS_ENGINE 常量即可
//   - 'api'     : HTTP TTS API，替换 TTS_API_URL 为真实地址后可用（当前默认）
//   - 'wechat'  : 微信同声传译插件（WechatSI），免费，需先在 app.json 配置插件并申请审核通过
// ============================================

const TTS_ENGINE: 'wechat' | 'api' = 'wechat';
const PLAYBACK_RATE = 0.95; // 播放速度，0.5~2.0，1.0 为正常速度
const TTS_API_URL = 'https://api.example.com/tts'; // TODO: 替换为真实 TTS API 地址

type AudioStatus = 'idle' | 'loading' | 'playing' | 'stopped';

interface TTSCallbacks {
  onStatusChange?: (status: AudioStatus) => void;
}

class TTSPlayer {
  private _ctx: WechatMiniprogram.InnerAudioContext | null = null;
  private _status: AudioStatus = 'idle';
  private _callbacks: TTSCallbacks = {};

  /** 播放句子音频 */
  async play(text: string, audioUrl?: string, callbacks?: TTSCallbacks): Promise<void> {
    this.stop();

    if (callbacks) this._callbacks = callbacks;

    // 优先使用预录音频
    if (audioUrl) {
      this._playUrl(audioUrl);
      return;
    }

    // 通过 TTS 合成
    if (TTS_ENGINE === 'wechat') {
      await this._playViaWechatSI(text);
    } else {
      await this._playViaAPI(text);
    }
  }

  /** 停止播放 */
  stop(): void {
    if (this._ctx) {
      this._ctx.stop();
      this._ctx.destroy();
      this._ctx = null;
    }
    this._setStatus('stopped');
  }

  /** 释放资源 */
  destroy(): void {
    this.stop();
    this._callbacks = {};
  }

  get status(): AudioStatus {
    return this._status;
  }

  // ============================================
  // 私有方法
  // ============================================

  private _setStatus(s: AudioStatus): void {
    this._status = s;
    this._callbacks.onStatusChange?.(s);
  }

  /** 直接播放音频 URL（预录音频 / TTS 合成返回的临时文件 / API 返回的音频地址） */
  private _playUrl(url: string): void {
    this._setStatus('loading');

    const ctx = wx.createInnerAudioContext();
    ctx.src = url;
    ctx.autoplay = true;
    ctx.obeyMuteSwitch = false;
    ctx.playbackRate = PLAYBACK_RATE;

    ctx.onCanplay(() => {
      this._setStatus('playing');
    });

    ctx.onPlay(() => {
      this._setStatus('playing');
    });

    ctx.onEnded(() => {
      this._setStatus('stopped');
      ctx.destroy();
      if (this._ctx === ctx) this._ctx = null;
    });

    ctx.onStop(() => {
      this._setStatus('stopped');
    });

    ctx.onError((err) => {
      console.warn('[TTS] audio play error:', err);
      this._setStatus('stopped');
      ctx.destroy();
      if (this._ctx === ctx) this._ctx = null;
    });

    this._ctx = ctx;
  }

  /** WechatSI 插件合成语音（需先在 app.json 配置插件并通过审核） */
  private async _playViaWechatSI(text: string): Promise<void> {
    this._setStatus('loading');

    let plugin: Record<string, unknown> | null = null;
    try {
      plugin = (requirePlugin as unknown as Function)('WechatSI') as Record<string, unknown>;
    } catch {
      this._setStatus('stopped');
      return;
    }

    if (!plugin?.textToSpeech) {
      this._setStatus('stopped');
      return;
    }

    try {
      const res = await new Promise<{ retcode: number; filename?: string }>((resolve, reject) => {
        (plugin!.textToSpeech as Function)({
          lang: 'zh_CN',
          tts: true,
          content: text,
          success: resolve,
          fail: reject,
        } as Record<string, unknown>);
      });

      if (res.retcode === 0 && res.filename) {
        this._playUrl(res.filename);
      } else {
        throw new Error(`WechatSI retcode: ${res.retcode}`);
      }
    } catch {
      this._setStatus('stopped');
      return;
    }
  }

  /** HTTP TTS API 合成语音 */
  private async _playViaAPI(text: string): Promise<void> {
    this._setStatus('loading');

    try {
      const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>((resolve, reject) => {
        wx.request({
          url: TTS_API_URL,
          method: 'POST',
          data: { text, speed: 0.9, voice: 'zh-CN-classical' },
          header: { 'Content-Type': 'application/json' },
          success: resolve,
          fail: reject,
        });
      });

      const data = res.data as Record<string, unknown>;
      if (data?.audioUrl) {
        this._playUrl(data.audioUrl as string);
      } else {
        throw new Error('No audioUrl in TTS response');
      }
    } catch {
      this._setStatus('stopped');
      return;
    }
  }
}

/** 全局单例 */
let _player: TTSPlayer | null = null;

export function getTTSPlayer(): TTSPlayer {
  if (!_player) {
    _player = new TTSPlayer();
  }
  return _player;
}
