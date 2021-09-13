import {Injectable} from '@angular/core';
import * as _ from 'lodash';
import {Skipability} from './skipability';
import {State} from './state';

type Grid = (boolean | undefined)[][];

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private static readonly MATCHES_PER_DAY = 8;
  private static readonly MIN_SKIPABILITY = 3;

  private peopleCount: number = 0;
  private dateCount: number = 0;
  private maxMatchesPerPerson: number = 0;
  private skipabilities: Skipability[] = [];

  public schedule(availabilities: Grid, skipabilities: Skipability[]): State[][] {
    this.skipabilities = skipabilities;
    this.peopleCount = availabilities.length;
    this.dateCount = availabilities[0].length;
    this.maxMatchesPerPerson = Math.round(this.dateCount * ScheduleService.MATCHES_PER_DAY / this.peopleCount);
    console.log('Max matches per person:', this.maxMatchesPerPerson);
    console.log('Got availabilities:', JSON.stringify(availabilities));

    let grid: Grid = availabilities.map(p => p.map(d => d === true ? undefined : false));

    // Add current state to stack:
    // 1. Current grid
    // 2. The last guess, for example (13, 9): "Try person 13, date 9". null if not yet guessed.
    const stack: [Grid, [number, number] | null][] = [[grid, null]];

    // Work on stack with Depth-First-Search (DFS)
    let iterations = 0;
    const startTime = new Date();
    while (stack.length > 0) {
      if (iterations % 1000 === 0) {
        console.log('>> Iteration ', iterations, 'stack size:', stack.length, 'stack:', stack.map(i => i[1]?.toString()));
      }
      iterations += 1;

      // 1. Pop state and calculate next guess
      const item = stack.pop();
      const currentGrid = item![0];
      const lastGuess = item![1];
      const possibleGuesses = this.calculateGuesses(currentGrid);

      let nextGuess;
      if (lastGuess === null) {
        // console.log('Starting to guess on layer.');
        nextGuess = possibleGuesses[0];
      } else {
        const lastGuessIdx = _.findIndex(possibleGuesses, g => g[0] === lastGuess[0] && g[1] === lastGuess[1]);
        if (lastGuessIdx + 1 === possibleGuesses.length) {
          // console.log('No more guesses possible, go up.');
          continue;
        }
        nextGuess = possibleGuesses[lastGuessIdx + 1];
      }

      // 2. Do the guess & add to stack
      // console.log('Add current guess to stack:', [candidates, nextGuess]);
      stack.push([currentGrid, nextGuess]);
      currentGrid[nextGuess[0]][nextGuess[1]] = true;
      this.propagate(currentGrid);

      // 3. Decide how to proceed
      if (this.isValid(currentGrid)) {
        if (this.isFilled(currentGrid)) {
          const diff = Math.abs((new Date()).getMilliseconds() - startTime.getMilliseconds()) / 1000.0;
          console.log('Solved succesfully in', diff, 's (', iterations, 'iterations):', currentGrid);
          return ScheduleService.placeTeams(currentGrid);
        } else {
          // console.log('Grid valid but not solved, going to next layer.');
          stack.push([currentGrid.splice(0), null]);
        }
      }
    }

    // If not successful, throw exception or something
    throw new Error('No solution found');
  }

  private static placeTeams(grid: Grid): State[][] {
    // TODO
    return grid.map(p => p.map(d => d === true ? State.TeamOne : State.Unplanned));
  }

  private calculateGuesses(grid: Grid): [number, number][] {
    // Calculate [score, p, d] per cell
    const guesses: [number, number, number][] = [];
    for (let p = 0; p < this.peopleCount; p++) {
      for (let d = 0; d < this.dateCount; d++) {
        // If not yet filled, we can guess
        if (grid[p][d] === undefined) {
          const score = this.getCellScore(grid, p, d);
          guesses.push([score, p, d]);
        }
      }
    }
    // console.log('Calculated guesses:', guesses);

    // Sort guesses by score and only return coordinates
    return guesses.sort((c1, c2) => c1[0] - c2[0])
    .map(c => [c[1], c[2]]);
  }

  public getCellScore(grid: Grid, p: number, d: number): number {
    // 1. Calculate person-index
    let score = 1.0 / _.sum(grid[p].map(d => d === false ? 0 : 1));

    // 2. Calculate date-index
    // TODO
    /*
    let dateScore = 0;
    for (let person of grid) {
      dateScore += person[d] === false ? 0 : 1;
    }
    score *= 1.0 / dateScore;
    */

    return score;
  }

  private propagate(grid: Grid): Grid {
    // 1. Complete days with 8 fields
    for (let d = 0; d < grid[0].length; d++) {
      let dateCount = _.sum(grid.map(p => p[d] === true ? 1 : 0));
      if (dateCount === ScheduleService.MATCHES_PER_DAY) {
        grid.forEach(p => {
          if (p[d] !== true) {
            p[d] = false;
          }
        });
      }
    }

    // 2. Remove adjacent dates
    for (let p = 0; p < grid.length; p++) {
      for (let d = 0; d < grid[0].length; d++) {
        if (grid[p][d] === true) {
          if (d > 0) {
            grid[p][d - 1] = false;
          }
          if (d < grid[0].length - 1) {
            grid[p][d + 1] = false;
          }
        }
      }
    }

    // 3. "Complete" players with maximum number of matches
    for (let player of grid) {
      let matches = _.sum(player.map(d => d === true ? 1 : 0));
      if (matches > this.maxMatchesPerPerson) {
        for (let d = 0; d < this.dateCount; d++) {
          if (player[d] === undefined) {
            player[d] = false;
          }
        }
      }
    }

    return grid;
  }

  private isValid(grid: Grid): boolean {
    // 1. <= 8 players per date (and with 8 players a given skipability)
    for (let d = 0; d < this.dateCount; d++) {
      let dateCount = _.sum(grid.map(p => p[d] === true ? 1 : 0));
      if (dateCount > ScheduleService.MATCHES_PER_DAY) {
        return false;
      } else if (dateCount === ScheduleService.MATCHES_PER_DAY) {
        // Check skipability
        let skipCount = 0;
        for (let p = 0; p < this.peopleCount; p++) {
          // Count skipability for the people playing
          if (grid[p][d] === true) {
            skipCount += this.skipabilities[p];
          }
        }
        if (skipCount < ScheduleService.MIN_SKIPABILITY) {
          return false;
        }
      }
    }

    // 2. 8 open (possible) fields per date
    for (let d = 0; d < this.dateCount; d++) {
      let possibleDateCount = _.sum(grid.map(p => p[d] !== false ? 1 : 0));
      if (possibleDateCount < 8) {
        return false;
      }
    }

    // 3. No adjacent dates
    // TODO

    // 4. No player has more than maximum amount of matches
    for (let player of grid) {
      let matches = _.sum(player.map(d => d === true ? 1 : 0));
      if (matches > this.maxMatchesPerPerson) {
        return false;
      }
    }

    return true;
  }

  protected isFilled(grid: Grid): boolean {
    return grid.every(p => p.every(d => d === true));
  }
}
