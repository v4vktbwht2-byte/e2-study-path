import { describe, expect, it } from "vitest";

import { resolveStudyDay } from "./index";

describe("学習日境界", () => {
  it("開始時刻より前は前の学習日、境界以降は新しい学習日として解決する", () => {
    const boundary = { timeZone: "Asia/Tokyo", hour: 4 };

    expect(resolveStudyDay(new Date("2026-07-27T18:59:59.999Z"), boundary)).toEqual({
      studyDate: "2026-07-27",
      studyDayStartMs: Date.parse("2026-07-26T19:00:00.000Z"),
    });
    expect(resolveStudyDay(new Date("2026-07-27T19:00:00.000Z"), boundary)).toEqual({
      studyDate: "2026-07-28",
      studyDayStartMs: Date.parse("2026-07-27T19:00:00.000Z"),
    });
  });

  it("夏時間開始日も現地の学習開始時刻を維持する", () => {
    expect(
      resolveStudyDay(new Date("2024-03-10T12:00:00.000Z"), {
        timeZone: "America/New_York",
        hour: 4,
      }),
    ).toEqual({
      studyDate: "2024-03-10",
      studyDayStartMs: Date.parse("2024-03-10T08:00:00.000Z"),
    });
  });

  it("夏時間終了日も現地の学習開始時刻を維持する", () => {
    expect(
      resolveStudyDay(new Date("2024-11-03T14:00:00.000Z"), {
        timeZone: "America/New_York",
        hour: 4,
      }),
    ).toEqual({
      studyDate: "2024-11-03",
      studyDayStartMs: Date.parse("2024-11-03T09:00:00.000Z"),
    });
  });

  it.each([
    {
      label: "夏時間開始日",
      justBefore: "2024-03-10T07:59:59.999Z",
      exact: "2024-03-10T08:00:00.000Z",
      previousDate: "2024-03-09",
      previousStart: "2024-03-09T09:00:00.000Z",
      currentDate: "2024-03-10",
      currentStart: "2024-03-10T08:00:00.000Z",
    },
    {
      label: "夏時間終了日",
      justBefore: "2024-11-03T08:59:59.999Z",
      exact: "2024-11-03T09:00:00.000Z",
      previousDate: "2024-11-02",
      previousStart: "2024-11-02T08:00:00.000Z",
      currentDate: "2024-11-03",
      currentStart: "2024-11-03T09:00:00.000Z",
    },
  ])("$labelも境界直前と一致を別の学習日として扱う", (fixture) => {
    const boundary = { timeZone: "America/New_York", hour: 4 };

    expect(resolveStudyDay(new Date(fixture.justBefore), boundary)).toEqual({
      studyDate: fixture.previousDate,
      studyDayStartMs: Date.parse(fixture.previousStart),
    });
    expect(resolveStudyDay(new Date(fixture.exact), boundary)).toEqual({
      studyDate: fixture.currentDate,
      studyDayStartMs: Date.parse(fixture.currentStart),
    });
  });

  it("不正なIANAタイムゾーンを識別可能なエラーにする", () => {
    expect(() =>
      resolveStudyDay(new Date("2026-07-27T12:00:00.000Z"), {
        timeZone: "Invalid/Time_Zone",
        hour: 4,
      }),
    ).toThrowError(
      expect.objectContaining({
        code: "INVALID_TIME_ZONE",
      }),
    );
  });
});
