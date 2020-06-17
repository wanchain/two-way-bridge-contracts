const fs = require('fs');
const path = require('path');

const contextPath = path.join(__dirname, '../../cxt/');

function readContext(fileName) {
  let filePath = path.join(contextPath, fileName);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } else {
    return null;
  }
}

function writeContext(fileName, object) {
  let filePath = path.join(contextPath, fileName);
  let content = JSON.stringify(object);
  fs.writeFileSync(filePath, content, 'utf8');
}

function clearContext(fileName) {
  let filePath = path.join(contextPath, fileName);
  fs.unlinkSync(filePath);
}

module.exports = {
  readContext,
  writeContext,
  clearContext
}