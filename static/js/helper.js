function Helper(baseUrl, suggestions) {
  const suggestionContainer = $("#suggestionContainer");
  const vscode = acquireVsCodeApi();

  const resize = () => {
    suggestionContainer.width(window.innerWidth);
    suggestionContainer.height(window.innerHeight);
  };

  window.addEventListener("resize", resize);

  this.load = () => {
    suggestions.forEach((element) => {
      const image = $("<div></div>")
        .append(
          $("<img></img>")
            .attr("src", `${baseUrl}/${element.src}`)
            .css({ width: "200px" })
        )
        .addClass("gallery-image");
      const label = $("<label></label>").append(element.label);
      const item = $("<div></div>")
        .append(label)
        .append(image)
        .css({ width: "200px", margin: "auto" })
        .addClass("gallery-item");
      ((identifier) => {
        item.bind("click", function () {
          console.log(identifier);
          vscode.postMessage({
            command: "suggestion",
            identifier: identifier,
          });
        });
      })(element.id);
      suggestionContainer
        .append($("<div></div>").append(item).css({ padding: "15px 0px" }))
        .css({
          "text-align": "center",
        });
    });
  };

  resize();
}
