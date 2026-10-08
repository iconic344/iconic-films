import test from 'node:test';
import assert from 'node:assert/strict';
import {isStorageLimitError,userFacingUploadError} from '../src/media-upload';

test('Supabase explicit maximum object size errors are never shown raw',()=>{
 const message='The object exceeded the maximum allowed size';
 assert.equal(isStorageLimitError(message,400),true);
 const readable=userFacingUploadError(message,125*1024*1024,400);
 assert.match(readable,/Supabase Storage/);
 assert.match(readable,/125\.0MB/);
 assert.match(readable,/Global file size limit/);
 assert.doesNotMatch(readable,/The object exceeded/);
});
test('413 and payload too large use the same storage quota instructions',()=>{
 assert.equal(isStorageLimitError('',413),true);
 assert.equal(isStorageLimitError('Payload too large',400),true);
 assert.match(userFacingUploadError('Payload too large',70*1024*1024,413),/Storage/);
});
test('Unrelated errors must not be mislabeled as storage quota issues',()=>{
 assert.equal(isStorageLimitError('Network error',0),false);
 assert.equal(userFacingUploadError('Network error',10,0),'Network error');
});
