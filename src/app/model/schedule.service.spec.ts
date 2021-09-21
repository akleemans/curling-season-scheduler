import {ScheduleService} from './schedule.service';

describe('ScheduleService', () => {

  describe('inSameWeek', () => {
    it('should recognize dates in same week', () => {
      expect(ScheduleService.inSameWeek('21.09.2021', '22.09.2021')).toBeTrue();
      expect(ScheduleService.inSameWeek('20.09.2021', '23.09.2021')).toBeTrue();
      expect(ScheduleService.inSameWeek('31.12.2020', '01.01.2021')).toBeTrue();
    });

    it('should recognize dates not in same week', () => {
      expect(ScheduleService.inSameWeek('18.09.2021', '19.09.2021')).toBeFalse();
      expect(ScheduleService.inSameWeek('19.09.2021', '26.09.2021')).toBeFalse();
    });
  });

  describe('getDistributionScore', () => {
    it('should compare data against each other', () => {
      let testData = [
        [1, 5, 9, 13, 17, 22],
        [1, 11, 21],
        [6, 7, 13, 16, 20],
        [2, 10, 11, 12, 17, 22],
        [8, 10, 12, 14, 16],
        [1, 2, 3, 4, 20, 21, 22],
        [1, 19, 21]
      ];

      const scores = testData.map(d => ScheduleService.getDistributionScore(d, 22));
      console.log('scores:', scores);
      expect([...scores]).toEqual(scores.sort((a, b) => a - b));
    });
  });


  describe('isFilled', () => {
    const testGrid = [
      [undefined, true, false],
      [false, true, false],
      [false, false, false],
    ];

    it('should recognize filled grid', () => {
      expect(ScheduleService.isFilled(testGrid)).toBeFalse();
    });

    it('should recognize unfilled grid', () => {
      testGrid[0][0] = true;
      expect(ScheduleService.isFilled(testGrid)).toBeTrue();
    });
  });

});
