const GpkGroup = require('./Group');

console.log("open storeman gpk agent");

gpk();

async function gpk() {
  let group = new GpkGroup('test');
  group.init();
}
