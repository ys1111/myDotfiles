'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("../util");
const contract_1 = require("./contract");
class ContractCollection {
    constructor() {
        this.contracts = new Array();
    }
    findContract(contract, contractPath) {
        return contract.absolutePath === contractPath;
    }
    containsContract(contractPath) {
        return this.contracts.findIndex((contract) => contract.absolutePath === contractPath) > -1;
    }
    getContractsForCompilation() {
        let contractsForCompilation = {};
        this.contracts.forEach(contract => {
            contractsForCompilation[contract.absolutePath] = {
                content: contract.code,
            };
        });
        return contractsForCompilation;
    }
    addContractAndResolveImports(contractPath, code, project) {
        let contract = this.addContract(contractPath, code);
        if (!contract) {
            return null;
        }
        contract.resolveImports();
        contract.imports.forEach(foundImport => {
            if (fs.existsSync(foundImport)) {
                if (!this.containsContract(foundImport)) {
                    let importContractCode = this.readContractCode(foundImport);
                    if (importContractCode != null) {
                        this.addContractAndResolveImports(foundImport, importContractCode, project);
                    }
                }
            }
            else {
                this.addContractAndResolveDependencyImport(foundImport, contract, project);
            }
        });
    }
    addContract(contractPath, code) {
        if (!this.containsContract(contractPath)) {
            let contract = new contract_1.Contract(contractPath, code);
            this.contracts.push(contract);
            return contract;
        }
    }
    readContractCode(contractPath) {
        if (fs.existsSync(contractPath)) {
            return fs.readFileSync(contractPath, 'utf8');
        }
    }
    addContractAndResolveDependencyImport(dependencyImport, contract, project) {
        let depPack = project.findPackage(dependencyImport);
        if (depPack !== undefined) {
            let depImportPath = util.formatPath(depPack.resolveImport(dependencyImport));
            if (!this.containsContract(depImportPath)) {
                let importContractCode = this.readContractCode(depImportPath);
                if (importContractCode != null) {
                    this.addContractAndResolveImports(depImportPath, importContractCode, project);
                    contract.replaceDependencyPath(dependencyImport, depImportPath);
                }
            }
            else {
                contract.replaceDependencyPath(dependencyImport, depImportPath);
            }
        }
    }
}
exports.ContractCollection = ContractCollection;
//# sourceMappingURL=contractsCollection.js.map