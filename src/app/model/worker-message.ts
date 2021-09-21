export class WorkerMessage {
  public constructor(
    public status: WorkerStatus,
    public score: number,
    public content: string) {
  }
}

export enum WorkerStatus {
  SOLVING, // Solving in progress - content will contain progress
  SOLVED, // Solved - content will contain solution
  UNSOLVABLE, // No solution found
}
