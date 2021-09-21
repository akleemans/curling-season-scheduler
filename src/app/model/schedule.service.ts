import * as _ from 'lodash';
import {CellState} from './cell-state';
import {Skipability} from './skipability';

export type Grid = (boolean | undefined)[][];
export type UpdateFunction = (score: number, schedule: CellState[][]) => void;

export class ScheduleService {
  private static readonly MATCHES_PER_DAY = 8;
  private static readonly MIN_SKIPABILITY = 3;
  private static readonly MIN_MATCHES_PER_PERSON = 5;

  private static peopleCount: number = 0;
  private static dateCount: number = 0;
  private static maxMatchesPerPerson: number = 0;
  private static skipabilities: Skipability[] = [];
  private static dates: string[] = [];
  private static minMatchesPerPerson: number[] = [];

  private static bestMinimumScore: number = 0;
  private static sendUpdate: UpdateFunction;

  public static schedule(availabilities: Grid, skipabilities: Skipability[], dates: string[], sendUpdate: UpdateFunction): CellState[][] {
    this.skipabilities = skipabilities;
    this.dates = dates;
    this.sendUpdate = sendUpdate;
    this.peopleCount = availabilities.length;
    this.dateCount = availabilities[0].length;
    console.log('peopleCount:', this.peopleCount, 'dateCount', this.dateCount);
    this.maxMatchesPerPerson = Math.round(this.dateCount * ScheduleService.MATCHES_PER_DAY / this.peopleCount) + 1;
    console.log('Max matches per person:', this.maxMatchesPerPerson);
    // Calculate min matches per person
    for (let p of availabilities) {
      this.minMatchesPerPerson.push(Math.min(_.sum(p.map(d => d === true ? 1 : 0)), this.MIN_MATCHES_PER_PERSON));
    }
    console.log('this.minMatchesPerPerson:', this.minMatchesPerPerson);

    const initialGrid: Grid = availabilities.map(p => p.map(d => d === true ? undefined : false));

    // Add current state to stack:
    // 1. Current grid
    // 2. The last guess, for example (13, 9): "Try person 13, date 9". null if not yet guessed.
    const stack: [Grid, [number, number, boolean] | null][] = [[initialGrid, null]];

    // Work on stack with Depth-First-Search (DFS)
    let iterations = 0;
    let minStack = 0;
    const startTime = new Date();
    while (stack.length > 0) {
      if (iterations % 10000 === 0) {
        console.log('>> Iteration', iterations, 'minStack:', minStack, 'current stack size:', stack.length, 'stack:', stack.map(i => i[1]?.toString()));
        minStack = 10000;
      }
      if (stack.length < minStack) {
        minStack = stack.length;
      }

      iterations += 1;

      // 1. Pop state and calculate next guess
      const item = stack.pop();
      const currentGrid = item![0];
      const lastGuess = item![1];
      const possibleGuesses = this.calculateGuesses(currentGrid);
      // console.log('Calculated', possibleGuesses.length, 'possibleGuesses');

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

        // TODO remove - only one field is added anyway, so it should already continue above
        /*
        // Important part: If one cell can't hold true OR false, don't try any others.
        // It means that this branch can not be the solution!
        if (lastGuess[0] !== nextGuess[0] || lastGuess[1] !== nextGuess[1]) {
          console.log('All possibilities tried for one cell, branch can not be satisfied.');
          continue;
        }
        */
      }

      // 2. Do the guess & add to stack
      // console.log('Add current guess to stack:', [currentGrid, nextGuess]);
      stack.push([_.cloneDeep(currentGrid), nextGuess]);
      currentGrid[nextGuess[0]][nextGuess[1]] = nextGuess[2];
      this.propagate(currentGrid);

      // 3. Decide how to proceed
      if (this.isValid(currentGrid)) {
        if (this.isFilled(currentGrid)) {
          // const diff = Math.abs((new Date()).getMilliseconds() - startTime.getMilliseconds()) / 1000.0;
          // console.log('Solved succesfully in', diff, 's (', iterations, 'iterations):', currentGrid);
          const currentScore = this.getScore(currentGrid)
          if (this.bestMinimumScore > currentScore) {
            this.bestMinimumScore = currentScore;
            this.sendUpdate(currentScore, ScheduleService.placeTeams(currentGrid));
          }
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
    const sortedGuesses: [number, number, boolean][] = [];
    guesses.sort((c1, c2) => c2[2] - c1[2])
    .map(c => [c[0], c[1]]).forEach(guess => {
      // Only add one cell
      if (sortedGuesses.length === 0) {
        sortedGuesses.push([guess[0], guess[1], true]);
        sortedGuesses.push([guess[0], guess[1], false]);
      }
    });
    return sortedGuesses;
  }

  public static getCellScore(grid: Grid, p: number, d: number): number {
    // 1. Calculate person-index
    const totalPossible = _.sum(grid[p].map(d => d !== false ? 1 : 0));
    let score = -Math.min(totalPossible, this.maxMatchesPerPerson + 2);

    // 2. Calculate date-index
    let dateScore = 0;
    for (let person of grid) {
      dateScore += person[d] !== false ? 1 : 0;
    }
    score -= dateScore;

    return score;
  }

  private static propagate(grid: Grid): Grid {
    // 1. Complete days with 8 matches - set rest to false
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

    // 2. Complete with 8 POSSIBLE matches - they all must be true
    for (let d = 0; d < grid[0].length; d++) {
      let possibleDateCount = _.sum(grid.map(p => p[d] !== false ? 1 : 0));
      if (possibleDateCount === ScheduleService.MATCHES_PER_DAY) {
        grid.forEach(p => {
          if (p[d] === undefined) {
            p[d] = true;
          }
        });
      }
    }

    // 3. Remove adjacent dates
    for (let p = 0; p < this.peopleCount; p++) {
      for (let d = 0; d < this.dateCount; d++) {
        if (grid[p][d] === true) {
          if (d > 0 && this.isNear(d, d - 1)) {
            grid[p][d - 1] = false;
          }
          if (d < this.dateCount - 1 && this.isNear(d, d + 1)) {
            grid[p][d + 1] = false;
          }
        }
      }
    }

    // 4. "Complete" players with maximum number of matches
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

    // 5. Complete players with only minimum amount of matches possible
    for (let p = 0; p < this.peopleCount; p++) {
      let possibleMatches = _.sum(grid[p].map(d => d !== false ? 1 : 0));
      if (possibleMatches === this.minMatchesPerPerson[p]) {
        for (let d = 0; d < this.dateCount; d++) {
          if (grid[p][d] === undefined) {
            grid[p][d] = true;
          }
        }
      }
    }

    return grid;
  }

  // Check if two dates are near enough
  private static isNear(d0: number, d1: number): boolean {
    const date0str = this.dates[d0].split('(')[0].trim();
    const date1str = this.dates[d1].split('(')[0].trim();

    /*
    const oneDayMs = 24 * 60 * 60 * 1000;
    const parts0 = date0str.split('.');
    const parts1 = date0str.split('.');
    const date0 = new Date(+('20' + parts0[2]), +parts0[1], +parts0[0]);
    const date1 = new Date(+('20' + parts1[2]), +parts1[1], +parts1[0]);
    const days = Math.round(Math.abs((date0 - date1) / oneDayMs));
    */

    // TODO check
    // return date0str === date1str;
    return true;
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
          // console.log('Invalid: Skipability not given for d=', d);
          return false;
        }
      }
    }

