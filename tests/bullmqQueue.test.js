const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { createQueue, getActiveQueues, closeAllQueues } = require('../src/queues/core/base.queue');
const { createWorker, getActiveWorkers, closeAllWorkers } = require('../src/queues/core/base.worker');
const { garmentAiQueue, enqueueGarmentJob, GARMENT_AI_QUEUE_NAME } = require('../src/queues/garmentAi/garmentAi.queue');
const { initGarmentAiWorker } = require('../src/queues/garmentAi/garmentAi.worker');
const { isRedisAvailable, getRedisOptions, closeRedisConnection } = require('../src/config/redis.config');

test('Redis & BullMQ Reusable Subsystem Test Suite', async (t) => {
  t.after(async () => {
    await closeAllWorkers();
    await closeAllQueues();
    await closeRedisConnection();
    setTimeout(() => process.exit(0), 100);
  });
  await t.test('1. Redis Config provides valid BullMQ connection parameters', () => {
    const opts = getRedisOptions();
    assert.strictEqual(opts.maxRetriesPerRequest, null, 'maxRetriesPerRequest must be null for BullMQ');
    assert.strictEqual(opts.enableReadyCheck, false, 'enableReadyCheck must be false for BullMQ');
    assert.ok(typeof opts.retryStrategy === 'function', 'Must have retryStrategy defined');
  });

  await t.test('2. Base Queue Factory creates queues with retry & retention defaults', () => {
    const testQueueName = 'test-reusable-queue';
    const queue = createQueue(testQueueName);
    assert.strictEqual(queue.name, testQueueName);
    assert.strictEqual(queue.defaultJobOptions.attempts, 3, 'Default attempts should be 3');
    assert.strictEqual(queue.defaultJobOptions.backoff.type, 'exponential', 'Backoff should be exponential');
    assert.strictEqual(queue.defaultJobOptions.backoff.delay, 5000, 'Backoff initial delay should be 5000ms');
    assert.ok(getActiveQueues().has(testQueueName));
  });

  await t.test('3. Base Worker Factory registers workers with custom concurrency', () => {
    const testWorkerQueue = 'test-reusable-worker-queue';
    const dummyProcessor = async () => true;
    const worker = createWorker(testWorkerQueue, dummyProcessor, { concurrency: 4 });
    assert.strictEqual(worker.name, testWorkerQueue);
    assert.strictEqual(worker.opts.concurrency, 4, 'Concurrency should match configured value');
    assert.ok(getActiveWorkers().has(testWorkerQueue));
  });

  await t.test('4. Garment AI Queue is registered with proper name and singleton instance', () => {
    assert.strictEqual(GARMENT_AI_QUEUE_NAME, 'garment-ai-queue');
    assert.ok(garmentAiQueue, 'garmentAiQueue must be instantiated');
    assert.strictEqual(garmentAiQueue.name, 'garment-ai-queue');
  });

  await t.test('5. Garment AI Worker initializes properly with lockDuration & concurrency', () => {
    const worker = initGarmentAiWorker();
    assert.ok(worker, 'garmentAiWorker must be created');
    assert.strictEqual(worker.name, 'garment-ai-queue');
    assert.strictEqual(worker.opts.lockDuration, 180000, 'lockDuration should be 180s (3 mins)');
  });

  await t.test('6. Health check reports Redis status with graceful fallback flag', () => {
    const available = isRedisAvailable();
    console.log(`[Test] Redis online status: ${available} (Graceful fallback active if false)`);
    assert.strictEqual(typeof available, 'boolean');
  });
});
