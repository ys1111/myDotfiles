'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const contract_1 = require("./contract");
class ContractCollection {
    constructor() {
        this.contracts = new Array();
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
    addContractAndResolveImports(contractPath, code) {
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
                        this.addContractAndResolveImports(foundImport, importContractCode);
                    }
                }
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
}
exports.ContractCollection = ContractCollection;
//# sourceMappingURL=contract-collection.js.map