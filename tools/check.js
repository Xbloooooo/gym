// Syntax-checks the inline script of index.html. Run: node tools/check.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
new vm.Script(m[1], { filename: 'index.html<script>' });
const ver = (m[1].match(/const VERSION = "([^"]+)"/) || [])[1];
console.log('script ok,', m[1].length, 'chars, VERSION', ver);
