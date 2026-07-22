// ============================================
// TTS 语音播报工具
// 优先使用预录音频(audioUrl)，无则走 WechatSI TTS 合成
//
// 引擎切换：修改 TTS_ENGINE 常量即可
//   - 'wechat'  : 微信同声传译插件（WechatSI），免费，需先在 app.json 配置插件并申请审核通过
//   - 'api'     : HTTP TTS API，替换 TTS_API_URL 为真实地址后可用
//
// 资源管理：
//   - 同一时刻只有一个 InnerAudioContext 实例，新播放前自动销毁旧实例
//   - playId 机制：每次 play() 生成新 playId，异步回调中检测过期则丢弃结果
//   - stop() 立即终止合成等待链和音频播放
// ============================================

const TTS_ENGINE: 'wechat' | 'api' = 'wechat';
const PLAYBACK_RATE = 1; // 播放速度，0.5~2.0，1.0 为正常速度
const TTS_API_URL = 'https://api.example.com/tts'; // TODO: 替换为真实 TTS API 地址

type AudioStatus = 'idle' | 'loading' | 'playing' | 'stopped';

interface TTSCallbacks {
  onStatusChange?: (status: AudioStatus) => void;
  /** 仅自然播放完成时触发（非 stop/error/playId 过期） */
  onEnded?: () => void;
}

class TTSPlayer {

  /** WechatSI 单次合成最大字数（官方无文档，实测约 200 字，留余量） */
  private static readonly WE_CHAT_SI_MAX_LEN = 150;

  private _ctx: WechatMiniprogram.InnerAudioContext | null = null;
  private _status: AudioStatus = 'idle';
  private _callbacks: TTSCallbacks = {};
  /** 每次 play() 自增，异步回调中校验，过期则丢弃 */
  private _playId = 0;

