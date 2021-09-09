import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';

@Component({
  selector: 'app-upload-dialog',
  templateUrl: './upload-dialog.component.html',
  styleUrls: ['./upload-dialog.component.scss']
})
export class UploadDialogComponent {
  private file: File | null | undefined;

  public constructor(
    public dialogRef: MatDialogRef<UploadDialogComponent>,
  ) {
  }

  public onFileSelected(files: FileList | null): void {
    if (files) {
      this.file = files.item(0);
    }
  }

  public upload(): void {
    const fileReader: FileReader = new FileReader();
    fileReader.onloadend = (e) => {
      const fileString = fileReader.result as string;
      this.dialogRef.close(fileString);
    };
    fileReader.readAsText(this.file as Blob);
  }
}
