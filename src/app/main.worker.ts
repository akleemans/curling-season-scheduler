/// <reference lib="webworker" />

import {ScheduleService} from './schedule.service';
import {WorkerMessage, WorkerStatus} from './worker-message';

addEventListener('message', event => {
  const availabilities = event.data.availabilities;
  const skipabilities = event.data.skipabilities;
  console.log('Worker got schedule:', skipabilities, availabilities);
  postMessage(new WorkerMessage(WorkerStatus.SOLVING, 'Start to solve...'));

  let status = WorkerStatus.SOLVED;
  let grid;
  try {
    grid = ScheduleService.schedule(availabilities, skipabilities);
  } catch (e) {
    status = WorkerStatus.UNSOLVABLE;
  }
  postMessage(new WorkerMessage(status, JSON.stringify(grid)));
});
