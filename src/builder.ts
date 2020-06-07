import { spawn } from "child_process";
import * as vscode from "vscode";
import * as path from "path";

export default class Builder {
  constructor() {}

  build(
    context: vscode.ExtensionContext,
    diagram: string,
    font: string,
    resolvePath: string = ""
  ) {
    return new Promise((resolve, reject) => {
      let text = "";
      let error = "";
      const binaryVersion =
        process.platform === "darwin" ? "WebDiagram" : "WebDiagram_Linux";
      const childProcess = spawn(
        path.join(context.extensionPath, "sequence", binaryVersion),
        [font],
        {
          env: {
            path: resolvePath,
          },
        }
      );
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
