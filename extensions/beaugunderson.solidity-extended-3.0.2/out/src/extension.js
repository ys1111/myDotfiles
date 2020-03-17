'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function activate(context) {
    const serverModule = path.join(__dirname, 'server.js');
    const serverOptions = {
        debug: {
            module: serverModule,
            options: {
                execArgv: ['--nolazy', '--debug=6004'],
            },
            transport: vscode_languageclient_1.TransportKind.ipc,
        },
        run: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
        },
    };
    const clientOptions = {
        documentSelector: ['solidity'],
        synchronize: {
            configurationSection: 'solidity',
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.soliumrc.json'),
        },
    };
    const client = new vscode_languageclient_1.LanguageClient('solidity', 'Solidity Language Server', serverOptions, clientOptions);
    context.subscriptions.push(client.start());
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map