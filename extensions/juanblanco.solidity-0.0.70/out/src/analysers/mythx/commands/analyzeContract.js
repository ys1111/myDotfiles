"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const mythxjs_1 = require("mythxjs");
const getCredentials_1 = require("../login/getCredentials");
const errorCodeDiagnostic_1 = require("../errorCodeDiagnostic");
const getFileContent_1 = require("../utils/getFileContent");
const getAstData_1 = require("../utils/getAstData");
const compileActive_1 = require("../../../compileActive");
const { window } = vscode;
let mythx;
const contractNameOption = {
    ignoreFocusOut: true,
    placeHolder: 'Contract Name',
    prompt: 'Contract Name: ',
};
function analyzeContract(diagnosticCollection, fileUri) {
    return __awaiter(this, void 0, void 0, function* () {
        let contractName;
        yield compileActive_1.compileActiveContract().then((compiledResults) => __awaiter(this, void 0, void 0, function* () {
            if (!compiledResults) {
                throw new Error(`MythX error with compilation.`);
            }
            const credentials = yield getCredentials_1.getCredentials();
            mythx = new mythxjs_1.Client(credentials.ethAddress, credentials.password, 'mythXvsc');
            yield mythx.login();
            const fileContent = yield getFileContent_1.getFileContent(fileUri);
            const requestObj = yield getAstData_1.getAstData(contractName, fileContent);
            const analyzeRes = yield mythx.analyze(requestObj);
            const { uuid } = analyzeRes;
            // Get in progress bar
            yield window.withProgress({
                cancellable: true,
                location: vscode.ProgressLocation.Notification,
                title: `Analysing smart contract ${contractName}`,
            }, (_) => new Promise((resolve) => {
                // Handle infinite queue
                const timer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    const analysis = yield mythx.getAnalysisStatus(uuid);
                    if (analysis.status === 'Finished') {
                        clearInterval(timer);
                        resolve('done');
                    }
                }), 10000);
            }));
            diagnosticCollection.clear();
            const analysisResult = yield mythx.getDetectedIssues(uuid);
            const { issues } = analysisResult[0];
            // Some warning have messages but no SWCID (like free trial user warn)
            const filtered = issues.filter(issue => issue.swcID !== '');
            if (!filtered) {
                vscode.window.showInformationMessage(`MythXvs: No security issues found in your contract.`);
            }
            else {
                vscode.window.showWarningMessage(`MythXvs: found ${filtered.length} security issues with contract.`);
            }
            // Diagnostic
            errorCodeDiagnostic_1.errorCodeDiagnostic(vscode.window.activeTextEditor.document, diagnosticCollection, analysisResult);
        })).catch((err) => {
            vscode.window.showWarningMessage(`MythX error with compilation: ${err}`);
            throw new Error(`MythX error with compilation: ${err}`);
        });
    });
}
exports.analyzeContract = analyzeContract;
//# sourceMappingURL=analyzeContract.js.map