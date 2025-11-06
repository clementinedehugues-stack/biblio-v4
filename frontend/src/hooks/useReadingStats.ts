import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useReadingStatus } from './useReadingStatus';

export interface ReadingStats {
  totalBooks: number;
  booksToRead: number;
  booksReading: number;
  booksFinished: number;
  totalPagesRead: number;
  averagePagesPerBook: number;
  readingStreak: number;
  thisMonthBooks: number;
  thisYearBooks: number;
}

export function useReadingStats() {
  const { user } = useAuth();
  const { statuses } = useReadingStatus();

  const stats: ReadingStats = useMemo(() => {
    if (!user?.id) {
      return {
        totalBooks: 0,
        booksToRead: 0,
        booksReading: 0,
        booksFinished: 0,
        totalPagesRead: 0,
        averagePagesPerBook: 0,
        readingStreak: 0,
        thisMonthBooks: 0,
        thisYearBooks: 0,
      };
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let totalPagesRead = 0;
    let booksWithPages = 0;
    let thisMonthBooks = 0;
    let thisYearBooks = 0;

    const statusCounts = {
      to_read: 0,
      reading: 0,
      finished: 0,
    };

    // Analyze all reading statuses
    Object.values(statuses).forEach((data) => {
      // Count by status
      if (data.status === 'to_read') statusCounts.to_read++;
      else if (data.status === 'reading') statusCounts.reading++;
      else if (data.status === 'finished') statusCounts.finished++;

      // Count pages
      if (data.pagesRead) {
        totalPagesRead += data.pagesRead;
        booksWithPages++;
      }

      // Count books finished this month/year
      if (data.finishedAt) {
        const finishedDate = new Date(data.finishedAt);
        if (finishedDate.getFullYear() === thisYear) {
          thisYearBooks++;
          if (finishedDate.getMonth() === thisMonth) {
            thisMonthBooks++;
          }
        }
      }
    });

    // Calculate reading streak (consecutive days with reading activity)
    const readingDates: number[] = [];
    Object.values(statuses).forEach((data) => {
      if (data.lastReadAt) {
        const dateStr = new Date(data.lastReadAt).toDateString();
        const timestamp = new Date(dateStr).getTime();
        if (!readingDates.includes(timestamp)) {
          readingDates.push(timestamp);
        }
      }
    });

    readingDates.sort((a, b) => b - a); // Sort descending

    let streak = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const today = new Date().setHours(0, 0, 0, 0);

    for (let i = 0; i < readingDates.length; i++) {
      const expectedDate = today - (i * oneDayMs);
      if (readingDates[i] === expectedDate) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalBooks: Object.keys(statuses).length,
      booksToRead: statusCounts.to_read,
      booksReading: statusCounts.reading,
      booksFinished: statusCounts.finished,
      totalPagesRead,
      averagePagesPerBook: booksWithPages > 0 ? Math.round(totalPagesRead / booksWithPages) : 0,
      readingStreak: streak,
      thisMonthBooks,
      thisYearBooks,
    };
  }, [user?.id, statuses]);

  return stats;
}
