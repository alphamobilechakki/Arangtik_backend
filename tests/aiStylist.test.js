const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { mapEventToPythonOccasion } = require('../src/modules/aiStylist/aiStylist.service');
const { validateGenerateLook, validateLookIdParam } = require('../src/modules/aiStylist/aiStylist.validation');
const AiLook = require('../src/modules/aiStylist/aiLook.model');
const aiStylistRoutes = require('../src/modules/aiStylist/aiStylist.routes');

describe('AI Stylist Module', () => {
  it('maps Event eventTypeCode to Python occasion field', () => {
    assert.equal(mapEventToPythonOccasion('WEDDING'), 'ethnic');
    assert.equal(mapEventToPythonOccasion('PARTY'), 'party');
    assert.equal(mapEventToPythonOccasion('FORMAL_MEETING'), 'formal');
    assert.equal(mapEventToPythonOccasion('CASUAL_OUTING'), 'smart_casual');
    assert.equal(mapEventToPythonOccasion(undefined), 'smart_casual');
  });

  it('validates generate look payload', () => {
    const validId = new mongoose.Types.ObjectId().toString();
    let nextCalled = false;

    validateGenerateLook(
      { body: { topWearId: validId, jewelleryIds: [validId], eventId: validId } },
      {},
      () => { nextCalled = true; }
    );
    assert.equal(nextCalled, true);

    assert.throws(
      () => validateGenerateLook({ body: {} }, {}, () => {}),
      /Please select at least a Top Wear or Bottom Wear garment/
    );

    assert.throws(
      () => validateGenerateLook({ body: { topWearId: 'bad-id' } }, {}, () => {}),
      /Invalid topWearId/
    );
  });

  it('validates look ID param', () => {
    const validId = new mongoose.Types.ObjectId().toString();
    let nextCalled = false;

    validateLookIdParam({ params: { id: validId } }, {}, () => { nextCalled = true; });
    assert.equal(nextCalled, true);

    assert.throws(
      () => validateLookIdParam({ params: { id: 'invalid' } }, {}, () => {}),
      /Invalid AI Look ID/
    );
  });

  it('includes soft delete fields, eventId, and omits occasion on AiLook schema', () => {
    assert.ok(AiLook.schema.path('isDeleted'));
    assert.ok(AiLook.schema.path('deletedAt'));
    assert.ok(AiLook.schema.path('eventId'));
    assert.ok(AiLook.schema.path('status'));
    assert.equal(AiLook.schema.path('occasion'), undefined);
    assert.ok(aiStylistRoutes);
  });
});
