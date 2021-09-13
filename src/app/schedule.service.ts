import * as _ from 'lodash';
import {Skipability} from './skipability';
import {State} from './state';

type Grid = (boolean | undefined)[][];

export class ScheduleService {
  private static readonly MATCHES_PER_DAY = 6; // TODO 8
  private static readonly MIN_SKIPABILITY = 3;

  private static peopleCount: number = 0;
  private static dateCount: number = 0;
  private static maxMatchesPerPerson: number = 0;
  private static skipabilities: Skipability[] = [];

  public static schedule(availabilities: Grid, skipabilities: Skipability[]): State[][] {
    this.skipabilities = skipabilities;
    this.peopleCount = availabilities.length;
    this.dateCount = availabilities[0].length;
    console.log('peopleCount:', this.peopleCount, 'dateCount', this.dateCount);
    this.maxMatchesPerPerson = Math.round(this.dateCount * ScheduleService.MATCHES_PER_DAY / this.peopleCount) + 1;
    console.log('Max matches per person:', this.maxMatchesPerPerson);
    console.log('Got availabilities:', JSON.stringify(availabilities));

    let grid: Grid = availabilities.map(p => p.map(d => d === true ? undefined : false));

    // Add current state to stack:
    // 1. Current grid
    // 2. The last guess, for example (13, 9): "Try person 13, date 9". null if not yet guessed.
    const stack: [Grid, [number, number, boolean] | null][] = [[grid, null]];

    // Work on stack with Depth-First-Search (DFS)
    let iterations = 0;
    const startTime = new Date();
    while (stack.length > 0) {
      if (iterations % 10000 === 0) {
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
        const lastGuessIdx = _.findIndex(possibleGuesses, g => g[0] === lastGuess[0] && g[1] === lastGuess[1] && g[2] == lastGuess[2]);
        if (lastGuessIdx + 1 === possibleGuesses.length) {
          // console.log('No more guesses possible, go up.');
          continue;
        }
        nextGuess = possibleGuesses[lastGuessIdx + 1];

        // Important part: If one cell can't hold true OR false, don't try any others.
        // It means that this branch can not be the solution!
        if (lastGuess[0] !== nextGuess[0] && lastGuess[1] !== nextGuess[1]) {
          // console.log('All possibilities tried for one cell, branch can not be satisfied.');
          continue;
        }
      }

      // 2. Do the guess & add to stack
      // console.log('Add current guess to stack:', [currentGrid, nextGuess]);
      stack.push([_.cloneDeep(currentGrid), nextGuess]);
      currentGrid[nextGuess[0]][nextGuess[1]] = nextGuess[2];
      this.propagate(currentGrid);

      // 3. Decide how to proceed
      if (this.isValid(currentGrid)) {
        if (this.isFilled(currentGrid)) {
          const diff = Math.abs((new Date()).getMilliseconds() - startTime.getMilliseconds()) / 1000.0;
          console.log('Solved succesfully in', diff, 's (', iterations, 'iterations):', currentGrid);
          return ScheduleService.placeTeams(currentGrid);
        } else {
          // console.log('Grid valid but not solved, going to next layer.');
          stack.push([_.cloneDeep(currentGrid), null]);
        }
      }
    }

    // If not successful, throw exception or something
    throw new Error('No solution found');
  }

  private static calculateGuesses(grid: Grid): [number, number, boolean][] {
    // Calculate [p, d, score] per cell
    const guesses: [number, number, number][] = [];
    for (let p = 0; p < this.peopleCount; p++) {
      for (let d = 0; d < this.dateCount; d++) {
        // If not yet filled, we can guess
        if (grid[p][d] === undefined) {
          const score = this.getCellScore(grid, p, d);
          guesses.push([p, d, score]);
        }
      }
    }
    // console.log('Calculated guesses:', JSON.stringify(guesses), 'grid:', JSON.stringify(grid));

    // Sort guesses by score and only return coordinates
    const best = guesses.sort((c1, c2) => c1[2] - c2[2])
    .map(c => [c[0], c[1]])[0];
    return [[best[0], best[1], true], [best[0], best[1], false]]
  }

  public static getCellScore(grid: Grid, p: number, d: number): number {
    // 1. Calculate person-index
    const totalPossible = _.sum(grid[p].map(d => d !== false ? 1 : 0));
    // let score = 1.0 / totalPossible; // cap for this.maxMatchesPerPerson?
    let score = -totalPossible;

    // TODO factor in already set fields?
    const totalTrue = _.sum(grid[p].map(d => d === true ? 1 : 0));
    // const totalUndefined = _.sum(grid[p].map(d => d === undefined ? 1 : 0));
    // score *= 1 - totalTrue / (totalTrue + totalUndefined);
    score += totalTrue;

    // 2. Calculate date-index
    let dateScore = 0;
    for (let person of grid) {
      dateScore += person[d] !== false ? 1 : 0;
    }
    // score *= 1.0 / dateScore;
    score -= dateScore;

    return score;
  }

  private static propagate(grid: Grid): Grid {
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
    for (let p = 0; p < this.peopleCount; p++) {
      for (let d = 0; d < this.dateCount; d++) {
        if (grid[p][d] === true) {
          if (d > 0) {
            grid[p][d - 1] = false;
          }
          if (d < this.dateCount - 1) {
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

  private static isValid(grid: Grid): boolean {
    // 1. <= 8 players per date (and with 8 players a given skipability)
    for (let d = 0; d < this.dateCount; d++) {
      let dateCount = _.sum(grid.map(p => p[d] === true ? 1 : 0));
      if (dateCount > ScheduleService.MATCHES_PER_DAY) {
        // console.log('Invalid: Too many matches for day d=', d);
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
          // console.log('Invalid: Skipability not given');
          return false;
        }
      }
    }

    // 2. 8 open (possible) fields per date
    for (let d = 0; d < this.dateCount; d++) {
      let possibleDateCount = _.sum(grid.map(p => p[d] !== false ? 1 : 0));
      if (possibleDateCount < this.MATCHES_PER_DAY) {
        // console.log('Invalid: Date cannot have 8 matches, d=', d);
        return false;
      }
    }

    // 3. No adjacent dates
    for (let p = 0; p < this.peopleCount; p++) {
      for (let d = 0; d < this.dateCount; d++) {
        if (grid[p][d] === true) {
          if ((d > 0 && grid[p][d - 1] === true) || (d < this.dateCount - 1 && grid[p][d + 1] === true)) {
            // console.log('Invalid: Adjacent matches for p=', p, 'd=', d);
            return false;
          }
        }
      }
    }

    // 4. No player has more than maximum amount of matches
    for (let p = 0; p < this.peopleCount; p++) {
      let matches = _.sum(grid[p].map(d => d === true ? 1 : 0));
      if (matches > this.maxMatchesPerPerson) {
        // console.log('Invalid: Too many matches for p=', p);
        return false;
      }
    }

    // 5. TODO player has not enough matches

    return true;
  }

  protected static isFilled(grid: Grid): boolean {
    return grid.every(p => p.every(d => d !== undefined));
  }

  private static placeTeams(grid: Grid): State[][] {
    // TODO
    return grid.map(p => p.map(d => d === true ? State.TeamOne : State.Unplanned));
  }
}
