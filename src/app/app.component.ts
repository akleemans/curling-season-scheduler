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
  Unsolvable,
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
  private readonly FIXED_SCORE: number = 300;

  // data
  public schedule: CellState[][] = [];
  public currentScore: number = 0;
  public lastSolutionTime: Date = new Date();
  public solutionCount: number = 0;
  public availabilities: boolean[][] = [];
  public skipabilities: Skipability[] = [];
  public skipabilityFromHash: boolean[] = [];
  public players: string[] = [];
  public dates: string[] = [];

  public appState = AppState.Initial;
  public playerTotal: number[] = [];
  public playerPossible: number[] = [];

  public worker?: Worker;

  public basicVerificationErrors: string[] = [];
  public temporaryEnabled: { dateIdx: number }[] = [];

  public constructor(
    private readonly dialog: MatDialog,
  ) {
  }

  public prepareTableData(): void {
    this.playerPossible = this.availabilities.map(p => _.sum(p.map(d => d ? 1 : 0)));
    this.displayedColumns = ['name'].concat(this.dates);
  }

  public generateSchedule(): void {
    this.appState = AppState.Solving;

    // Create a new worker
    this.worker = new Worker(new URL('./model/main.worker', import.meta.url), {type: 'module'});
    this.worker.onmessage = event => {
      const message: WorkerMessage = event.data;
      console.log(`MainComponent got worker message: ${message.status}!`);
      switch (message.status) {
        case WorkerStatus.SOLVING:
          this.currentScore = this.FIXED_SCORE - message.score;
          this.lastSolutionTime = new Date();
          this.solutionCount += 1;
          this.schedule = JSON.parse(message.content);
          this.playerTotal = this.schedule.map(p => _.sum(p.map(d => (d === CellState.TeamOne || d === CellState.TeamTwo) ? 1 : 0)));
          break;
        case WorkerStatus.UNSOLVABLE:
          this.appState = AppState.Unsolvable;
          this.worker!.terminate();
          break;
        case WorkerStatus.FINISHED:
          console.log('Finished!', JSON.stringify(message.content));
          this.appState = AppState.Solved;
          this.worker!.terminate();
          break;
      }
    };
    const data = {
      availabilities: this.availabilities,
      skipabilities: this.skipabilities,
      dates: this.dates
    };
    this.worker!.postMessage(data);
  }

  public downloadData(): void {
    // Prepare data
    const data: string[] = []
    data.push('Name,' + this.dates.map(d => d.toString()).join(',') + '\n');
    for (let p = 0; p < this.availabilities.length; p++) {
      data.push(this.players[p] + ',' + this.schedule[p].map(d => d.toString()).join(',') + '\n');
    }
    // TODO check if mimetype should be text/csv;charset=utf-8
    const blob = new Blob(data, {type: 'text/csv'});
    FileSaver.saveAs(blob, 'schedule.csv');
  }

  public stopSearch(): void {
    this.worker!.terminate();

    if (this.schedule.length === 0) {
      console.log('Schedule not solvable!');
      this.appState = AppState.Unsolvable;
    } else {
      this.appState = AppState.Solved;
    }
  }

  public loadData(): void {
    const dialogRef = this.dialog.open(UploadDialogComponent);

    dialogRef.afterClosed().subscribe(async (data: ScheduleParameters) => {
      if (data) {
        console.log('Loaded data:', data);
        this.availabilities = data.availabilities;
        this.skipabilities = data.skipabilities;
        this.players = data.people;
        this.dates = data.dates;
        this.skipabilityFromHash = data.skipabilityFromHash;

        console.log('Got people:', this.players, 'dates:', this.dates);
        this.prepareTableData();
        this.doBasicVerification();
        this.appState = AppState.Uploaded;
      }
    });
  }

  private doBasicVerification(): void {
    // Check dates if 8 slots are available
    for (let i = 0; i < this.dates.length; i++) {
      let count = 0;
      for (let p = 0; p < this.players.length; p++) {
        count += (this.availabilities[p][i] ? 1 : 0);
      }

      if (count < 8) {
        let error = `Datum ${this.dates[i]} nicht möglich: Nur ${count} Personen können an diesem Tag spielen.
        Setze Datum bei allen auf "Nein".`;

        for (let p = 0; p < this.availabilities.length; p++) {
          this.availabilities[p][i] = false;
        }
        this.basicVerificationErrors.push(error);
      }
    }
  }
}
