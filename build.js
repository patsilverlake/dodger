const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'public', 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Compile TypeScript using the TypeScript API
const ts = require('typescript');

const configPath = path.join(__dirname, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

if (configFile.error) {
  console.error(configFile.error);
  process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath)
);

if (parsedConfig.errors.length) {
  console.error(parsedConfig.errors);
  process.exit(1);
}

const program = ts.createProgram(
  parsedConfig.fileNames,
  parsedConfig.options
);

const emitResult = program.emit();

const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

if (allDiagnostics.length) {
  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  });
  process.exit(1);
}

console.log('TypeScript compilation completed successfully.'); 