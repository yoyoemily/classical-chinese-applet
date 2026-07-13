// ============================================
// 答题音效反馈——用 WebAudioContext 生成简短的合成音效
// ============================================

let audioCtx: WechatMiniprogram.WebAudioContext | null = null;

function getAudioContext(): WechatMiniprogram.WebAudioContext {
  if (!audioCtx) {
    audioCtx = wx.createWebAudioContext();
  }
  return audioCtx;
}

/**
 * 播放一个纯音
 * @param frequency  频率（Hz）
 * @param duration   持续时长（秒）
 * @param type       波形（sine=柔和 / triangle=中 / sawtooth=蜂鸣感）
 * @param startDelay 延迟播放（秒），用于音序
 */
function playTone(
  frequency: number,
  duration: number,
  type: 'sine' | 'triangle' | 'sawtooth',
  startDelay: number = 0,
): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    const now = ctx.currentTime + startDelay;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    // 音效不是关键功能，静默失败
  }
}

/** 答对音效：上行纯音双音（C5→E5），明亮愉悦 */
export function playCorrectSound(): void {
  playTone(523, 0.10, 'sine', 0);      // C5
  playTone(659, 0.18, 'sine', 0.08);   // E5
}

/** 答错音效：下行锯齿波双音（E3→C3#），低沉警示 */
export function playWrongSound(): void {
  playTone(330, 0.12, 'sawtooth', 0);   // E4
  playTone(277, 0.20, 'triangle', 0.10); // C#4（小二度下行，明显不协和）
}

/** 学习完成音效：上行大调和弦琶音（C5→E5→G5→C6），庆典号角感 */
export function playCompleteSound(): void {
  // 用 triangle 波模拟铜管号角感，逐音上行，每音略有重叠
  playTone(523, 0.18, 'triangle', 0);     // C5
  playTone(659, 0.18, 'triangle', 0.12);  // E5
  playTone(784, 0.18, 'triangle', 0.24);  // G5
  playTone(1047, 0.28, 'triangle', 0.36); // C6（高八度收束，延长）
}

/** 释放 WebAudioContext（页面销毁时调用） */
export function destroyAudioContext(): void {
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch {
      // ignore
    }
    audioCtx = null;
  }
}
