"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path = require("path");
class Builder {
    constructor() { }
    build(context, diagram, font, resolvePath = "") {
        return new Promise((resolve, reject) => {
            let text = "";
            let error = "";
            const binaryVersion = process.platform === "darwin" ? "WebDiagram" : "WebDiagram_Linux";
            const childProcess = child_process_1.spawn(path.join(context.extensionPath, "sequence", binaryVersion), [font], {
                env: {
                    path: resolvePath,
                },
            });
            childProcess.stdin.write(diagram + "\n");
            childProcess.stdin.end();
            childProcess.stdout.on("data", (data) => {
                text += data;
            });
            childProcess.stderr.on("data", (data) => {
                error += data;
            });
            childProcess.on("close", (code) => {
                if (code === 0) {
                    const document = text.toString();
                    return resolve({ document });
                }
                reject(JSON.parse(error));
            });
        });
    }
}
exports.default = Builder;
//# sourceMappingURL=builder.js.map