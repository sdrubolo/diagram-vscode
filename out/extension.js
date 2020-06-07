"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const builder_1 = require("./builder");
const fs = require("fs");
const path = require("path");
const { convert } = require("convert-svg-to-png");
const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");
const { parse } = require("svg-parser");
const helper_1 = require("./helper");
class InlinePreview {
    constructor(context, document, font, filename) {
        this.document = document;
        this.font = font;
        this.staticFolder = path.join(context.extensionPath, "static");
        this.resource = `vscode-resource:${this.staticFolder}`;
        this.previewPanel = vscode.window.createWebviewPanel("diagram Preview", `Diagram Preview : ${filename}`, vscode.ViewColumn.Two, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        this.previewPanel.webview.html = this.provideTextDocumentContent();
    }
    updateTextDocumentContent(content) {
        this.document = content.replace(this.font, `vscode-resource:${this.font}`);
        this.previewPanel.webview.postMessage({
            command: "reload",
            svg: this.document,
        });
    }
    provideTextDocumentContent() {
        return `<html>
              <head>
                <link rel="stylesheet" href="${this.resource}/css/diagram.css">
                <script type="text/javascript" src="${this.resource}/js/jquery.js"></script>
                <script type="text/javascript" src="${this.resource}/js/viewer.js"></script>
              </head>
              <body>
                <div class="diagram-content">           
                  <div class="flow-diagram-controls">
                    <div class="flow-diagram-controls-group btn-group">
                      <button class="btn btn-decrease">-</button><button class="btn reset-zoom-button">100%</button><button class="btn btn-increase">+</button>
                    </div>
                  </div>
                  <div class="flow-diagram-container" style="overflow: scroll; text-align:center;">${this.document.replace(this.font, `vscode-resource:${this.font}`)}
                  </div>
                </div>
                <script type="text/javascript"> 
                  let manager; 
                  window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'reload':
                            manager.update($(message.svg))
                            break;
                    }
                  });
                  $(function () {
                    manager = new Manager().init($("svg"));
                    manager.load();
                  });
                </script>
            </body>
          </html>`;
    }
}
let tabStore = {};
let currentEnditor;
let helper;
const suggestions = {
    participant: {
        src: "participant.svg",
        label: "Participant",
        suggestion: "participant A\n",
    },
    title: {
        src: "title.svg",
        label: "Title",
        suggestion: "title This is a title\nparticipant A\n",
    },
    request_alt: {
        src: "request_alt.svg",
        label: "Alternatives",
        suggestion: "alt alt\n \ta -> b : label\nelse else\n \tb -> a : label\nend\n",
    },
    request_opt: {
        src: "request_opt.svg",
        label: "Optional",
        suggestion: "opt opt\n \ta -> b : label\nend\n",
    },
    request_lost: {
        src: "request_lost.svg",
        label: "Message Lost",
        suggestion: "a -X b : label\n",
    },
    request: {
        src: "request.svg",
        label: "Request",
        suggestion: "a -> b : label\n",
    },
    request_dash: {
        src: "request_dash.svg",
        label: "Dashed Request",
        suggestion: "a --> b : label\n",
    },
    destroy: {
        src: "destroy.svg",
        label: "Destroy",
        suggestion: "a -X a : label\ndestroy a\n",
    },
    note: {
        src: "note.svg",
        label: "Notes",
        suggestion: "note over a,b: text1\nnote left of a: text2\nnote right of a\n\tmultiline\n\ttext\nend note\n",
    },
    request_loop: {
        src: "request_loop.svg",
        label: "Loop",
        suggestion: "loop loop\n \ta -> b : label\nend\n",
    },
    request_block: {
        src: "request_block.svg",
        label: "Request Block",
        suggestion: "a ->+ b : label\nb ->- a : label\n",
    },
    request_self: {
        src: "request_self.svg",
        label: "Self Request",
        suggestion: "a -> a : label\n",
    },
    delay: {
        src: "delay.svg",
        label: "Delay",
        suggestion: "participant a\n...test...\n",
    },
    request_group: {
        src: "request_group.svg",
        label: "Group",
        suggestion: "group group\na -> b : label\nend group\n",
    },
    request_data_json: {
        src: "request_data.svg",
        label: "Request Data (json)",
        suggestion: 'a -> b : label\ndata application/json\n{\n\t"action":"on"\n}\nend data\n',
    },
    request_data_form: {
        src: "request_data2.svg",
        label: "Request Data (form)",
        suggestion: 'a -> b : label\ndata application/x-www-form-urlencoded\naction="on";\nend data\n',
    },
    include: {
        src: "include.svg",
        label: "Include",
        suggestion: '$BLOCK_COMMENT_START\nAny occurence of "a" will be substituted with "B".\n if not substitution has to occure an empty list must be given\n e.g. a -> b : label will become B -> b : label \n$BLOCK_COMMENT_END\ninclude ./path_to_destroy {a/B}\n',
    },
};
const images = Object.entries(suggestions).map(([key, object]) => {
    const { src, label } = object;
    return { src, label, id: key };
});
function loadPreview(context, diagram, fileName, fontRoot) {
    return new Promise((resolve, rejects) => {
        if (!tabStore[fileName]) {
            tabStore[fileName] = new InlinePreview(context, diagram.document, fontRoot, fileName);
            vscode.workspace.registerTextDocumentContentProvider("Preview", tabStore[fileName]);
            tabStore[fileName].previewPanel.onDidDispose(() => {
                delete tabStore[fileName];
            }, null, context.subscriptions);
        }
        else {
            tabStore[fileName].updateTextDocumentContent(diagram.document);
        }
        resolve();
    });
}
function svgToPng(context, title, uri, path, fontUri) {
    return runBuild(context, title, uri, fontUri, (diagram) => convert(diagram.document).then((d) => {
        return new Promise((resolve, rejects) => {
            fs.writeFile(path, diagram.document, "base64", (err) => {
                if (err) {
                    return rejects(err);
                }
                resolve();
            });
        });
    }));
}
function svg(context, title, uri, path, fontUri) {
    return runBuild(context, title, uri, fontUri, (diagram) => new Promise((resolve, rejects) => {
        fs.writeFile(path, diagram.document, (err) => {
            if (err) {
                return rejects(err);
            }
            resolve();
        });
    }));
}
function svgToPdf(context, title, uri, path, fontUri) {
    return runBuild(context, title, uri, fontUri, (diagram) => new Promise((resolve, rejects) => {
        const parsed = parse(diagram.document);
        const root = parsed.children[0];
        const { properties: { width, height }, } = root;
        const widthPt = (width * 72) / 96;
        const heightPt = (height * 72) / 96;
        const doc = new PDFDocument({
            compress: true,
            size: [widthPt, heightPt],
        });
        const stream = fs.createWriteStream(path);
        SVGtoPDF(doc, diagram.document, 0, 0, {
            width: widthPt,
            height: heightPt,
            fontCallback: () => fontUri,
        });
        doc.pipe(stream);
        doc.end();
        resolve();
    }));
}
function convertDiagram(context, uri, type, fontUri) {
    const path = uri.replace(/\.diagram/, `.${type}`);
    let fn;
    switch (type) {
        case "pdf": {
            fn = svgToPdf;
            break;
        }
        case "png": {
            fn = svgToPng;
            break;
        }
        case "svg": {
            fn = svg;
            break;
        }
    }
    if (fn) {
        fn(context, "Exporting file", uri, path, fontUri).then(() => vscode.window
            .showInformationMessage("Diagram exported successfully", ...["Open"])
            .then((key) => {
            if (key) {
                const uri = vscode.Uri.file(path);
                vscode.commands.executeCommand("vscode.open", uri);
            }
        }));
    }
}
function cleanErrors() {
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && largeNumberDecorationType) {
        largeNumberDecorationType.dispose();
    }
}
function runBuild(context, title, uri, fontUri, success) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title,
    }, (progress, token) => __awaiter(this, void 0, void 0, function* () {
        cleanErrors();
        const fileContent = fs.readFileSync(uri).toString();
        new builder_1.default()
            .build(context, fileContent, fontUri, uri)
            .then((diagram) => {
            success(diagram);
        })
            .catch((error) => {
            showErrors(context, error);
        })
            .then(() => progress.report({ increment: 0 }));
    }));
}
let largeNumberDecorationType;
function showErrors(context, error) {
    let activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return;
    }
    const errorIcon = `${path.join(context.extensionPath, "images", "errors")}/error.svg`;
    largeNumberDecorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: errorIcon,
        gutterIconSize: "65%",
    });
    const text = activeEditor.document.getText();
    const rows = text.split("\n");
    const parsingErrors = [];
    const errorRow = error.row - 1;
    const decoration = {
        range: new vscode.Range(new vscode.Position(errorRow, 0), new vscode.Position(errorRow, rows[errorRow].length)),
        hoverMessage: error.message,
    };
    parsingErrors.push(decoration);
    activeEditor.setDecorations(largeNumberDecorationType, parsingErrors);
    vscode.window
        .showErrorMessage(`Error while generating diagram: ${error.message}`, ...["Ok"])
        .then((key) => {
        if (key) {
            cleanErrors();
        }
    });
}
function insertSugestion(suggestion) {
    if (currentEnditor &&
        isDiagramEditor(currentEnditor) &&
        suggestions[suggestion]) {
        currentEnditor.insertSnippet(new vscode.SnippetString(suggestions[suggestion].suggestion));
        currentEnditor.document.save();
    }
    else {
        vscode.window.showErrorMessage(`No active editor found to insert the selected snipped`, ...["Ok"]);
    }
}
function isDiagramEditor(editor) {
    return editor && editor.document.languageId === "diagram";
}
function activate(context) {
    const fontRoot = path.join(context.extensionPath, "static", "fonts");
    const fonrURI = `${fontRoot}/UbuntuMono-Regular.ttf`;
    vscode.workspace.onDidSaveTextDocument((td) => {
        const tabName = path.basename(td.uri.fsPath);
        if (tabStore[tabName]) {
            runBuild(context, "Loading Diagram Preview", td.uri.fsPath, fonrURI, (diagram) => loadPreview(context, diagram, path.basename(td.uri.fsPath), fontRoot));
        }
    });
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            currentEnditor = editor;
        }
    });
    context.subscriptions.push(vscode.commands.registerCommand("diagram.show", (uri) => {
        runBuild(context, "Starting Diagram Preview", uri.fsPath, fonrURI, (diagram) => loadPreview(context, diagram, path.basename(uri.fsPath), fontRoot));
    }));
    currentEnditor = vscode.window.activeTextEditor;
    context.subscriptions.push(vscode.commands.registerCommand("diagram.convert-png", (uri) => {
        convertDiagram(context, uri.fsPath, "png", fonrURI);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("diagram.helper", () => {
        if (!helper) {
            helper = new helper_1.default(context, images);
            vscode.workspace.registerTextDocumentContentProvider("Preview", helper);
            helper.previewPanel.onDidDispose(() => {
                helper = undefined;
            }, null, context.subscriptions);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("diagram.convert-pdf", (uri) => {
        convertDiagram(context, uri.fsPath, "pdf", fonrURI);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("diagram.convert-svg", (uri) => {
        convertDiagram(context, uri.fsPath, "svg", fonrURI);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("diagram.suggestion", (uri) => {
        insertSugestion(uri);
    }));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {
    tabStore = {};
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map