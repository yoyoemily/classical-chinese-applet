// ============================================
// 艾宾浩斯复习调度引擎
// ============================================
import { EBBINGHAUS_INTERVALS } from '../constants/config';
import type { IWordProgress, ReviewStage, ITodayWord, ITodayTask, ISentence } from '../typings/index.d';
import { getProgress, loadWordBookData } from './storage';
import { formatDate } from './util';

/**
 * 计算下次复习日期
 */
export function calcNextReviewDate(stage: ReviewStage, fromDate?: Date): string {
  const base = fromDate ?? new Date();
  if (stage === 'done' || stage === 6) {
    return '9999-12-31'; // 已完成不再复习
  }
  const intervalDays = EBBINGHAUS_INTERVALS[stage] ?? 30;
  const next = new Date(base.getTime() + intervalDays * 86400000);
  return formatDate(next, 'yyyy-MM-dd');
}

/**
 * 根据答题结果更新词进度
 */
export function updateWordProgress(
  progress: IWordProgress,
  isCorrect: boolean
): IWordProgress {
  const now = new Date();
  const timestamp = now.getTime();
  const today = formatDate(now, 'yyyy-MM-dd');

  const updated: IWordProgress = {
    ...progress,
    history: [...(progress.history || []), {
      sentenceId: '',
      selectedOption: isCorrect ? 0 : -1,
      correct: isCorrect,
      timestamp,
    }],
  };

  if (isCorrect) {
    updated.correctCount = (progress.correctCount || 0) + 1;
    if (progress.stage === 'done' || progress.stage === 6) {
      updated.stage = 'done';
      updated.nextReviewDate = '9999-12-31';
    } else {
      const currentStage = typeof progress.stage === 'number' ? progress.stage : 0;
      const nextStage = (currentStage + 1) as ReviewStage;
      updated.stage = nextStage;
      updated.nextReviewDate = calcNextReviewDate(nextStage);
    }
  } else {
    updated.wrongCount = (progress.wrongCount || 0) + 1;
    updated.resetCount = (progress.resetCount || 0) + 1;
    updated.stage = 0;
    updated.nextReviewDate = today; // 次日即需复习
  }

  return updated;
}

/**
 * 判断某字今天是否需要复习
 */
export function isDueForReview(progress: IWordProgress): boolean {
  if (!progress || progress.stage === 'done') return false;
  const today = formatDate(new Date(), 'yyyy-MM-dd');
  return progress.nextReviewDate <= today;
}

/**
 * 生成本日学习任务
 */
export function generateTodayTask(wordBookId: string): ITodayTask | null {
  const book = loadWordBookData(wordBookId);
  if (!book) return null;

  const progress = getProgress();
  const wordProgresses = progress.wordProgresses;
  const today = formatDate(new Date(), 'yyyy-MM-dd');

  // 找出到期复习的词
  const reviewWords: ITodayWord[] = [];
  const newWords: ITodayWord[] = [];

  // 已学的字中，到期需要复习的
  for (const word of book.words) {
    const wp = wordProgresses[word.id];
    if (!wp || wp.stage === 'done') continue;

    if (isDueForReview(wp) && wp.nextReviewDate <= today) {
      reviewWords.push({
        wordId: word.id,
        character: word.character,
        isReview: true,
        reviewStage: wp.stage,
        sentences: word.sentences.slice(0, 1), // 复习只出 1 题
      });
    }
  }

  // 还没有进度的字 = 未学，取前 N 个作为新词
  const unlearnedWords = book.words.filter(w => !wordProgresses[w.id]);
  const dailyNew = 2;
  for (let i = 0; i < Math.min(dailyNew, unlearnedWords.length); i++) {
    const word = unlearnedWords[i];
    newWords.push({
      wordId: word.id,
      character: word.character,
      isReview: false,
      sentences: word.sentences.slice(0, 3), // 新学出 2~3 题
    });
  }

  // 优先复习，再新学
  const allWords = [...reviewWords, ...newWords];
  const total = allWords.length;

  return {
    date: today,
    wordBookId: book.id,
    wordBookName: book.name,
    reviewWords,
    newWords,
    totalWords: total,
    estimatedMinutes: Math.ceil(total * 1.2),
  };
}

/**
 * 获取一个字的掌握等级描述
 */
export function getMasteryLabel(progress?: IWordProgress): string {
  if (!progress) return '未学';
  if (progress.stage === 'done') return '已掌握';
  if (typeof progress.stage === 'number') {
    if (progress.resetCount >= 3) return '困难';
    if (progress.wrongCount >= 2) return '模糊';
    if (progress.stage >= 3) return '熟悉';
    return '学习中';
  }
  return '学习中';
}
