import { describe, expect, it } from 'vitest';
import { Semaphore } from '../src/semaphore';

describe('Semaphore', () => {
  it('limits concurrency and queues FIFO', async () => {
    const sem = new Semaphore(2);
    let running = 0;
    let max = 0;
    const order: number[] = [];
    const task = (i: number) =>
      sem.run(async () => {
        order.push(i);
        running++;
        max = Math.max(max, running);
        await new Promise((r) => setTimeout(r, 20));
        running--;
      });
    await Promise.all([0, 1, 2, 3, 4].map(task));
    expect(max).toBe(2);
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });

  it('releases on error', async () => {
    const sem = new Semaphore(1);
    await expect(sem.run(async () => { throw new Error('x'); })).rejects.toThrow();
    await expect(sem.run(async () => 5)).resolves.toBe(5);
  });
});
