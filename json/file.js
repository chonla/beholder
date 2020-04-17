const fs = require('fs');

function jsonFromFile(filename) {
    const data = fs.readFileSync(filename);
    return JSON.parse(data.toString().trim());
}

module.exports = jsonFromFile;