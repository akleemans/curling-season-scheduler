import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatRadioModule} from '@angular/material/radio';
import {MatTableModule} from '@angular/material/table';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {AppComponent} from './app.component';
import {UploadDialogComponent} from './upload-dialog/upload-dialog.component';
import {MatSelectModule} from "@angular/material/select";
import {HttpClientModule} from "@angular/common/http";

@NgModule({
  declarations: [
    AppComponent,
    UploadDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatRadioModule,
    FormsModule,
    MatSelectModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
