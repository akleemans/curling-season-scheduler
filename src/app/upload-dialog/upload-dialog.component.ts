import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {ScheduleParameters} from '../model/schedule-parameters';
import {Skipability} from '../model/skipability';

enum UploadState {
  Initial,
  Uploading,
  Uploaded
}

enum SourceType {
  Nuudel = 'nuudel',
  Doodle = 'doodle'
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
  public sourceType = SourceType.Nuudel;

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
      this.scheduleParameters = this.parseCsv(fileString, this.sourceType);
      this.uploadState = UploadState.Uploaded;
    };
    fileReader.readAsText(this.file as Blob);
  }

  protected parseCsv(content: string, sourceType: SourceType): ScheduleParameters {
    const availabilities: boolean[][] = [];
    const skipabilities: Skipability[] = [];
    const people: string[] = [];
    const dates: string[] = [];
    const startRow = (sourceType === SourceType.Doodle ? 6 : 2);
    const availableTerm = (sourceType === SourceType.Doodle ? 'OK' : 'Ja');

    // console.log('content:', content);
    let csvToRowArray = content.split("\n");
    for (let i = startRow; i < csvToRowArray.length; i++) {
      let row = csvToRowArray[i].split(";");
      if (row[0] === 'Anzahl' || row.length <= 1) {
        break;
      }

      // people, skipabilities
      people.push(row[0].split(' (')[0]);
      const s = row[0].split(' (')[1].substr(0, 1);
      skipabilities.push(+s);

      // availabilities
      availabilities.push(row.slice(1).map(a => a.includes(availableTerm)));
    }

    // dates
    if (sourceType === SourceType.Doodle) {
      const months = csvToRowArray[3].split(';');
      const days = csvToRowArray[4].split(';');
      // TODO should probably be updated
      const monthMap: { [month: string]: string } =
        {
          'September': '.09.21', 'Oktober': '.10.21', 'November': '.11.21', 'Dezember': '.12.21',
          'Januar': '.01.22', 'Februar': '.02.22'
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
          currentDay = days[i].split(' ')[1].trim();
          idx = '';
        } else {
          idx = '(2)';
        }

        dates.push(currentDay + currentMonth + idx);
      }
    } else {
      // Nuudel format:
      // ;26.09.2022;28.09.2022;03.10.2022
      // ;18:00-19:30;19:00-20:30;18:00-19:30
      const days = csvToRowArray[0].split(';');

      for (let i = 1; i < days.length; i++) {
        let date = days[i].trim();
        if (i > 1 && date === days[i-1]) {
          date = date + ' (2)';
        }
        dates.push(date);
      }
    }

    return {availabilities, skipabilities, people, dates};
  }
}
