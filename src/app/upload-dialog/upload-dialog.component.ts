import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {ScheduleParameters} from '../model/schedule-parameters';
import {Skipability} from '../model/skipability';

enum UploadState {
  Initial,
  Uploading,
  Uploaded
}

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.scss']
})
export class UploadDialogComponent {
  public readonly uploadStateEnum = UploadState;
  private file: File | null | undefined;
  public uploadState: UploadState = UploadState.Initial;
  public scheduleParameters?: ScheduleParameters;

  public constructor(
    public dialogRef: MatDialogRef<UploadDialogComponent>,
  ) {
  }

  public onFileSelected(files: FileList | null): void {
    if (files) {
      this.file = files.item(0);
    }
    this.upload();
  }

  public upload(): void {
    const fileReader: FileReader = new FileReader();
    fileReader.onloadend = (e) => {
      const fileString = fileReader.result as string;
      this.scheduleParameters = this.parseCsv(fileString);
      this.uploadState = UploadState.Uploaded;
    };
    fileReader.readAsText(this.file as Blob);
  }

  protected parseCsv(content: string): ScheduleParameters {
    const availabilities: boolean[][] = [];
    const skipabilities: Skipability[] = [];
    const people: string[] = [];
    const dates: string[] = [];

    console.log('content:', content);
    let csvToRowArray = content.split("\n");
    for (let i = 6; i < csvToRowArray.length; i++) {
      let row = csvToRowArray[i].split(";");
      if (row[0] === 'Anzahl') {
        break;
      }

      // people, skipabilities
      people.push(row[0].split(' (')[0]);
      const s = row[0].split(' (')[1].substr(0, 1);
      skipabilities.push(+s);

      // availabilities
      availabilities.push(row.slice(1).map(a => a === 'OK'));
    }
    // dates
    const months = csvToRowArray[3].split(';');
    const days = csvToRowArray[4].split(';');
    const monthMap: { [month: string]: string } =
      {
        'September': '.09.', 'Oktober': '.10.', 'November': '.11.', 'Dezember': '.12.',
        'Januar': '.01.', 'Februar': '.02.'
      };
    let currentMonth = '';
    let currentDay = '';
    let idx = '';
    for (let i = 1; i < days.length; i++) {
      if (months[i].trim() !== '') {
        console.log('months:', months[i]);
        currentMonth = monthMap[months[i].split(' ')[0]];
      }
      if (days[i].trim() !== '') {
        currentDay = days[i]
        idx = '';
      } else {
        idx = '(2)';
      }

      dates.push(currentDay + currentMonth + idx);
    }

    return {availabilities, skipabilities, people, dates};
  }
}