  /** 播放文本。
   *  优先使用 audioUrl 预录音频；无则走 TTS 合成（长文本自动切段拼接）。 */
  async play(text: string, audioUrl?: string, callbacks?: TTSCallbacks): Promise<void> {
    // 新播放开始，递增 playId + 停止旧播放
    this._playId++;
    this._destroyCtx();
    this._setStatus('idle');

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

  /** 停止播放并销毁音频上下文 */
  stop(): void {
    this._playId++; // 终止所有进行中的异步回调
    this._destroyCtx();
    this._setStatus('stopped');
  }

  /** 释放所有资源（页面销毁时调用） */
  destroy(): void {
    this.stop();
    this._callbacks = {};
  }

  get status(): AudioStatus {
    return this._status;
  }

  // ============================================
  // 音频上下文管理
  // ============================================

  /** 销毁当前音频上下文（安全，可重复调用） */
  private _destroyCtx(): void {
    if (this._ctx) {
      // 先解绑回调避免 destroy 后仍触发
      this._ctx.offCanplay();
      this._ctx.offPlay();
      this._ctx.offEnded();
      this._ctx.offStop();
      this._ctx.offError();
      this._ctx.stop();
      this._ctx.destroy();
      this._ctx = null;
    }
  }

  /** 创建新 InnerAudioContext（会先销毁旧实例） */
  private _createCtx(): WechatMiniprogram.InnerAudioContext {
    this._destroyCtx();
    wx.setInnerAudioOption({ obeyMuteSwitch: false });
    const ctx = wx.createInnerAudioContext();
    ctx.obeyMuteSwitch = false;
    ctx.playbackRate = PLAYBACK_RATE;
    this._ctx = ctx;
    return ctx;
  }

  // ============================================
  // 私有播放方法
  // ============================================

  private _setStatus(s: AudioStatus): void {
    this._status = s;
    this._callbacks.onStatusChange?.(s);
  }

  /** 直接播放音频 URL */
  private _playUrl(url: string): void {
    this._setStatus('loading');

    const playId = this._playId;
    const ctx = this._createCtx();
    ctx.autoplay = true;
    ctx.src = url;

    ctx.onCanplay(() => {
      if (this._playId !== playId) return;
      this._setStatus('playing');
    });
    ctx.onPlay(() => {
      if (this._playId !== playId) return;
      this._setStatus('playing');
    });
    ctx.onEnded(() => {
      if (this._playId !== playId) return;
      this._setStatus('stopped');
      // 仅当 ctx 未被替换时才销毁
      if (this._ctx === ctx) {
        this._destroyCtx();
      }
      this._callbacks.onEnded?.();
    });
    ctx.onStop(() => {
      if (this._playId !== playId) return;
      this._setStatus('stopped');
    });
    ctx.onError((err) => {
      if (this._playId !== playId) return;
      console.warn('[TTS] audio play error:', err);
      this._setStatus('stopped');
      if (this._ctx === ctx) {
        this._destroyCtx();
      }
    });
  }

  /** WechatSI 插件合成语音，长文本自动切段拼接 */
  private async _playViaWechatSI(text: string): Promise<void> {
    this._setStatus('loading');
    const playId = this._playId;

    let plugin: Record<string, unknown> | null = null;
    try {
      plugin = (requirePlugin as unknown as Function)('WechatSI') as Record<string, unknown>;
    } catch {
      if (this._playId === playId) this._setStatus('stopped');
      return;
    }

    if (!plugin?.textToSpeech) {
      if (this._playId === playId) this._setStatus('stopped');
      return;
    }

    const chunks = this._splitText(text, TTSPlayer.WE_CHAT_SI_MAX_LEN);
    const filenames: string[] = [];

    // 逐段合成（串行，避免并发触发 WechatSI 限流）
    for (const chunk of chunks) {
      if (this._playId !== playId) return; // 已被 stop() 终止

      try {
        const res = await new Promise<{ retcode: number; filename?: string }>(
          (resolve, reject) => {
            (plugin!.textToSpeech as Function)({
              lang: 'zh_CN',
              tts: true,
              content: chunk,
              success: resolve,
              fail: reject,
            } as Record<string, unknown>);
          },
        );

        if (this._playId !== playId) return; // 合成完成前被终止，丢弃结果

        if (res.retcode === 0 && res.filename) {
          filenames.push(res.filename);
        } else {
          throw new Error(`WechatSI retcode: ${res.retcode}`);
        }
      } catch {
        if (this._playId === playId) this._setStatus('stopped');
        return;
      }
    }

    // 全部合成完毕，开始播放
    if (this._playId !== playId) return;

    if (filenames.length === 1) {
      this._playUrl(filenames[0]);
    } else {
      this._playSequential(filenames);
    }
  }

  /** 顺序播放多个音频文件（不阻塞，通过 onEnded 驱动） */
  private _playSequential(filenames: string[]): void {
    if (filenames.length === 0) {
      this._setStatus('stopped');
      return;
    }

    this._setStatus('loading');
    const playId = this._playId;
    const ctx = this._createCtx();
    let index = 0;

    const playNext = () => {
      if (this._playId !== playId) return;
      if (index >= filenames.length) {
        this._setStatus('stopped');
        if (this._ctx === ctx) {
          this._destroyCtx();
        }
        this._callbacks.onEnded?.();
        return;
      }
      ctx.src = filenames[index++];
      ctx.play();
    };

    ctx.onCanplay(() => {
      if (this._playId !== playId) return;
      this._setStatus('playing');
    });
    ctx.onPlay(() => {
      if (this._playId !== playId) return;
      this._setStatus('playing');
    });
    ctx.onEnded(() => {
      if (this._playId !== playId) return;
      playNext();
    });
    ctx.onStop(() => {
      if (this._playId !== playId) return;
      this._setStatus('stopped');
    });
    ctx.onError((err) => {
      if (this._playId !== playId) return;
      console.warn('[TTS] sequential play error:', err);
      // 单段失败不中断整篇，跳下一段
      playNext();
    });

    playNext();
  }

  /** 按标点将文本切为不超过 maxLen 汉字的片段 */
  private _splitText(text: string, maxLen: number): string[] {
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxLen) {
        chunks.push(remaining);
        break;
      }
      // 在 maxLen 范围内找最后一个句读标点
      const slice = remaining.slice(0, maxLen);
      const puncts = ['。', '！', '？', '；', '，', '、'];
      let cutAt = -1;
      for (const p of puncts) {
        const idx = slice.lastIndexOf(p);
        if (idx > cutAt) cutAt = idx;
      }
      if (cutAt < maxLen / 2) {
        cutAt = maxLen; // 找不到合适断点，硬切
      } else {
        cutAt += 1; // 包含标点
      }
      chunks.push(remaining.slice(0, cutAt));
      remaining = remaining.slice(cutAt);
    }
    return chunks;
  }

  /** HTTP TTS API 合成语音 */
  private async _playViaAPI(text: string): Promise<void> {
    this._setStatus('loading');
    const playId = this._playId;

    try {
      const res = await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>(
        (resolve, reject) => {
          wx.request({
            url: TTS_API_URL,
            method: 'POST',
            data: { text, speed: 0.9, voice: 'zh-CN-classical' },
            header: { 'Content-Type': 'application/json' },
            success: resolve,
            fail: reject,
          });
        },
      );

      if (this._playId !== playId) return;

      const data = res.data as Record<string, unknown>;
      if (data?.audioUrl) {
        this._playUrl(data.audioUrl as string);
      } else {
        throw new Error('No audioUrl in TTS response');
      }
    } catch {
      if (this._playId === playId) this._setStatus('stopped');
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