    // 2. 8 open (possible) fields per date
    for (let d = 0; d < this.dateCount; d++) {
      let possibleDateCount = _.sum(grid.map(p => p[d] !== false ? 1 : 0));
      if (possibleDateCount < this.MATCHES_PER_DAY) {
        // console.log('Invalid: Date cannot have 8 matches (only ', possibleDateCount, '), d=', d);
        return false;
      }
    }

    // 3. No adjacent dates
    for (let p = 0; p < this.peopleCount; p++) {
      for (let d = 0; d < this.dateCount; d++) {
        if (grid[p][d] === true) {
          if ((d > 0 && grid[p][d - 1] === true && this.isNear(d, d - 1))
            || (d < this.dateCount - 1 && grid[p][d + 1] === true && this.isNear(d, d + 1))) {
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

    // 5. Player can not have enough matches
    for (let p = 0; p < this.peopleCount; p++) {
      let possibleMatches = _.sum(grid[p].map(d => d !== false ? 1 : 0));
      if (possibleMatches < this.minMatchesPerPerson[p]) {
        // console.log('Invalid: Not enough matches for p=', p);
        return false;
      }
    }

    return true;
  }

  protected static isFilled(grid: Grid): boolean {
    return grid.every(p => p.every(d => d !== undefined));
  }

  // Calculate score
  protected static getScore(grid: Grid): number {
    let score = 0;
    // 1. Not too many outliers
    const minMatches = Math.floor(this.dateCount * ScheduleService.MATCHES_PER_DAY / this.peopleCount);
    const maxMatches = minMatches + 1;
    score += _.sum(grid.map(p => {
      const score = _.sum(p.map(d => d ? 1 : 0));
      return (score === minMatches || score === maxMatches) ? 1 : 0;
    }));

    // 2. Not too many matches in same week
    score += _.sum(grid.map(player => {
      let s = 0;
      for (let i = 0; i < player.length - 2; i++) {
        if (player[i] && player[i + 2] && this.inSameWeek(this.dates[i], this.dates[i + 2])) {
          s += 1;
        }
      }
      return s;
    }));

    // 3. Evenly distributed matches
    score += _.sum(grid.map(p => {
      let data: number[] = [];
      for (let i = 0; i < p.length; i++) {
        if (p[i]) {
          data.push(i);
        }
      }
      return this.getDistributionScore(data, this.dateCount);
    }));

    return score;
  }

  public static inSameWeek(d0: string, d1: string): boolean {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const parts0 = d0.split('.');
    const parts1 = d1.split('.');
    const date0 = new Date(+parts0[2], +parts0[1], +parts0[0]);
    const date1 = new Date(+parts1[2], +parts1[1], +parts1[0]);

    return (date0.getMilliseconds() - date0.getDay() * oneDayMs) ===
      (date1.getMilliseconds() - date1.getDay() * oneDayMs);
  }

  public static getDistributionScore(data: number[], maxValue: number): number {
    const distance = maxValue / data.length
    let error = 0;
    for (let i = 0; i < data.length - 1; i++) {
      // TODO use ** 2 ?
      error += Math.abs(Math.abs(data[1] - data[0]) - distance);
    }
    return error / (data.length - 1);
  }

  private static placeTeams(grid: Grid): CellState[][] {
    // TODO
    return grid.map(p => p.map(d => d === true ? CellState.TeamOne : CellState.Unplanned));
  }
}
