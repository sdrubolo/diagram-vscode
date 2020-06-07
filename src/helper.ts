import * as vscode from "vscode";
import * as path from "path";

export default class Helper implements vscode.TextDocumentContentProvider {
  onDidChange?: vscode.Event<vscode.Uri>;
  staticFolder: string;
  resource: string;
  previewPanel: any;
  helpImages: string;

  constructor(
    private context: vscode.ExtensionContext,
    private images: Array<Object>
  ) {
    this.staticFolder = path.join(context.extensionPath, "static");
    this.helpImages = `vscode-resource:${path.join(
      context.extensionPath,
      "images",
      "helper"
    )}`;
    this.resource = `vscode-resource:${this.staticFolder}`;
    this.previewPanel = vscode.window.createWebviewPanel(
      "diagram Preview",
      `Diagram Helper`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    this.previewPanel.webview.html = this.provideTextDocumentContent();

    this.previewPanel.webview.onDidReceiveMessage(
      (message: any) => {
        switch (message.command) {
          case "suggestion":
            vscode.commands.executeCommand(
              "diagram.suggestion",
              message.identifier
            );
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  }

  provideTextDocumentContent(): string {
    return `<html>
              <head>
                <link rel="stylesheet" href="${this.resource}/css/gallery.css">
				<script type="text/javascript" src="${this.resource}/js/jquery.js"></script>
				<script type="text/javascript" src="${this.resource}/js/helper.js"></script>
				<style>@font-face { font-family : "Ubuntu Mono";src : url("${
          this.resource
        }/fonts/UbuntuMono-Regular.ttf") format("truetype");}</style>
              </head>
              <body>
				<div id="suggestionContainer" style="overflow-y:auto">	
					<script type="text/javascript">
						const baseUrl = "${this.helpImages}";
						const suggestions = ${JSON.stringify(this.images)};
						new Helper(baseUrl,suggestions).load();
					</script>
				</div>
            </body>
          </html>`;
  }
}
