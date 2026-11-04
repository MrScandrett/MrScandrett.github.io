import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const model = require('../assets/js/music-daw-project.js');
test('patch normals preserve legacy sound and disconnected outputs survive project round trips', () => {
 const song = model.create();
 assert.equal(model.parse(model.stringify(song)).tracks[0].patchMain, true);
 song.tracks[0].patchMain = false;
 song.tracks[0].sends = [.25, .6];
 const restored = model.parse(model.stringify(song));
 assert.equal(restored.tracks[0].patchMain, false);
 assert.deepEqual(restored.tracks[0].sends, [.25, .6]);
});
const routing = require('../assets/js/music-patch-routing.js');
const tracks = [{id:'keys',sends:[0,0],effects:[]},{id:'voice',sends:[0,0],effects:[]}];
const types = ['eq','compressor','delay'];
test('serial channel inserts, master inserts and effects return patches are valid', () => {
 for (const connections of [
  [{from:'keys@send',to:'fx:compressor'},{from:'fx:compressor',to:'fx:eq'},{from:'fx:eq',to:'keys@return'}],
  [{from:'mixout',to:'fx:eq'},{from:'fx:eq',to:'monitor'}],
  [{from:'return0',to:'fx:eq'},{from:'fx:eq',to:'main'}],
  [{from:'voice',to:'keys@input'}],
 ]) assert.equal(routing.validate(connections,tracks,types),'');
});
test('feedback through channel inputs, returns, auxes and master paths is rejected', () => {
 for (const connections of [
  [{from:'keys',to:'keys@input'}],
  [{from:'fx:eq',to:'fx:eq'}],
  [{from:'keys',to:'fx:eq'},{from:'fx:eq',to:'keys@return'}],
  [{from:'return0',to:'fx:eq'},{from:'fx:eq',to:'aux0'}],
  [{from:'mixout',to:'fx:eq'},{from:'fx:eq',to:'main'}],
  [{from:'keys',to:'voice@input'},{from:'voice',to:'keys@input'}],
 ]) assert.match(routing.validate(connections,tracks,types),/Feedback/);
 assert.match(routing.validate([{from:'missing',to:'main'}],tracks,types),/unavailable/);
});
test('individual channel insert slots break their input normal and allow a forward processor chain', () => {
 const channels = [{...tracks[0],effects:[{type:'eq'},{type:'compressor'}]}];
 assert.equal(routing.validate([{from:'keys@fx0-out',to:'fx:delay'},{from:'fx:delay',to:'keys@fx1-in'}],channels,types),'');
 assert.match(routing.validate([{from:'keys@fx1-out',to:'keys@fx0-in'}],channels,types),/Feedback/);
});
test('processor routes and settings survive saving without duplicate cables', () => {
 const song = model.create();
 song.patchConnections = [{from:'mixout',to:'fx:eq'},{from:'mixout',to:'fx:eq'},{from:'fx:eq',to:'monitor'}];
 song.patchParameters = {eq:{gain:-9,frequency:800}};
 const restored = model.parse(model.stringify(song));
 assert.equal(restored.patchConnections.length,2);
 assert.deepEqual(restored.patchParameters,song.patchParameters);
});
test('processor inputs accept one cord while summing buses accept several', () => {
 assert.match(routing.validate([{from:'keys',to:'fx:eq'},{from:'voice',to:'fx:eq'}],tracks,types),/one cable/);
 assert.equal(routing.validate([{from:'keys',to:'main'},{from:'voice',to:'main'}],tracks,types),'');
});
