import { Component } from '@angular/core';
import { findBase } from 'matroidjs';
import { depMatroids } from './dependency-matroid';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'dependency-app';
    private matroids = depMatroids;

    constructor() {
        setTimeout(() => {
            for (const matroid of this.matroids) {
                const base = findBase(matroid);
                console.log(base);
            }
        }, 2000);
    }
}
