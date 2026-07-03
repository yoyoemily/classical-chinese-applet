// ============================================
// 个人信息编辑页面
// ============================================
import { fetchUserInfo, saveUserInfo } from '../../api/index';
import type { IUserProfile } from '../../typings/index.d';

interface IProfileEditData {
  avatarUrl: string;
  nickName: string;
  grade: string;
  gradeIndex: number;
  gradeOptions: string[];
}

Page<IProfileEditData, WechatMiniprogram.Page.CustomOption>({
  data: {
    avatarUrl: '',
    nickName: '',
    grade: '',
    gradeIndex: 0,
    gradeOptions: [
      '不设置',
      '七年级上', '七年级下',
      '八年级上', '八年级下',
      '九年级上', '九年级下',
      '高一上', '高一下',
      '高二上', '高二下',
      '高三上', '高三下',
    ],
  },

  onLoad(): void {
    this.loadProfile();
  },

  async loadProfile(): Promise<void> {
    try {
      const profile = await fetchUserInfo();
      const gradeIndex = profile.grade
        ? this.data.gradeOptions.indexOf(profile.grade)
        : 0;
      this.setData({
        avatarUrl: profile.avatarUrl,
        nickName: profile.nickName,
        grade: profile.grade,
        gradeIndex: gradeIndex >= 0 ? gradeIndex : 0,
      });
    } catch {
      // 加载失败使用默认值
    }
  },

  /** 选择头像（微信新版头像组件） */
  onChooseAvatar(e: WechatMiniprogram.CustomEvent<{ avatarUrl: string }>): void {
    this.setData({ avatarUrl: e.detail.avatarUrl });
    this.save();
  },

  /** 从相册选择或拍照 */
  onChoosePhoto(): void {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ avatarUrl: tempFilePath });
        this.save();
      },
      fail: (err) => {
        if (err.errMsg.includes('cancel')) return;
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      },
    });
  },

  /** 昵称输入（微信新版 type="nickname"） */
  onNickNameInput(e: WechatMiniprogram.Input): void {
    this.setData({ nickName: e.detail.value });
    this.save();
  },

  /** 年级选择 */
  onGradeChange(e: WechatMiniprogram.PickerChange): void {
    const index = Number(e.detail.value);
    const grade = index === 0 ? '' : this.data.gradeOptions[index];
    this.setData({ gradeIndex: index, grade });
    this.save();
  },

  /** 即时持久化保存——哪个字段不为空就传哪个 */
  async save(): Promise<void> {
    const profile: IUserProfile = {
      avatarUrl: this.data.avatarUrl,
      nickName: this.data.nickName,
      grade: this.data.grade,
    };
    try {
      await saveUserInfo(profile);
    } catch {
      // 静默失败
    }
  },
});
