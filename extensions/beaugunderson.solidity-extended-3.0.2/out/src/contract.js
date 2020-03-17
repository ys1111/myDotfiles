'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const utilities_1 = require("./utilities");
class Contract {
    constructor(absoulePath, code) {
        this.absolutePath = utilities_1.formatPath(absoulePath);
        this.code = code;
        this.imports = new Array();
    }
    isImportLocal(importPath) {
        return importPath.startsWith('.');
    }
    replaceDependencyPath(importPath, depImportAbsolutePath) {
        let importRegEx = /(^\s?import\s+[^'"]*['"])(.*)(['"]\s*)/gm;
        this.code = this.code.replace(importRegEx, (match, p1, p2, p3) => {
            if (p2 === importPath) {
                return p1 + depImportAbsolutePath + p3;
            }
            else {
                return match;
            }
        });
    }
    resolveImports() {
        let importRegEx = /^\s?import\s+[^'"]*['"](.*)['"]\s*/gm;
        let foundImport = importRegEx.exec(this.code);
        while (foundImport != null) {
            let importPath = foundImport[1];
            if (this.isImportLocal(importPath)) {
                let importFullPath = utilities_1.formatPath(path.resolve(path.dirname(this.absolutePath), foundImport[1]));
                this.imports.push(importFullPath);
            }
            else {
                this.imports.push(importPath);
            }
            foundImport = importRegEx.exec(this.code);
        }
    }
}
exports.Contract = Contract;
//# sourceMappingURL=contract.js.map