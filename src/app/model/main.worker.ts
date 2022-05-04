/// <reference lib="webworker" />

import {CellState} from './cell-state';
import {ScheduleService} from './schedule.service';
import {WorkerMessage, WorkerStatus} from './worker-message';

const sendUpdate = (score: number, grid: CellState[][]) => {
  const status = (grid.length === 0 ? WorkerStatus.UNSOLVABLE : WorkerStatus.SOLVING);
  postMessage(new WorkerMessage(status, score, JSON.stringify(grid)));
};

addEventListener('message', event => {
  ScheduleService.schedule(event.data.availabilities, event.data.skipabilities, event.data.dates, sendUpdate);
  postMessage(new WorkerMessage(WorkerStatus.FINISHED, 0, ''));
});
