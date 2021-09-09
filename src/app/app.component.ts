import {Component} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import * as FileSaver from "file-saver";
import {UploadDialogComponent} from './upload-dialog/upload-dialog.component';

enum State {
  Planned,
  Substitute,
  Unplanned
}

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
  public availability: boolean[][] = [];

  public showTable = false;

  public constructor(
    private readonly dialog: MatDialog,
  ) {
  }

  public prepareData(): void {
    // Example data - read out real data
    this.dates = ['26.11.', '28.11.', '01.12.'];
    this.people = ['Person A', 'Person B']

    // Generate example arrays
    this.schedule.push([State.Planned, State.Unplanned, State.Unplanned]);
    this.schedule.push([State.Unplanned, State.Substitute, State.Planned]);
    this.schedule.push([State.Unplanned, State.Planned, State.Unplanned]);

    // TODO read out & save availability

    // Prepare table
    this.displayedColumns = ['name'].concat(this.dates);
    this.showTable = true;
  }

  public getScheduleEntry(person: string, dateId: number): State {
    console.log('person:', person);
    const personId = this.people.indexOf(person);
    console.log('Trying to get personId=', personId, 'dateId=', dateId, 'from schedule', this.schedule);
    return this.schedule[personId][dateId];
  }

  public generateSchedule(): void {
    // TODO
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
