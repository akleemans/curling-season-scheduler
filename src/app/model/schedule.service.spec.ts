import {ScheduleService} from './schedule.service';

describe('ScheduleService', () => {

  it('should recognize dates in same week', () => {
    expect(ScheduleService.inSameWeek('20.09.2021', '23.09.2021')).toBeTrue();
    expect(ScheduleService.inSameWeek('18.09.2021', '20.09.2021')).toBeFalse();
  });

  it('should calculate distribution score', () => {
    let testData = [
      [1, 5, 9, 13, 17, 22],
      [1, 11, 21],
      [2, 10, 11, 12, 17, 22],
      [6, 7, 13, 16, 20],
      [8, 10, 12, 14, 16],
      [1, 2, 3, 4, 20, 21, 22],
      [1, 19, 21]
    ];

    const scores = testData.map(d => ScheduleService.getDistributionScore(d, 22));
    expect(scores).toEqual(scores.sort());
  });

});
