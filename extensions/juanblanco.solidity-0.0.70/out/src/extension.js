'use strict';
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
const path = require("path");
const vscode = require("vscode");
const compileAll_1 = require("./compileAll");
const compileActive_1 = require("./compileActive");
const codegen_1 = require("./codegen");
const vscode_languageclient_1 = require("vscode-languageclient");
const soliumClientFixer_1 = require("./linter/soliumClientFixer");
const analyzeContract_1 = require("./analysers/mythx/commands/analyzeContract");
// tslint:disable-next-line:no-duplicate-imports
const vscode_1 = require("vscode");
const prettierFormatter_1 = require("./formatter/prettierFormatter");
let diagnosticCollection;
let mythxDiagnostic;
function activate(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('solidity');
    mythxDiagnostic = vscode.languages.createDiagnosticCollection('mythx');
    context.subscriptions.push(diagnosticCollection);
    compileActive_1.initDiagnosticCollection(diagnosticCollection);
    context.subscriptions.push(vscode.commands.registerCommand('solidity.compile.active', () => __awaiter(this, void 0, void 0, function* () {
        const compiledResults = yield compileActive_1.compileActiveContract();
        codegen_1.autoCodeGenerateAfterCompilation(compiledResults, null, diagnosticCollection);
        return compiledResults;
    })));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.compile', () => {
        compileAll_1.compileAllContracts(diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenCSharpProject', (args) => {
        codegen_1.codeGenerateNethereumCQSCsharp(args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.compileAndCodegenCSharpProject', (args) => __awaiter(this, void 0, void 0, function* () {
        const compiledResults = yield compileActive_1.compileActiveContract();
        compiledResults.forEach(file => {
            codegen_1.codeGenerateCQS(file, 0, args, diagnosticCollection);
        });
    })));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenNethereumCodeGenSettings', (args) => {
        codegen_1.generateNethereumCodeSettingsFile();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenVbNetProject', (args) => {
        codegen_1.codeGenerateNethereumCQSVbNet(args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.compileAndCodegenVbNetProject', (args) => __awaiter(this, void 0, void 0, function* () {
        const compiledResults = yield compileActive_1.compileActiveContract();
        compiledResults.forEach(file => {
            codegen_1.codeGenerateCQS(file, 1, args, diagnosticCollection);
        });
    })));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenFSharpProject', (args) => {
        codegen_1.codeGenerateNethereumCQSFSharp(args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.compileAndCodegenFSharpProject', (args) => __awaiter(this, void 0, void 0, function* () {
        const compiledResults = yield compileActive_1.compileActiveContract();
        compiledResults.forEach(file => {
            codegen_1.codeGenerateCQS(file, 3, args, diagnosticCollection);
        });
    })));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenCSharpProjectAll', (args) => {
        codegen_1.codeGenerateNethereumCQSCSharpAll(args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenVbNetProjectAll', (args) => {
        codegen_1.codeGenerateNethereumCQSVbAll(args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenFSharpProjectAll', (args) => {
        codegen_1.codeGenerateNethereumCQSFSharpAll(args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenCSharpProjectAllAbiCurrent', (args) => {
        codegen_1.codeGenerateAllFilesFromAbiInCurrentFolder(0, args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenVbNetProjectAllAbiCurrent', (args) => {
        codegen_1.codeGenerateAllFilesFromAbiInCurrentFolder(1, args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.codegenFSharpProjectAllAbiCurrent', (args) => {
        codegen_1.codeGenerateAllFilesFromAbiInCurrentFolder(3, args, diagnosticCollection);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.fixDocument', () => {
        soliumClientFixer_1.lintAndfixCurrentDocument();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('solidity.runMythx', (fileUri) => __awaiter(this, void 0, void 0, function* () {
        analyzeContract_1.analyzeContract(mythxDiagnostic, fileUri);
    })));
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('solidity', {
        provideDocumentFormattingEdits(document) {
            return prettierFormatter_1.formatDocument(document, context);
        }
    }));
    const serverModule = path.join(__dirname, 'server.js');
    const serverOptions = {
        debug: {
            module: serverModule,
            options: {
                execArgv: ['--nolazy', '--inspect=6009'],
            },
            transport: vscode_languageclient_1.TransportKind.ipc,
        },
        run: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
        },
    };
    const clientOptions = {
        documentSelector: [
            { language: 'solidity', scheme: 'file' },
            { language: 'solidity', scheme: 'untitled' },
        ],
        revealOutputChannelOn: vscode_languageclient_1.RevealOutputChannelOn.Never,
        synchronize: {
            // Synchronize the setting section 'solidity' to the server
            configurationSection: 'solidity',
        },
    };
    const ws = vscode_1.workspace.workspaceFolders;
    let clientDisposable;
    if (ws) {
        clientDisposable = new vscode_languageclient_1.LanguageClient('solidity', 'Solidity Language Server', serverOptions, clientOptions).start();
    }
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(clientDisposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map