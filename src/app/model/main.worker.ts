/// <reference lib="webworker" />

import {CellState} from './cell-state';
import {ScheduleService} from './schedule.service';
import {WorkerMessage, WorkerStatus} from './worker-message';

const sendUpdate = (score: number, grid: CellState[][]) => {
  postMessage(new WorkerMessage(WorkerStatus.SOLVING, score, JSON.stringify(grid)));
};

addEventListener('message', event => {
  ScheduleService.schedule(event.data.availabilities, event.data.skipabilities, event.data.dates, sendUpdate);
  postMessage(new WorkerMessage(WorkerStatus.FINISHED, 0, ''));
});
