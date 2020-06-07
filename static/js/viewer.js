function Manager() {
  let svg;
  let scaleElement;
  let svgIntialHeight;
  let svgIntialWidth;
  let svgContainer = $(".flow-diagram-container").first();
  let zoomOutButton = $(".btn-decrease");
  let zoomInButton = $(".btn-increase");

  let initialRate = 1;
  let rate;

  const resize = () => {
    svgContainer.width(window.innerWidth);
    svgContainer.height(
      window.innerHeight - $(".flow-diagram-controls").height() - 1
    );
  };

  window.addEventListener("resize", resize);

  const setAsNewDiagram = (startRate) => {
    initialRate = svgContainer.width() / svgIntialWidth;
    rate = startRate || initialRate;
    const { newHeight, newWidth } = computeSizeByRate(rate);
    computeSize(rate, newHeight, newWidth);
  };

  const computeSizeByRate = (rate) => {
    const newHeight = svgIntialHeight * rate;
    const newWidth = svgIntialWidth * rate;
    return { newHeight, newWidth };
  };

  const computeSize = (newRate, height, width) => {
    rate = newRate;
    scaleElement.attr("transform", `scale(${newRate})`);
    svg.attr("width", width);
    svg.attr("height", height);
  };

  const zoomReset = () => {
    const { newHeight, newWidth } = computeSizeByRate(initialRate);
    computeSize(initialRate, newHeight, newWidth);
  };

  const zoomIn = () => {
    const newRate = rate + 0.1;
    const { newHeight, newWidth } = computeSizeByRate(newRate);
    computeSize(newRate, newHeight, newWidth);
    if (newRate - 0.1 > 0) {
      zoomOutButton.removeAttr("disabled");
    }
  };

  const zoomOut = () => {
    const newRate = rate - 0.1;
    const { newHeight, newWidth } = computeSizeByRate(newRate);
    computeSize(newRate, newHeight, newWidth);
    if (newRate - 0.1 <= 0) {
      zoomOutButton.attr("disabled", "true");
    }
  };

  const addSvgInContainer = (doc) => {
    svgContainer.html(doc);
  };

  zoomOutButton.bind("click", () => zoomOut());
  zoomInButton.bind("click", () => zoomIn());
  $(".reset-zoom-button").bind("click", () => zoomReset());

  this.init = (doc) => {
    svg = doc;
    scaleElement = doc.find("g").first();
    svgIntialHeight = doc.height();
    svgIntialWidth = doc.width();
    return this;
  };

  this.load = () => {
    resize();
    setAsNewDiagram();
  };

  this.update = (doc) => {
    addSvgInContainer(doc);
    this.init(doc);
    setAsNewDiagram(rate);
  };
}
