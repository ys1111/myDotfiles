"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const mythx = require("./mythx");
const trufstuf = require("./trufstuf");
const armlet_1 = require("armlet");
const util_1 = require("./util");
const md_reporter_1 = require("./md-reporter");
const util = require("util");
const eslint_1 = require("./eslint");
// vscode-solidity's wrapper around solc
const solcCompiler_1 = require("../../solcCompiler");
const Config = require("truffle-config");
const wfc_1 = require("./wfc");
const stripAnsi = require("strip-ansi");
const fsExists = util.promisify(fs.exists);
const fsMkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const warnFn = vscode.window.showWarningMessage;
const outputChannel = vscode.window.createOutputChannel('MythX');
const hasSolcVersion = config => config.compilers && config.compilers.solc && !!config.compilers.solc.version;
// FIXME: util.promisify breaks compile internal call to writeContracts
// const contractsCompile = util.promisify(contracts.compile);
const contractsCompile = config => {
    return new Promise((resolve, reject) => {
        wfc_1.default.compile(config, (err, result) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(result);
        });
    });
};
// This is adapted from 'remix-lib/src/sourceMappingDecoder.js'
function showMessage(mess) {
    outputChannel.clear();
    outputChannel.show();
    if (process.platform === 'darwin') {
        // OSX OutputChannel can't handle ANSI codes, I think.
        mess = stripAnsi(mess);
    }
    outputChannel.appendLine(mess);
}
// Take solc's JSON output and make it compatible with the Mythril Platform API
function solc2MythrilJSON(inputSolcJSON, contractName, sourceCode, analysisMode) {
    // Add/remap some fields because the MythX Platform API doesn't
    // align with solc's JSON.
    const solcJSON = {
        analysisMode: analysisMode,
        bytecode: '',
        contractName: contractName,
        deployedBytecode: '',
        deployedSourceMap: '',
        sourceList: [contractName],
        sourceMap: '',
        sources: {},
    };
    solcJSON.sources[contractName] = sourceCode;
    for (const field of ['bytecode', 'deployedBytecode']) {
        solcJSON[field] = inputSolcJSON.evm[field].object;
    }
    solcJSON.deployedSourceMap = inputSolcJSON.evm.deployedBytecode.sourceMap;
    solcJSON.sourceMap = inputSolcJSON.evm.bytecode.sourceMap;
    return solcJSON;
}
function getArmletCredentialKeys(config) {
    const { password, ethAddress } = config;
    return {
        ethAddress,
        password,
    };
}
function solidityPathAndSource() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        warnFn('No file opened');
        return null; // We need something open
    }
    const contractPath = editor.document.fileName;
    const extName = path.extname(contractPath);
    if (extName !== '.sol') {
        warnFn(`${contractPath} not a solidity file; should match: *.sol`);
        return null;
    }
    const rootDir = trufstuf.getRootDir(contractPath);
    const contractCode = editor.document.getText();
    return {
        buildContractsDir: trufstuf.getBuildContractsDir(rootDir),
        buildMythxContractsDir: trufstuf.getBuildMythxContractsDir(rootDir),
        code: contractCode,
        path: contractPath,
        rootDir: rootDir,
    };
}
/**
 * A 2-level line-column comparison function.
 * @returns {integer} -
      zero:      line1/column1 == line2/column2
      negative:  line1/column1 < line2/column2
      positive:  line1/column1 > line2/column2
*/
function compareLineCol(line1, column1, line2, column2) {
    return line1 === line2 ?
        (column1 - column2) :
        (line1 - line2);
}
/**
 * A 2-level comparison function for eslint message structure ranges
 * the fields off a message
 * We use the start position in the first comparison and then the
 * end position only when the start positions are the same.
 *
 * @returns {integer} -
      zero:      range(mess1) == range(mess2)
      negative:  range(mess1) <  range(mess2)
      positive:  range(mess1) > range(mess)

*/
function compareMessLCRange(mess1, mess2) {
    const c = compareLineCol(mess1.line, mess1.column, mess2.line, mess2.column);
    return c !== 0 ? c : compareLineCol(mess1.endLine, mess1.endCol, mess2.endLine, mess2.endCol);
}
const groupEslintIssuesByBasename = (issues) => {
    const mappedIssues = issues.reduce((accum, issue) => {
        const { errorCount, warningCount, fixableErrorCount, fixableWarningCount, filePath, messages, } = issue;
        const basename = path.basename(filePath);
        if (!accum[basename]) {
            accum[basename] = {
                errorCount: 0,
                filePath: filePath,
                fixableErrorCount: 0,
                fixableWarningCount: 0,
                messages: [],
                warningCount: 0,
            };
        }
        accum[basename].errorCount += errorCount;
        accum[basename].warningCount += warningCount;
        accum[basename].fixableErrorCount += fixableErrorCount;
        accum[basename].fixableWarningCount += fixableWarningCount;
        accum[basename].messages = accum[basename].messages.concat(messages);
        return accum;
    }, {});
    const issueGroups = Object.values(mappedIssues);
    for (const group of issueGroups) {
        group.messages = group.messages.sort(function (mess1, mess2) {
            return compareMessLCRange(mess1, mess2);
        });
    }
    return issueGroups;
};
// Run MythX  analyze after we have
// ensured via compile that JSON data is there and
// up to date.
// Parameters "config", and "done" are implicitly passed in.
function analyzeWithBuildDir({ pathInfo, config, buildContractsDir, solidityConfig, progress, }) {
    return __awaiter(this, void 0, void 0, function* () {
        let buildJsonPath;
        try {
            const jsonFiles = yield trufstuf.getTruffleBuildJsonFilesAsync(buildContractsDir);
            buildJsonPath = jsonFiles[0];
        }
        catch (err) {
            console.log(err);
            vscode.window.showWarningMessage(err.message);
            return;
        }
        // console.log(`Reading ${buildJsonPath}`);
        // get armlet authentication options
        const armletAuthOptions = getArmletCredentialKeys(solidityConfig.mythx);
        const armletOptions = Object.assign({}, armletAuthOptions);
        let client;
        try {
            client = new armlet_1.Client(armletOptions, solidityConfig.mythx.apiUrl);
        }
        catch (err) {
            console.log(err);
            warnFn(err);
            return;
        }
        const isBuildJsonPathExists = yield fsExists(buildJsonPath);
        if (!isBuildJsonPathExists) {
            vscode.window.showWarningMessage("Can't read build/contract JSON file: " +
                `${buildJsonPath}`);
            return;
        }
        let buildObj;
        try {
            const buildJson = yield readFile(buildJsonPath, 'utf8');
            buildObj = JSON.parse(buildJson);
        }
        catch (err) {
            console.log(err);
            warnFn(`Error parsing JSON file: ${buildJsonPath}`);
            return;
        }
        const contracts = mythx.newTruffleObjToOldTruffleByContracts(buildObj);
        const timeout = solidityConfig.mythx.timeout;
        const progressStep = 100 / (timeout * contracts.length);
        let progressBarcurrStep = 0;
        let currentContract;
        let progressBarInterval = setInterval(() => {
            if (progressBarInterval && progressBarcurrStep >= 100) {
                clearInterval(progressBarInterval);
                progressBarInterval = null;
                return;
            }
            progressBarcurrStep += progressStep;
            const message = currentContract ? `Running ${currentContract}` : 'Running...';
            progress.report({ increment: progressBarcurrStep, message });
        }, 1000);
        const analysisResults = yield Promise.all(contracts.map((contract) => __awaiter(this, void 0, void 0, function* () {
            const obj = new mythx.MythXIssues(contract, config);
            const mythxBuilObj = obj.getBuildObj();
            currentContract = obj.contractName;
            const analyzeOpts = {
                clientToolName: 'vscode-solidity',
                data: mythxBuilObj,
                timeout: solidityConfig.mythx.timeout * 1000,
            };
            analyzeOpts.data.analysisMode = solidityConfig.mythx.analysisMode;
            let mythXresult;
            try {
                mythXresult = yield client.analyzeWithStatus(analyzeOpts);
                if (progressBarcurrStep < 100) {
                    progressBarcurrStep = 100;
                    progress.report({ increment: progressBarcurrStep, message: `Running ${obj.contractName}` });
                }
                obj.setIssues(mythXresult.issues);
                if (!config.style) {
                    config.style = 'stylish';
                }
                const spaceLimited = ['tap', 'markdown'].indexOf(config.style) === -1;
                const eslintIssues = obj.getEslintIssues(spaceLimited);
                const groupedEslintIssues = groupEslintIssuesByBasename(eslintIssues);
                const uniqueIssues = eslint_1.getUniqueIssues(groupedEslintIssues);
                const reportsDir = trufstuf.getMythReportsDir(pathInfo.buildMythxContractsDir);
                const mdData = {
                    analysisMode: analyzeOpts.data.analysisMode,
                    compilerVersion: analyzeOpts.data.version,
                    contractName: obj.contractName,
                    groupedEslintIssues,
                    reportsDir: reportsDir,
                    sourcePath: mythxBuilObj.sourceList[0],
                    status: mythXresult.status,
                    timeout: solidityConfig.mythx.timeout,
                };
                yield md_reporter_1.writeMarkdownReportAsync(mdData);
                return uniqueIssues;
            }
            catch (err) {
                if (progressBarInterval) {
                    clearInterval(progressBarInterval);
                    progressBarInterval = null;
                }
                console.log(err);
                showMessage(err);
                vscode.window.showWarningMessage(err);
                return null;
            }
        })));
        return analysisResults;
    });
}
function mythxVersion() {
    armlet_1.ApiVersion().then((result) => {
        const mess = util_1.versionJSON2String(result);
        vscode.window.showInformationMessage(mess);
    });
}
exports.mythxVersion = mythxVersion;
function mythxAnalyze(progress) {
    return __awaiter(this, void 0, void 0, function* () {
        const solidityConfig = vscode.workspace.getConfiguration('solidity');
        const pathInfo = solidityPathAndSource();
        const truffleOptions = {
            _: [],
            logger: {
                debug: console.log,
                info: console.log,
                log: console.log,
                warn: console.log,
            },
            working_directory: pathInfo.rootDir,
        };
        let config;
        let buildContractsDir = pathInfo.buildContractsDir;
        // FIXME: Add a better test to see if we are a truffle project
        try {
            config = Config.detect(truffleOptions);
            buildContractsDir = pathInfo.buildContractsDir;
        }
        catch (err) {
            // FIXME: Dummy up in config whatever we need to run compile.
            // FIXME: Pull in compiler from "compile".
            const buildDir = `${pathInfo.rootDir}/build`;
            const isBuildDirExists = yield fsExists(buildDir);
            if (!isBuildDirExists) {
                yield fsMkdir(buildDir);
            }
            const isbuildContractsDirExists = yield fsExists(buildContractsDir);
            if (!isbuildContractsDirExists) {
                yield fsMkdir(buildContractsDir);
            }
            config = {
                _: [],
                compilers: {
                    solc: {
                        settings: {
                            evmVersion: 'byzantium',
                            optimizer: {
                                enabled: false,
                                runs: 200,
                            },
                        },
                    },
                },
                contracts_build_directory: buildContractsDir,
                contracts_directory: pathInfo.rootDir,
                working_directory: pathInfo.rootDir,
            };
        }
        // This can cause vyper to fail if you don't have vyper installed
        delete config.compilers.vyper;
        // Get VSCode Solidity's solc information
        const vscode_solc = new solcCompiler_1.SolcCompiler(vscode.workspace.rootPath);
        const remoteCompiler = vscode.workspace.getConfiguration('solidity').get('compileUsingRemoteVersion');
        const localCompiler = vscode.workspace.getConfiguration('solidity').get('compileUsingLocalVersion');
        const initialized = yield vscode_solc.intialiseCompiler(localCompiler, remoteCompiler);
        // Set truffle compiler version based on vscode solidity's version info
        if (!hasSolcVersion(config)) {
            config.compilers.solc.version = vscode_solc.getVersion();
        }
        config.build_mythx_contracts = pathInfo.buildMythxContractsDir;
        yield contractsCompile(config);
        let analysisResults = yield analyzeWithBuildDir({
            buildContractsDir: pathInfo.buildMythxContractsDir,
            config,
            pathInfo,
            progress,
            solidityConfig,
        });
        analysisResults = analysisResults.filter(res => res !== null);
        analysisResults = analysisResults.reduce((accum, res) => accum.concat(res), []);
        const groupedEslintIssues = groupEslintIssuesByBasename(analysisResults);
        const uniqueIssues = eslint_1.getUniqueIssues(groupedEslintIssues);
        const formatter = util_1.getFormatter(solidityConfig.mythx.reportFormat);
        showMessage(formatter(uniqueIssues));
    });
}
exports.mythxAnalyze = mythxAnalyze;
//# sourceMappingURL=index.js.map