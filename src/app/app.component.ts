import {Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import * as FileSaver from "file-saver";
import * as _ from 'lodash';
import {CellState} from './model/cell-state';
import {ScheduleParameters} from './model/schedule-parameters';
import {Skipability} from './model/skipability';
import {WorkerMessage, WorkerStatus} from './model/worker-message';
import {UploadDialogComponent} from './upload-dialog/upload-dialog.component';

enum AppState {
  Initial,
  Uploaded,
  Solving,
  Solved
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public displayedColumns: string[] = [];
  public readonly stateEnum = CellState;
  public readonly appStateEnum = AppState;

  // data
  public schedule: CellState[][] = [];
  public availabilities: boolean[][] = [];
  public skipabilities: Skipability[] = [];
  public people: string[] = [];
  public dates: string[] = [];

  public appState = AppState.Initial;
  public playerTotal: number[] = [];
  public playerPossible: number[] = [];

  public constructor(
    private readonly dialog: MatDialog,
  ) {
  }

  public prepareTableData(): void {
    /*
    // Example data - read out real data
    for (let p = 0; p < 20; p++) {
      this.people.push('Person ' + p)
      this.skipabilities.push(p % 3);
    }
    for (let d = 0; d < 10; d++) {
      this.dates.push('date ' + d)
    }

    // Generate base schedule
    for (let p = 0; p < this.people.length; p++) {
      const row = [];
      for (let d = 0; d < this.dates.length; d++) {
        row.push(Math.random() < 0.8);
      }
      this.availabilities.push(row);
    }
    */
    //console.log('Generated availabilities:', this.availabilities);
    //console.log('Generated skipabilities:', this.skipabilities);

    this.playerPossible = this.availabilities.map(p => _.sum(p.map(d => d ? 1 : 0)));
    this.displayedColumns = ['name'].concat(this.dates);
  }

  public generateSchedule(): void {
    this.appState = AppState.Solving;

    // Create a new worker
    const worker = new Worker(new URL('./model/main.worker', import.meta.url), {type: 'module'});
    worker.onmessage = event => {
      console.log(`MainComponent got worker message: ${event.data}!`);
      const message: WorkerMessage = event.data;
      switch (message.status) {
        case WorkerStatus.SOLVING:
          console.log('Solving:', message.content);
          break;
        case WorkerStatus.SOLVED:
          console.log('Solved!', message.content);
          this.schedule = JSON.parse(message.content);
          this.playerTotal = this.schedule.map(p => _.sum(p.map(d => d <= 1 ? 1 : 0)));
          this.appState = AppState.Solved;
          worker.terminate();
          break;
        case WorkerStatus.UNSOLVABLE:
          this.appState = AppState.Solved;
          console.log('Schedule not solvable!');
          worker.terminate();
          break;
      }
    };
    const data = {
      availabilities: this.availabilities,
      skipabilities: this.skipabilities
    };
    console.log('Starting worker!', worker);
    worker.postMessage(data);
  }

  public downloadData(): void {
    // TODO implement CSV export
    const data = ['blubb,foo,bar\n', 'foo,blubber,bar'];
    // TODO check if mimetype should be text/csv;charset=utf-8
    const blob = new Blob(data, {type: 'text/csv'});
    FileSaver.saveAs(blob, 'schedule.csv');
  }

  public loadData(): void {
    const dialogRef = this.dialog.open(UploadDialogComponent);

    dialogRef.afterClosed().subscribe(async (data: ScheduleParameters) => {
      if (data) {
        console.log('Loaded data:', data);
        this.appState = AppState.Uploaded;
        this.availabilities = data.availabilities;
        this.skipabilities = data.skipabilities;
        this.people = data.people;
        this.dates = data.dates;

        console.log('Got people:', this.people, 'dates:', this.dates);
        this.prepareTableData();
      }
    });
  }
}
