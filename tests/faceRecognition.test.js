const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const faceAIClient = require('../src/services/faceAI/faceAI.client');
const faceAIService = require('../src/services/faceAI/faceAI.service');
const { ERROR_CODES } = require('../src/modules/faceRecognition/faceRecognition.constants');

describe('Face AI Engine & Similarity Math Tests', () => {
  before(async () => {
    // Initialize Face AI Client
    await faceAIClient.initialize();
  });

  it('should initialize TensorFlow WASM backend and load models', () => {
    assert.equal(faceAIClient.isInitialized, true);
  });

  it('should calculate exact Euclidean distance between identical vectors as 0', () => {
    const vec1 = Array(128).fill(0.25);
    const vec2 = Array(128).fill(0.25);
    const dist = faceAIClient.calculateEuclideanDistance(vec1, vec2);
    assert.equal(dist, 0);
  });

  it('should calculate exact Cosine Similarity between identical vectors as 1.0', () => {
    const vec1 = Array(128).fill(0.25);
    const vec2 = Array(128).fill(0.25);
    const cosSim = faceAIClient.calculateCosineSimilarity(vec1, vec2);
    assert.ok(Math.abs(cosSim - 1.0) < 0.0001);
  });

  it('should correctly convert Euclidean distance to similarity score', () => {
    const perfectScore = faceAIClient.distanceToSimilarityScore(0.0);
    assert.equal(perfectScore, 1.0);

    const midScore = faceAIClient.distanceToSimilarityScore(0.50);
    assert.ok(midScore > 0.45 && midScore < 0.85);

    const farScore = faceAIClient.distanceToSimilarityScore(1.0);
    assert.equal(farScore, 0.0);
  });

  it('should identify a match when distance <= threshold', () => {
    const refEmbedding = Array(128).fill(0.1);
    const detectedFaces = [
      {
        faceIndex: 0,
        confidence: 0.95,
        boundingBox: { x: 50, y: 50, width: 100, height: 100 },
        embedding: Array(128).fill(0.12), // Very close to refEmbedding
      },
      {
        faceIndex: 1,
        confidence: 0.92,
        boundingBox: { x: 200, y: 50, width: 100, height: 100 },
        embedding: Array(128).fill(0.8), // Different person
      },
    ];

    const result = faceAIService.compareFaces(refEmbedding, detectedFaces, 0.6);

    assert.equal(result.matched, true);
    assert.equal(result.facesDetected, 2);
    assert.equal(result.matchedFaces.length, 1);
    assert.equal(result.matchedFaces[0].faceIndex, 0);
    assert.ok(result.matchedFaces[0].distance < 0.6);
    assert.ok(result.matchedFaces[0].boundingBox.x === 50);

    // Ensure raw embeddings are NOT present in output
    assert.equal(result.matchedFaces[0].embedding, undefined);
    assert.equal(result.allDetectedFaces[0].embedding, undefined);
  });

  it('should return matched: false when no faces match the reference embedding', () => {
    const refEmbedding = Array(128).fill(0.1);
    const detectedFaces = [
      {
        faceIndex: 0,
        confidence: 0.91,
        boundingBox: { x: 100, y: 100, width: 120, height: 120 },
        embedding: Array(128).fill(0.9), // Far distance
      },
    ];

    const result = faceAIService.compareFaces(refEmbedding, detectedFaces, 0.6);
    assert.equal(result.matched, false);
    assert.equal(result.facesDetected, 1);
    assert.equal(result.matchedFaces.length, 0);
  });
});

describe('Image Tensor & Detection Pipeline', () => {
  it('should process a blank image and return 0 detected faces without crashing', async () => {
    const blankImageBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg()
      .toBuffer();

    const faces = await faceAIClient.detectFacesAndEmbeddings(blankImageBuffer);
    assert.ok(Array.isArray(faces));
    assert.equal(faces.length, 0);
  });

  it('should throw PROFILE_FACE_NOT_FOUND when validating a profile image with 0 faces', async () => {
    const blankImageBuffer = await sharp({
      create: {
        width: 250,
        height: 250,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    await assert.rejects(
      async () => {
        await faceAIService.extractReferenceFace(blankImageBuffer);
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        assert.ok(err.message.includes('No face detected'));
        return true;
      }
    );
  });

  it('should throw INVALID_IMAGE when passing non-existent file path', async () => {
    await assert.rejects(
      async () => {
        await faceAIService.detectGalleryFaces('/non/existent/path/photo.jpg');
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  it('should never expose raw embedding vector in compareFaces response', () => {
    const ref = Array(128).fill(0.2);
    const galleryFaces = [
      {
        faceIndex: 0,
        confidence: 0.98,
        boundingBox: { x: 10, y: 10, width: 80, height: 80 },
        embedding: Array(128).fill(0.2),
      },
    ];

    const result = faceAIService.compareFaces(ref, galleryFaces, 0.6);
    const jsonString = JSON.stringify(result);

    // Verify embedding array does not exist in serialized output
    assert.equal(jsonString.includes('embedding'), false);
    assert.equal(result.matched, true);
    assert.equal(result.matchedFaces[0].confidence, 0.98);
  });

  it('should properly support custom distance threshold override', () => {
    const ref = Array(128).fill(0.1);
    const galleryFaces = [
      {
        faceIndex: 0,
        confidence: 0.9,
        boundingBox: { x: 20, y: 20, width: 100, height: 100 },
        embedding: Array(128).fill(0.14), // Euclidean distance ~ 0.452
      },
    ];

    // With strict threshold of 0.3, it should NOT match
    const strictResult = faceAIService.compareFaces(ref, galleryFaces, 0.3);
    assert.equal(strictResult.matched, false);
    assert.equal(strictResult.matchedFaces.length, 0);

    // With normal threshold of 0.6, it SHOULD match
    const standardResult = faceAIService.compareFaces(ref, galleryFaces, 0.6);
    assert.equal(standardResult.matched, true);
    assert.equal(standardResult.matchedFaces.length, 1);
  });
});

