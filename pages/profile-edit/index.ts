// ============================================
// 个人信息编辑页面
// ============================================
import { getUserProfile, saveUserProfile } from '../../utils/storage';
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
    const profile = getUserProfile();
    const gradeIndex = profile.grade
      ? this.data.gradeOptions.indexOf(profile.grade)
      : 0;
    this.setData({
      avatarUrl: profile.avatarUrl,
      nickName: profile.nickName,
      grade: profile.grade,
      gradeIndex: gradeIndex >= 0 ? gradeIndex : 0,
    });
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

  /** 持久化保存 */
  save(): void {
    const profile: IUserProfile = {
      avatarUrl: this.data.avatarUrl,
      nickName: this.data.nickName,
      grade: this.data.grade,
    };
    saveUserProfile(profile);
  },
});
