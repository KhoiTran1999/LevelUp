'use client';

import React, { useMemo } from 'react';

export function WeekCalendarStrip() {
  const { monthLabel, days } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);

    const dayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const daysList = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      daysList.push({
        name: dayNames[i],
        dateNum: d.getDate(),
        isToday: i === dayOfWeek,
      });
    }

    return {
      monthLabel: `Tháng ${month}, ${year}`,
      days: daysList,
    };
  }, []);

  return (
    <div
      id="week-calendar-container"
      className="mb-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-2.5 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs"
    >
      <div className="flex items-center justify-between px-2 sm:px-3 py-0.5 mb-1">
        <span
          id="current-week-month-label"
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono"
        >
          {monthLabel}
        </span>
      </div>
      <div id="week-strip-days" className="week-calendar-strip">
        {days.map((d, index) => (
          <div key={index} className={`week-day-col ${d.isToday ? 'is-today' : ''}`}>
            <span className="week-day-name">{d.name}</span>
            <div className="week-day-circle">
              <span>{d.dateNum}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
