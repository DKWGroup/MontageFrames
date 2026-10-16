import test from 'node:test';import assert from 'node:assert/strict';
import {tryAcquireHeavy,heavyOwner} from './process-resource.mjs';
test('one owner holds heavy media/AI resources and release is idempotent',()=>{const release=tryAcquireHeavy('one');assert.equal(heavyOwner(),'one');assert.equal(tryAcquireHeavy('two'),null);release();release();const next=tryAcquireHeavy('two');assert.equal(heavyOwner(),'two');next();assert.equal(heavyOwner(),null);});
