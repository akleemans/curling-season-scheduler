import {Skipability} from './skipability';

export interface ScheduleParameters {
  availabilities: boolean[][];
  skipabilities: Skipability[];
  people: string[];
  dates: string[];
  skipabilityFromHash: boolean[];
}
