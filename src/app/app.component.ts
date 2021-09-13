import {Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import * as FileSaver from "file-saver";
import {ScheduleService} from './schedule.service';
import {Skipability} from './skipability';
import {State} from './state';
import {UploadDialogComponent} from './upload-dialog/upload-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  public displayedColumns: string[] = [];
  public readonly stateEnum = State;

  // data
  public people: string[] = [];
  public dates: string[] = [];
  public schedule: State[][] = [];
  public availabilities: boolean[][] = [];
  public skipabilities: Skipability[] = [];

  public showTable = false;

  public constructor(
    private readonly dialog: MatDialog,
    private readonly scheduleService: ScheduleService
  ) {
  }

  public prepareData(): void {
    // Example data - read out real data
    for (let p = 0; p < 20; p++) {
      this.people.push('Person ' + p)
      this.skipabilities.push(p % 3);
    }
    this.dates = ['27.09.', '29.09.', '04.10.', '06.10.', '12.10.', '13.10.', '18.10.', '20.10.'];

    // Generate base schedule
    for (let p = 0; p < this.people.length; p++) {
      const row = [];
      for (let d = 0; d < this.dates.length; d++) {
        row.push(Math.random() < 0.8);
      }
      this.availabilities.push(row);
      // this.skipabilities.push(Math.round(Math.random() * 2))
    }
    console.log('Generated skipabilities:', this.skipabilities);

    // TODO read out & save availability

    // Prepare table
    this.displayedColumns = ['name'].concat(this.dates);
  }

  public generateSchedule(): void {
    this.schedule = this.scheduleService.schedule(this.availabilities, this.skipabilities);
    this.showTable = true;
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
