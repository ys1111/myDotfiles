'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const solparse = require("solparse");
const contractsCollection_1 = require("./model/contractsCollection");
const vscode_languageserver_1 = require("vscode-languageserver");
const projectService_1 = require("./projectService");
// TODO implement caching, dirty on document change, reload, etc.
// store
// export class CompletionFile {
//    public path: string;
//    public imports: string[]
//    public inspectionResult : any
// }
class CompletionService {
    constructor(rootPath) {
        this.rootPath = rootPath;
    }
    getTypeString(literal) {
        const isArray = literal.array_parts.length > 0;
        let isMapping = false;
        const literalType = literal.literal;
        let suffixType = '';
        if (typeof literalType.type !== 'undefined') {
            isMapping = literalType.type === 'MappingExpression';
            if (isMapping) {
                suffixType = '(' + this.getTypeString(literalType.from) + ' => ' + this.getTypeString(literalType.to) + ')';
            }
        }
        if (isArray) {
            suffixType = suffixType + '[]';
        }
        if (isMapping) {
            return 'mapping' + suffixType;
        }
        return literalType + suffixType;
    }
    createFunctionParamsSnippet(params) {
        let paramsSnippet = '';
        let counter = 0;
        if (typeof params !== 'undefined' && params !== null) {
            params.forEach(parameterElement => {
                const typeString = this.getTypeString(parameterElement.literal);
                counter = counter + 1;
                const currentParamSnippet = '${' + counter + ':' + parameterElement.id + '}';
                if (paramsSnippet === '') {
                    paramsSnippet = currentParamSnippet;
                }
                else {
                    paramsSnippet = paramsSnippet + ', ' + currentParamSnippet;
                }
            });
        }
        return paramsSnippet;
    }
    createParamsInfo(params) {
        let paramsInfo = '';
        if (typeof params !== 'undefined' && params !== null) {
            if (params.hasOwnProperty('params')) {
                params = params.params;
            }
            params.forEach(parameterElement => {
                const typeString = this.getTypeString(parameterElement.literal);
                let currentParamInfo = '';
                if (typeof parameterElement.id !== 'undefined' && parameterElement.id !== null) { // no name on return parameters
                    currentParamInfo = typeString + ' ' + parameterElement.id;
                }
                else {
                    currentParamInfo = typeString;
                }
                if (paramsInfo === '') {
                    paramsInfo = currentParamInfo;
                }
                else {
                    paramsInfo = paramsInfo + ', ' + currentParamInfo;
                }
            });
        }
        return paramsInfo;
    }
    createFunctionEventCompletionItem(contractElement, type, contractName) {
        const completionItem = vscode_languageserver_1.CompletionItem.create(contractElement.name);
        completionItem.kind = vscode_languageserver_1.CompletionItemKind.Function;
        const paramsInfo = this.createParamsInfo(contractElement.params);
        const paramsSnippet = this.createFunctionParamsSnippet(contractElement.params);
        let returnParamsInfo = this.createParamsInfo(contractElement.returnParams);
        if (returnParamsInfo !== '') {
            returnParamsInfo = ' returns (' + returnParamsInfo + ')';
        }
        completionItem.insertTextFormat = 2;
        completionItem.insertText = contractElement.name + '(' + paramsSnippet + ');';
        const info = '(' + type + ' in ' + contractName + ') ' + contractElement.name + '(' + paramsInfo + ')' + returnParamsInfo;
        completionItem.documentation = info;
        completionItem.detail = info;
        return completionItem;
    }
    getDocumentCompletionItems(documentText) {
        const completionItems = [];
        try {
            const result = solparse.parse(documentText);
            // console.log(JSON.stringify(result));
            // TODO struct, modifier
            result.body.forEach(element => {
                if (element.type === 'ContractStatement' || element.type === 'LibraryStatement') {
                    const contractName = element.name;
                    if (typeof element.body !== 'undefined' && element.body !== null) {
                        element.body.forEach(contractElement => {
                            if (contractElement.type === 'FunctionDeclaration') {
                                // ignore the constructor TODO add to contract initialiasation
                                if (contractElement.name !== contractName) {
                                    completionItems.push(this.createFunctionEventCompletionItem(contractElement, 'function', contractName));
                                }
                            }
                            if (contractElement.type === 'EventDeclaration') {
                                completionItems.push(this.createFunctionEventCompletionItem(contractElement, 'event', contractName));
                            }
                            if (contractElement.type === 'StateVariableDeclaration') {
                                const completionItem = vscode_languageserver_1.CompletionItem.create(contractElement.name);
                                completionItem.kind = vscode_languageserver_1.CompletionItemKind.Field;
                                const typeString = this.getTypeString(contractElement.literal);
                                completionItem.detail = '(state variable in ' + contractName + ') '
                                    + typeString + ' ' + contractElement.name;
                                completionItems.push(completionItem);
                            }
                        });
                    }
                }
            });
        }
        catch (error) {
            // gracefule catch
            // console.log(error.message);
        }
        // console.log('file completion items' + completionItems.length);
        return completionItems;
    }
    getAllCompletionItems(documentText, documentPath, packageDefaultDependenciesDirectory, packageDefaultDependenciesContractsDirectory) {
        if (this.rootPath !== 'undefined' && this.rootPath !== null) {
            const contracts = new contractsCollection_1.ContractCollection();
            contracts.addContractAndResolveImports(documentPath, documentText, projectService_1.initialiseProject(this.rootPath, packageDefaultDependenciesDirectory, packageDefaultDependenciesContractsDirectory));
            let completionItems = [];
            contracts.contracts.forEach(contract => {
                completionItems = completionItems.concat(this.getDocumentCompletionItems(contract.code));
            });
            // console.log('total completion items' + completionItems.length);
            return completionItems;
        }
        else {
            return this.getDocumentCompletionItems(documentText);
        }
    }
}
exports.CompletionService = CompletionService;
function GetCompletionTypes() {
    const completionItems = [];
    const types = ['address', 'string', 'bytes', 'byte', 'int', 'uint', 'bool', 'hash'];
    for (let index = 8; index <= 256; index += 8) {
        types.push('int' + index);
        types.push('uint' + index);
        types.push('bytes' + index / 8);
    }
    types.forEach(type => {
        const completionItem = vscode_languageserver_1.CompletionItem.create(type);
        completionItem.kind = vscode_languageserver_1.CompletionItemKind.Keyword;
        completionItem.detail = type + ' type';
        completionItems.push(completionItem);
    });
    // add mapping
    return completionItems;
}
exports.GetCompletionTypes = GetCompletionTypes;
function CreateCompletionItem(label, kind, detail) {
    const completionItem = vscode_languageserver_1.CompletionItem.create(label);
    completionItem.kind = kind;
    completionItem.detail = detail;
    return completionItem;
}
function GetCompletionKeywords() {
    const completionItems = [];
    const keywords = ['modifier', 'mapping', 'break', 'continue', 'delete', 'else', 'for',
        'if', 'new', 'return', 'returns', 'while', 'using',
        'private', 'public', 'external', 'internal', 'payable', 'view', 'pure', 'case', 'do', 'else', 'finally',
        'in', 'instanceof', 'return', 'throw', 'try', 'typeof', 'yield', 'void'];
    keywords.forEach(unit => {
        const completionItem = vscode_languageserver_1.CompletionItem.create(unit);
        completionItem.kind = vscode_languageserver_1.CompletionItemKind.Keyword;
        completionItems.push(completionItem);
    });
    completionItems.push(CreateCompletionItem('contract', vscode_languageserver_1.CompletionItemKind.Class, null));
    completionItems.push(CreateCompletionItem('library', vscode_languageserver_1.CompletionItemKind.Class, null));
    completionItems.push(CreateCompletionItem('storage', vscode_languageserver_1.CompletionItemKind.Field, null));
    completionItems.push(CreateCompletionItem('memory', vscode_languageserver_1.CompletionItemKind.Field, null));
    completionItems.push(CreateCompletionItem('var', vscode_languageserver_1.CompletionItemKind.Field, null));
    completionItems.push(CreateCompletionItem('constant', vscode_languageserver_1.CompletionItemKind.Constant, null));
    completionItems.push(CreateCompletionItem('constructor', vscode_languageserver_1.CompletionItemKind.Constructor, null));
    completionItems.push(CreateCompletionItem('event', vscode_languageserver_1.CompletionItemKind.Event, null));
    completionItems.push(CreateCompletionItem('import', vscode_languageserver_1.CompletionItemKind.Module, null));
    completionItems.push(CreateCompletionItem('enum', vscode_languageserver_1.CompletionItemKind.Enum, null));
    completionItems.push(CreateCompletionItem('struct', vscode_languageserver_1.CompletionItemKind.Struct, null));
    completionItems.push(CreateCompletionItem('function', vscode_languageserver_1.CompletionItemKind.Function, null));
    return completionItems;
}
exports.GetCompletionKeywords = GetCompletionKeywords;
function GeCompletionUnits() {
    const completionItems = [];
    const etherUnits = ['wei', 'finney', 'szabo', 'ether'];
    etherUnits.forEach(unit => {
        const completionItem = vscode_languageserver_1.CompletionItem.create(unit);
        completionItem.kind = vscode_languageserver_1.CompletionItemKind.Unit;
        completionItem.detail = unit + ': ether unit';
        completionItems.push(completionItem);
    });
    const timeUnits = ['seconds', 'minutes', 'hours', 'days', 'weeks', 'years'];
    timeUnits.forEach(unit => {
        const completionItem = vscode_languageserver_1.CompletionItem.create(unit);
        completionItem.kind = vscode_languageserver_1.CompletionItemKind.Unit;
        if (unit !== 'years') {
            completionItem.detail = unit + ': time unit';
        }
        else {
            completionItem.detail = 'DEPRICATED: ' + unit + ': time unit';
        }
        completionItems.push(completionItem);
    });
    return completionItems;
}
exports.GeCompletionUnits = GeCompletionUnits;
function GetGlobalVariables() {
    return [
        {
            detail: 'Current block',
            kind: vscode_languageserver_1.CompletionItemKind.Variable,
            label: 'block',
        },
        {
            detail: 'Current Message',
            kind: vscode_languageserver_1.CompletionItemKind.Variable,
            label: 'msg',
        },
        {
            detail: '(uint): current block timestamp (alias for block.timestamp)',
            kind: vscode_languageserver_1.CompletionItemKind.Variable,
            label: 'now',
        },
        {
            detail: 'Current transaction',
            kind: vscode_languageserver_1.CompletionItemKind.Variable,
            label: 'tx',
        },
        {
            detail: 'ABI encoding / decoding',
            kind: vscode_languageserver_1.CompletionItemKind.Variable,
            label: 'abi',
        },
    ];
}
exports.GetGlobalVariables = GetGlobalVariables;
function GetGlobalFunctions() {
    return [
        {
            detail: 'assert(bool condition): throws if the condition is not met - to be used for internal errors.',
            insertText: 'assert(${1:condition});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            label: 'assert',
        },
        {
            detail: 'gasleft(): returns the remaining gas',
            insertText: 'gasleft();',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            label: 'gasleft',
        },
        {
            detail: 'blockhash(uint blockNumber): hash of the given block - only works for 256 most recent, excluding current, blocks',
            insertText: 'blockhash(${1:blockNumber});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Function,
            label: 'blockhash',
        },
        {
            detail: 'require(bool condition): reverts if the condition is not met - to be used for errors in inputs or external components.',
            insertText: 'require(${1:condition});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'require',
        },
        {
            // tslint:disable-next-line:max-line-length
            detail: 'require(bool condition, string message): reverts if the condition is not met - to be used for errors in inputs or external components. Also provides an error message.',
            insertText: 'require(${1:condition}, ${2:message});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'require',
        },
        {
            detail: 'revert(): abort execution and revert state changes',
            insertText: 'revert();',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'revert',
        },
        {
            detail: 'addmod(uint x, uint y, uint k) returns (uint):' +
                'compute (x + y) % k where the addition is performed with arbitrary precision and does not wrap around at 2**256',
            insertText: 'addmod(${1:x}, ${2:y}, ${3:k})',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'addmod',
        },
        {
            detail: 'mulmod(uint x, uint y, uint k) returns (uint):' +
                'compute (x * y) % k where the multiplication is performed with arbitrary precision and does not wrap around at 2**256',
            insertText: 'mulmod(${1:x}, ${2:y}, ${3:k})',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'mulmod',
        },
        {
            detail: 'keccak256(...) returns (bytes32):' +
                'compute the Ethereum-SHA-3 (Keccak-256) hash of the (tightly packed) arguments',
            insertText: 'keccak256(${1:x})',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'keccak256',
        },
        {
            detail: 'sha256(...) returns (bytes32):' +
                'compute the SHA-256 hash of the (tightly packed) arguments',
            insertText: 'sha256(${1:x})',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'sha256',
        },
        {
            detail: 'sha3(...) returns (bytes32):' +
                'alias to keccak256',
            insertText: 'sha3(${1:x})',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'sha3',
        },
        {
            detail: 'ripemd160(...) returns (bytes20):' +
                'compute RIPEMD-160 hash of the (tightly packed) arguments',
            insertText: 'ripemd160(${1:x})',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'ripemd160',
        },
        {
            detail: 'ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) returns (address):' +
                'recover the address associated with the public key from elliptic curve signature or return zero on error',
            insertText: 'ecrecover(${1:hash}, ${2:v}, ${3:r}, ${4:s})',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'ecrecover',
        },
    ];
}
exports.GetGlobalFunctions = GetGlobalFunctions;
function GetContextualAutoCompleteByGlobalVariable(lineText, wordEndPosition) {
    if (isAutocompleteTrigeredByVariableName('block', lineText, wordEndPosition)) {
        return getBlockCompletionItems();
    }
    if (isAutocompleteTrigeredByVariableName('msg', lineText, wordEndPosition)) {
        return getMsgCompletionItems();
    }
    if (isAutocompleteTrigeredByVariableName('tx', lineText, wordEndPosition)) {
        return getTxCompletionItems();
    }
    if (isAutocompleteTrigeredByVariableName('abi', lineText, wordEndPosition)) {
        return getAbiCompletionItems();
    }
    return null;
}
exports.GetContextualAutoCompleteByGlobalVariable = GetContextualAutoCompleteByGlobalVariable;
function isAutocompleteTrigeredByVariableName(variableName, lineText, wordEndPosition) {
    const nameLength = variableName.length;
    if (wordEndPosition >= nameLength
        // does it equal our name?
        && lineText.substr(wordEndPosition - nameLength, nameLength) === variableName) {
        return true;
    }
    return false;
}
function getBlockCompletionItems() {
    return [
        {
            detail: '(address): Current block miner’s address',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'coinbase',
        },
        {
            detail: '(bytes32): DEPRICATED In 0.4.22 use blockhash(uint) instead. Hash of the given block - only works for 256 most recent blocks excluding current',
            insertText: 'blockhash(${1:blockNumber});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'blockhash',
        },
        {
            detail: '(uint): current block difficulty',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'difficulty',
        },
        {
            detail: '(uint): current block gaslimit',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'gaslimit',
        },
        {
            detail: '(uint): current block number',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'number',
        },
        {
            detail: '(uint): current block timestamp as seconds since unix epoch',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'timestamp',
        },
    ];
}
function getTxCompletionItems() {
    return [
        {
            detail: '(uint): gas price of the transaction',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'gas',
        },
        {
            detail: '(address): sender of the transaction (full call chain)',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'origin',
        },
    ];
}
function getMsgCompletionItems() {
    return [
        {
            detail: '(bytes): complete calldata',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'data',
        },
        {
            detail: '(uint): remaining gas DEPRICATED in 0.4.21 use gasleft()',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'gas',
        },
        {
            detail: '(address): sender of the message (current call)',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'sender',
        },
        {
            detail: '(bytes4): first four bytes of the calldata (i.e. function identifier)',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'sig',
        },
        {
            detail: '(uint): number of wei sent with the message',
            kind: vscode_languageserver_1.CompletionItemKind.Property,
            label: 'value',
        },
    ];
}
function getAbiCompletionItems() {
    return [
        {
            detail: 'encode(..) returs (bytes): ABI-encodes the given arguments',
            insertText: 'encode(${1:arg});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'encode',
        },
        {
            detail: 'encodePacked(..) returns (bytes): Performes packed encoding of the given arguments',
            insertText: 'encodePacked(${1:arg});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'encodePacked',
        },
        {
            detail: 'encodeWithSelector(bytes4,...) returns (bytes): ABI-encodes the given arguments starting from the second and prepends the given four-byte selector',
            insertText: 'encodeWithSelector(${1:bytes4}, ${2:arg});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'encodeWithSelector',
        },
        {
            detail: 'encodeWithSignature(string,...) returns (bytes): Equivalent to abi.encodeWithSelector(bytes4(keccak256(signature), ...)`',
            insertText: 'encodeWithSignature(${1:signatureString}, ${2:arg});',
            insertTextFormat: 2,
            kind: vscode_languageserver_1.CompletionItemKind.Method,
            label: 'encodeWithSignature',
        },
    ];
}
//# sourceMappingURL=completionService.js.map