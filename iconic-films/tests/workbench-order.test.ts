import test from 'node:test';
import assert from 'node:assert/strict';
import type {TeamMember} from '../src/defaults';
import {homeSectionOrder,memberSectionOrder,moveOrderedItem,movePortfolioWork,LOCKED_HOME_SECTIONS} from '../src/workbench-order';

test('Home inspector always matches saved visual section order',()=>{
 const actual=homeSectionOrder({sectionOrder:['nav','hero','work','team','about','footer']});
 assert.deepEqual(actual,['nav','hero','work','team','about','footer']);
 const defaultOrder=homeSectionOrder({sectionOrder:['nav','hero','work','about','team','footer']});
 assert.deepEqual(defaultOrder,['nav','hero','work','about','team','footer']);
});
test('Drag reorders only movable sections; pinned header/footer cannot drift',()=>{
 const order=homeSectionOrder({sectionOrder:['nav','hero','work','about','team','footer']});
 assert.deepEqual(moveOrderedItem(order,'team','about',LOCKED_HOME_SECTIONS),['nav','hero','work','team','about','footer']);
 assert.deepEqual(moveOrderedItem(order,'footer','hero',LOCKED_HOME_SECTIONS),order);
});
test('Portfolio category hero/work order persists with fixed navigation and footer',()=>{
 assert.deepEqual(memberSectionOrder({portfolioSectionOrder:['nav','work','hero','index','switcher','footer']}),['nav','work','hero','index','switcher','footer']);
});
test('Moving portfolio videos moves their metadata in exactly the same order',()=>{
 const member={
  works:['a.mp4','b.mp4','c.mp4'],
  portfolioWorkTitles:['A','B','C'],
  portfolioWorkCategories:['fashion','campaign','product'],
  portfolioWorkInfo:['a-info','b-info','c-info'],
  portfolioWorkCredits:['a-credit','b-credit','c-credit'],
  portfolioWorkRatios:['4:5','16:9','1:1']
 } as unknown as TeamMember;
 const moved=movePortfolioWork(member,0,2);
 assert.deepEqual(moved.works,['b.mp4','c.mp4','a.mp4']);
 assert.deepEqual(moved.portfolioWorkTitles,['B','C','A']);
 assert.deepEqual(moved.portfolioWorkCategories,['campaign','product','fashion']);
 assert.deepEqual(moved.portfolioWorkInfo,['b-info','c-info','a-info']);
 assert.deepEqual(moved.portfolioWorkCredits,['b-credit','c-credit','a-credit']);
 assert.deepEqual(moved.portfolioWorkRatios,['16:9','1:1','4:5']);
});
