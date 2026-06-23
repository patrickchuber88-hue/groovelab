import ts from 'typescript';
import fs from 'fs';

const filePath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/BillingDashboard.tsx';
const program = ts.createProgram([filePath], {
  noEmit: true,
  jsx: ts.JsxEmit.ReactJSX,
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Node10
});

const diagnostics = ts.getPreEmitDiagnostics(program);
for (const diag of diagnostics) {
  if (diag.file && diag.start) {
    const { line, character } = ts.getLineAndCharacterOfPosition(diag.file, diag.start);
    console.log(`${diag.file.fileName} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(diag.messageText, '\n')}`);
  } else {
    console.log(ts.flattenDiagnosticMessageText(diag.messageText, '\n'));
  }
}
