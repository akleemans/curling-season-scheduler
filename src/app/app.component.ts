import {Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import * as FileSaver from "file-saver";
import {Skipability} from './skipability';
import {State} from './state';
import {UploadDialogComponent} from './upload-dialog/upload-dialog.component';
import {WorkerMessage, WorkerStatus} from './worker-message';

enum AppState {
  INITIAL,
  SOLVING,
  SOLVED
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public displayedColumns: string[] = [];
  public readonly stateEnum = State;
  public readonly appStateEnum = AppState;

  // data
  public people: string[] = [];
  public dates: string[] = [];
  public schedule: State[][] = [];
  public availabilities: boolean[][] = [];
  public skipabilities: Skipability[] = [];

  public appState = AppState.INITIAL;

  public constructor(
    private readonly dialog: MatDialog,
  ) {
  }

  public prepareData(): void {
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
    console.log('Generated availabilities:', this.availabilities);
    console.log('Generated skipabilities:', this.skipabilities);

    // TODO read out & save availability

    // Prepare table
    this.displayedColumns = ['name'].concat(this.dates);
  }

  public generateSchedule(): void {
    this.appState = AppState.SOLVING;

    // Create a new worker
    const worker = new Worker(new URL('./main.worker', import.meta.url), {type: 'module'});
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
          this.appState = AppState.SOLVED;
          worker.terminate();
          break;
        case WorkerStatus.UNSOLVABLE:
          this.appState = AppState.SOLVED;
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

    dialogRef.afterClosed().subscribe(async (data: any) => {
      if (data) {
        console.log('Loaded data:', data);

        // TODO parse CSV

        this.prepareData();
      }
    });
  }
}
