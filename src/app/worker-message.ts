export class WorkerMessage {
  public constructor(
    public status: WorkerStatus,
    public content: string) {
  }
}

export enum WorkerStatus {
  IDLE, // After init
  SOLVING, // Solving in progress - content will contain progress
  SOLVED, // Solved - content will contain solution
  UNSOLVABLE, // No solution found
}
