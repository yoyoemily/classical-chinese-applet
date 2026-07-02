import { fetchCheckinRecords, fetchUserProfile } from '../../api/index';

interface IDayCell { day: number; fullDate: string; isToday: boolean; isCheckedIn: boolean; isCurrentMonth: boolean; }
interface ICalendarData {
  currentYear: number; currentMonth: number; monthLabel: string;
  weekdays: string[]; calendarGrid: IDayCell[]; currentStreak: number;
  selectedDay: string; selectedSummary: string; showSheet: boolean;
  checkinDates: string[]; loading: boolean;
}

Page<ICalendarData, WechatMiniprogram.Page.CustomOption>({
  data: {
    currentYear: new Date().getFullYear(), currentMonth: new Date().getMonth() + 1,
    monthLabel: '', weekdays: ['日','一','二','三','四','五','六'],
    calendarGrid: [], currentStreak: 0, selectedDay: '', selectedSummary: '',
    showSheet: false, checkinDates: [], loading: false,
  },
  onLoad(): void { this.buildGrid(); this.loadData(); },
  async loadData(): Promise<void> {
    try {
      const [records, profile] = await Promise.all([
        fetchCheckinRecords(this.data.currentYear, this.data.currentMonth),
        fetchUserProfile(),
      ]);
      this.setData({ checkinDates: records, currentStreak: profile.currentStreak });
      this.buildGrid();
    } catch { /* ignore */ }
  },
  buildGrid(): void {
    const { currentYear, currentMonth, checkinDates } = this.data;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const firstDay = new Date(currentYear, currentMonth-1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const checkinSet = new Set(checkinDates);
    const grid: IDayCell[] = [];
    const prevLast = new Date(currentYear, currentMonth-1, 0).getDate();
    for (let i = startDow-1; i >= 0; i--) {
      const day = prevLast - i;
      const fd = currentMonth === 1 ? `${currentYear-1}-12-${String(day).padStart(2,'0')}` : `${currentYear}-${String(currentMonth-1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      grid.push({ day, fullDate: fd, isToday: fd === todayStr, isCheckedIn: checkinSet.has(fd), isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const fd = `${currentYear}-${String(currentMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      grid.push({ day: d, fullDate: fd, isToday: fd === todayStr, isCheckedIn: checkinSet.has(fd), isCurrentMonth: true });
    }
    const rem = grid.length % 7 === 0 ? 0 : 7 - (grid.length % 7);
    const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
    for (let d = 1; d <= rem; d++) {
      const fd = `${nextY}-${String(nextM).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      grid.push({ day: d, fullDate: fd, isToday: fd === todayStr, isCheckedIn: checkinSet.has(fd), isCurrentMonth: false });
    }
    this.setData({ calendarGrid: grid, monthLabel: `${currentYear}年${currentMonth}月` });
  },
  onPrevMonth(): void { let { currentYear, currentMonth } = this.data; if (currentMonth === 1) { currentMonth = 12; currentYear--; } else currentMonth--; this.setData({ currentYear, currentMonth }); this.loadData(); },
  onNextMonth(): void { let { currentYear, currentMonth } = this.data; const now = new Date(); if (currentYear*12+currentMonth >= now.getFullYear()*12+now.getMonth()+1) return; if (currentMonth === 12) { currentMonth = 1; currentYear++; } else currentMonth++; this.setData({ currentYear, currentMonth }); this.loadData(); },
  onTapDay(e: WechatMiniprogram.BaseEvent): void {
    const date = e.currentTarget.dataset.date as string;
    const checked = e.currentTarget.dataset.checked as boolean;
    const summary = checked ? `${date} - 已完成打卡学习` : `${date} - 未打卡`;
    this.setData({ selectedDay: date, selectedSummary: summary, showSheet: true });
  },
  onCloseSheet(): void { this.setData({ showSheet: false }); },
});
