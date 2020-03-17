"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_languageserver_1 = require("vscode-languageserver");
const RE_ERROR_LOCATION = /^(\s*)(\^-*\^{0,1})\s*$/;
function getDiagnosticSeverity(severity) {
    switch (severity) {
        case 'error':
            return vscode_languageserver_1.DiagnosticSeverity.Error;
        case 'warning':
            return vscode_languageserver_1.DiagnosticSeverity.Warning;
        default:
            return vscode_languageserver_1.DiagnosticSeverity.Error;
    }
}
function errorToDiagnostic(error) {
    const errorSplit = error.formattedMessage.split(':');
    let fileName = errorSplit[0];
    let index = 1;
    // a full path in windows includes a : for the drive
    if (process.platform === 'win32') {
        fileName = errorSplit[0] + ':' + errorSplit[1];
        index = 2;
    }
    const line = parseInt(errorSplit[index], 10);
    let columnStart = parseInt(errorSplit[index + 1], 10);
    let columnEnd = columnStart;
    const lines = error.formattedMessage.trim().split(/\n/g);
    const lastLine = lines.pop();
    const matches = RE_ERROR_LOCATION.exec(lastLine);
    if (matches) {
        columnStart = matches[1].length;
        columnEnd = columnStart + matches[2].length;
    }
    return {
        diagnostic: {
            message: error.message,
            range: {
                end: {
                    character: columnStart,
                    line: line - 1,
                },
                start: {
                    character: columnEnd,
                    line: line - 1,
                },
            },
            severity: getDiagnosticSeverity(error.severity),
            source: 'solc',
        },
        fileName: fileName,
    };
}
exports.errorToDiagnostic = errorToDiagnostic;
//# sourceMappingURL=compiler-errors.js.map