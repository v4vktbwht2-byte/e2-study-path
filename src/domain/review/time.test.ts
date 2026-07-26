import { describe, expect, it } from "vitest";
import { addCalendarStudyDays } from "./time";

describe("学習日を考慮した日時計算", () => {
  it("うるう年の2月29日を飛ばさない", () => {
    const result = addCalendarStudyDays(new Date("2028-02-28T12:00:00.000Z"), 1, {
      timeZone: "UTC",
      hour: 4,
    });
    expect(result.toISOString()).toBe("2028-02-29T04:00:00.000Z");
  });

  it("月末から翌月へ正しく進む", () => {
    const result = addCalendarStudyDays(new Date("2026-01-31T12:00:00.000Z"), 1, {
      timeZone: "UTC",
      hour: 4,
    });
    expect(result.toISOString()).toBe("2026-02-01T04:00:00.000Z");
  });

  it("夏時間開始日でも現地の学習開始時刻を維持する", () => {
    const result = addCalendarStudyDays(new Date("2024-03-09T12:00:00.000Z"), 1, {
      timeZone: "America/New_York",
      hour: 4,
    });
    expect(result.toISOString()).toBe("2024-03-10T08:00:00.000Z");
  });

  it("同じ日時と境界から常に同じ結果を返す", () => {
    const now = new Date("2026-07-27T12:34:56.000Z");
    const boundary = { timeZone: "Asia/Tokyo", hour: 4, minute: 30 };
    expect(addCalendarStudyDays(now, 7, boundary)).toEqual(
      addCalendarStudyDays(now, 7, boundary),
    );
  });
});
