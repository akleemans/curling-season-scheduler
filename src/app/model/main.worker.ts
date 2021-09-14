/// <reference lib="webworker" />

import {ScheduleService} from './schedule.service';
import {WorkerMessage, WorkerStatus} from './worker-message';

addEventListener('message', event => {
  // console.log('Worker got schedule:', skipabilities, availabilities);
  postMessage(new WorkerMessage(WorkerStatus.SOLVING, 'Start to solve...'));

  let status = WorkerStatus.SOLVED;
  let grid;
  try {
    grid = ScheduleService.schedule(event.data.availabilities, event.data.skipabilities, event.data.dates);
  } catch (e) {
    status = WorkerStatus.UNSOLVABLE;
  }
  postMessage(new WorkerMessage(status, JSON.stringify(grid)));
});
