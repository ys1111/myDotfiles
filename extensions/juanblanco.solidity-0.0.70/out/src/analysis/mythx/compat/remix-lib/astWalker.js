"use strict";
/* This is modified from remix-lib/astWalker.js to use the newer solc AST format
*/
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Crawl the given AST through the function walk(ast, callback)
 */
class AstWalker {
    /**
     * visit all the AST nodes
     *
     * @param {Object} ast  - AST node
     * @param {Object or Function} callback  - if (Function) the function will be called for every node.
     *                                       - if (Object) callback[<Node Type>] will be called for
     *                                         every node of type <Node Type>. callback["*"] will be called fo all other nodes.
     *                                         in each case, if the callback returns false it does not descend into children.
     *                                         If no callback for the current type, children are visited.
     */
    walk(ast, callback) {
        if (callback instanceof Function) {
            callback = { '*': callback };
        }
        if (!('*' in callback)) {
            callback['*'] = function () { return true; };
        }
        if (this.manageCallBack(ast, callback) && ast.nodes && ast.nodes.length > 0) {
            for (const child of ast.nodes) {
                this.walk(child, callback);
            }
        }
    }
    /**
    * walk the given @astList
    *
    * @param {Object} sourcesList - sources list (containing root AST node)
    * @param {Function} - callback used by AstWalker to compute response
    */
    walkAstList(sourcesList, callback) {
        const walker = new AstWalker();
        for (const source of sourcesList) {
            walker.walk(source.ast, callback);
        }
    }
    manageCallBack(node, callback) {
        if (node.nodeType in callback) {
            return callback[node.nodeType](node);
        }
        else {
            return callback['*'](node);
        }
    }
}
exports.AstWalker = AstWalker;
//# sourceMappingURL=astWalker.js.map