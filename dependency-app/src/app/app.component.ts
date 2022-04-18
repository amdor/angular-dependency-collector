import { Component } from '@angular/core';
import { findAllBases } from 'matroidjs';
import { depMatroid } from './dependency-matroid';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'dependency-app';
  private matroid = depMatroid;

  constructor() {
    console.log(findAllBases(this.matroid));
  }
}
