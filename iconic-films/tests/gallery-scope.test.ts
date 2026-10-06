import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scopeGallery} from '../src/gallery-scope';
test('All view opens only the selected category, with original indices retained',()=>{
 const source=[{id:'film',category:'Brand Film'},{id:'photo',category:'Lookbook'},{id:'model',category:'Brand Film'}];
 const group=scopeGallery(source,2);
 assert.deepEqual(group.items.map(item=>item.id),['film','model']);
 assert.deepEqual(group.sourceIndices,[0,2]);
 assert.equal(group.index,1);
 assert.deepEqual(scopeGallery(source,1).items.map(item=>item.id),['photo']);
});
test('Unassigned entries form their own group and empty galleries stay empty',()=>{
 assert.deepEqual(scopeGallery([{category:'Festival'},{},{category:''}],1).sourceIndices,[1,2]);
 assert.deepEqual(scopeGallery([],0),{items:[],sourceIndices:[],index:0});
});
