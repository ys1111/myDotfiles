"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vs = require("vscode");
const fs = require("fs");
const cp = require("child_process");
const path = require("path");
const detectBundledRubocop = () => {
    try {
        cp.execSync('bundle show rubocop', { cwd: vs.workspace.rootPath });
        return true;
    }
    catch (e) {
        return false;
    }
};
const autodetectExecutePath = cmd => {
    const key = 'PATH';
    let paths = process.env[key];
    if (!paths) {
        return '';
    }
    let pathparts = paths.split(path.delimiter);
    for (let i = 0; i < pathparts.length; i++) {
        let binpath = path.join(pathparts[i], cmd);
        if (fs.existsSync(binpath)) {
            return pathparts[i] + path.sep;
        }
    }
    return '';
};
/**
 * Read the workspace configuration for 'ruby.rubocop' and return a RubocopConfig.
 * @return {RubocopConfig} config object
 */
exports.getConfig = () => {
    const win32 = process.platform === 'win32';
    const cmd = win32 ? 'rubocop.bat' : 'rubocop';
    const conf = vs.workspace.getConfiguration('ruby.rubocop');
    let useBundler = conf.get('useBundler', false);
    let configPath = conf.get('executePath', '');
    let suppressRubocopWarnings = conf.get('suppressRubocopWarnings', false);
    let command;
    // if executePath is present in workspace config, use it.
    if (configPath.length !== 0) {
        command = configPath + cmd;
    }
    else if (useBundler || detectBundledRubocop()) {
        useBundler = true;
        command = `bundle exec ${cmd}`;
    }
    else {
        const detectedPath = autodetectExecutePath(cmd);
        if (0 === detectedPath.length) {
            vs.window.showWarningMessage('execute path is empty! please check ruby.rubocop.executePath');
        }
        command = detectedPath + cmd;
    }
    return {
        command,
        configFilePath: conf.get('configFilePath', ''),
        onSave: conf.get('onSave', true),
        useBundler,
        suppressRubocopWarnings,
    };
};
exports.onDidChangeConfiguration = rubocop => {
    return () => (rubocop.config = exports.getConfig());
};
//# sourceMappingURL=configuration.js.map