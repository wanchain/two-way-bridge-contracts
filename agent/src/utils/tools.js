const fs = require('fs');
const path = require('path');
const Context = require('../../db/models/context');

// file

const contextFilePath = path.join(__dirname, '../../cxt/');

function readContextFile(fileName) {
  let filePath = path.join(contextFilePath, fileName);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } else {
    return null;
  }
}

function writeContextFile(fileName, object) {
  let filePath = path.join(contextFilePath, fileName);
  let content = JSON.stringify(object);
  fs.writeFileSync(filePath, content, 'utf8');
}

function clearContextFile(fileName) {
  let filePath = path.join(contextFilePath, fileName);
  fs.unlinkSync(filePath);
}

// db

async function readContextDb(key) {
  try {
    let doc = await Context.findOne({key});
    return JSON.parse(doc.value);
  } catch {
    return null;
  }
}

async function writeContextDb(key, object) {
  try {
    let content = JSON.stringify(object);
    let result = await Context.updateOne({key}, {key, value: content}, {upsert: true});
    return result.ok? true : false;
  } catch (err) {
    return false;
  }
}

async function clearContextDb(key) {
  try {
    await Context.remove({key});
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  readContextFile,
  writeContextFile,
  clearContextFile,
  readContextDb,
  writeContextDb,
  clearContextDb,
}