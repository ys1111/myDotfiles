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
const os = require('os');
const path = require('path');
function getContractName(fileUri) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let outputAST;
            let contractName;
            let fixedPath = fileUri.fsPath;
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            // Windows OS hack
            if (os.platform() === 'win32') {
                fixedPath = fixedPath.replace(/\\/g, '/');
                if (fixedPath.charAt(0) === '/') {
                    fixedPath = fixedPath.substr(1);
                }
            }
            const fileName = fixedPath.split('/').pop();
            const fileNameTrimmed = fileName.replace('.sol', '');
            const pathNoFileName = fixedPath.substring(0, fixedPath.lastIndexOf('/'));
            // Find differences between two path
            const relativePath = path.relative(rootPath, pathNoFileName);
            if (pathNoFileName === rootPath) {
                outputAST = path.join(rootPath, 'bin', `${fileNameTrimmed}-solc-output.json`);
            }
            else {
                outputAST = path.join(rootPath, 'bin', relativePath, `${fileNameTrimmed}-solc-output.json`);
            }
            const documentObj = yield vscode.workspace.openTextDocument(outputAST);
            const compiled = JSON.parse(documentObj.getText());
            const contract = compiled.contracts[fixedPath];
            const contractsNames = Object.keys(contract);
            yield vscode.window.showQuickPick(contractsNames, {
                canPickMany: false,
                placeHolder: 'Contract Name (please select main contract):'
            }).then(value => {
                if (value === undefined) {
                    throw new Error('Contract Name cancelled. Please re-run analysis.');
                }
                contractName = value;
            });
            return contractName;
        }
        catch (err) {
            vscode.window.showWarningMessage(`Mythx error with getting your contract name. ${err}`);
            throw new Error(`Mythx error with getting your contract name. ${err}`);
        }
    });
}
exports.getContractName = getContractName;
//# sourceMappingURL=getContractName.js.map