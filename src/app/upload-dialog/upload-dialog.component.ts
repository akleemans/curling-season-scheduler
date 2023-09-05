import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {ScheduleParameters} from '../model/schedule-parameters';
import {Skipability} from '../model/skipability';
import {AVAILABLE_SKIPABILITIES} from "./available-skipabilities";

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
  public availableSkipabilities: { [key: string]: number } = AVAILABLE_SKIPABILITIES;

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
    const skipabilityFromHash: boolean[] = [];
    const people: string[] = [];
    const dates: string[] = [];
    const startRow = 2; // = (sourceType === SourceType.Doodle ? 6 : 2);
    const availableTerm = 'Ja'; // = (sourceType === SourceType.Doodle ? 'OK' : 'Ja');
    const maybeTerm = 'Unter Vorbehalt';

    console.log('content:', content);
    let csvToRowArray = content.split("\n");
    console.log('Loaded', csvToRowArray.length, 'rows');

    for (let i = startRow; i < csvToRowArray.length; i++) {
      let row = csvToRowArray[i].replace(/"/g, '').split(',');
      if (row[0] === 'Anzahl' || row.length <= 1) {
        break;
      }

      // people
      const person = row[0];
      people.push(person);

      // skipabilities
      const hash = this.stringToHash(person);
      let skipability = 0;
      let hashValue: number | undefined = this.availableSkipabilities[hash];
      if (hashValue !== undefined) {
        skipability = this.availableSkipabilities[hash];
      }
      skipabilities.push(skipability);
      skipabilityFromHash.push(hashValue !== undefined);

      // availabilities
      availabilities.push(row.slice(1)
        .filter(cell => cell.length > 1)
        .map(a => a.includes(availableTerm) || a.includes(maybeTerm)));
    }
    console.log('availabilities:', availabilities);

    // dates
    // Nuudel format:
    // ;26.09.2022;28.09.2022;03.10.2022
    // ;18:00-19:30;19:00-20:30;18:00-19:30
    const days = csvToRowArray[0].replace(/"/g, '').split(',');

    for (let i = 1; i < days.length; i++) {
      let date = days[i].trim();
      if (date.length <= 1) {
        break;
      }
      // Mark multiple matches on same date
      if (i > 1 && date === days[i - 1]) {
        date = date + ' (2)';
      }
      dates.push(date);
    }


    return {availabilities, skipabilities, people, dates, skipabilityFromHash};
  }

  private stringToHash(s: string): string {
    let hash = 0;
    if (s.length == 0) {
      return '' + hash;
    }
    for (let i = 0; i < s.length; i++) {
      let char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    if (hash < 0) {
      hash = -hash;
    }
    return '' + hash;
  }
}
