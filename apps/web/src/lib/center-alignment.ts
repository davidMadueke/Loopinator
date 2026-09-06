export type AlignmentAxis = "vertical" | "horizontal";

export type BoundingBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export type CenterChildInput = BoundingBox | { box: BoundingBox; label?: string };

export type CenterAlignmentOptions = {
  /** `vertical` checks top/bottom gaps. `horizontal` checks left/right. */
  axis?: AlignmentAxis;
  /** Allowed |before - after| in CSS pixels. Default 1 for subpixel rounding. */
  tolerance?: number;
};

export type ChildCenterReport = {
  label: string;
  before: number;
  after: number;
  delta: number;
  centered: boolean;
};

export type CenterAlignmentReport = {
  axis: AlignmentAxis;
  tolerance: number;
  parent: BoundingBox;
  children: [ChildCenterReport, ChildCenterReport];
  pass: boolean;
};

const DEFAULT_TOLERANCE = 1;

export function boundingBoxFromRect(
  rect: Pick<BoundingBox, "top" | "right" | "bottom" | "left">,
): BoundingBox {
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
}

function labeledBox(input: CenterChildInput, fallback: string): { box: BoundingBox; label: string } {
  if ("box" in input) {
    return { box: input.box, label: input.label ?? fallback };
  }
  return { box: input, label: fallback };
}

function childReport(
  parent: BoundingBox,
  child: BoundingBox,
  label: string,
  axis: AlignmentAxis,
  tolerance: number,
): ChildCenterReport {
  const before = axis === "vertical" ? child.top - parent.top : child.left - parent.left;
  const after = axis === "vertical" ? parent.bottom - child.bottom : parent.right - child.right;
  const delta = before - after;

  return {
    label,
    before,
    after,
    delta,
    centered: Math.abs(delta) <= tolerance,
  };
}

/**
 * Each child must sit equally far from opposite parent edges on one axis.
 * Vertical: top gap === bottom gap. Horizontal: left gap === right gap.
 */
export function evaluateCenterAlignment(
  parent: BoundingBox,
  children: readonly [CenterChildInput, CenterChildInput],
  options: CenterAlignmentOptions = {},
): CenterAlignmentReport {
  const axis = options.axis ?? "vertical";
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const first = labeledBox(children[0], "child-0");
  const second = labeledBox(children[1], "child-1");
  const reports: [ChildCenterReport, ChildCenterReport] = [
    childReport(parent, first.box, first.label, axis, tolerance),
    childReport(parent, second.box, second.label, axis, tolerance),
  ];

  return {
    axis,
    tolerance,
    parent,
    children: reports,
    pass: reports[0].centered && reports[1].centered,
  };
}

function unionBox(a: BoundingBox, b: BoundingBox): BoundingBox {
  const top = Math.min(a.top, b.top);
  const left = Math.min(a.left, b.left);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);
  return boundingBoxFromRect({ top, right, bottom, left });
}

/**
 * Layout box of `element`, or the ink of text nodes and nested SVGs when
 * `ink` is true. Use ink when wrappers stretch to the parent; those wrappers
 * would always look centered.
 */
export function boxOfElement(element: Element, options?: { ink?: boolean }): BoundingBox {
  if (!options?.ink) {
    return boundingBoxFromRect(element.getBoundingClientRect());
  }

  let union: BoundingBox | null = null;

  if (element instanceof SVGElement) {
    return boundingBoxFromRect(element.getBoundingClientRect());
  }

  for (const svg of element.querySelectorAll("svg")) {
    const next = boundingBoxFromRect(svg.getBoundingClientRect());
    union = union ? unionBox(union, next) : next;
  }

  if (typeof document !== "undefined" && "createRange" in document) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node = walker.nextNode();
    while (node) {
      if (node.textContent?.trim()) {
        range.selectNodeContents(node);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          const next = boundingBoxFromRect(rect);
          union = union ? unionBox(union, next) : next;
        }
      }
      node = walker.nextNode();
    }
  }

  return union ?? boundingBoxFromRect(element.getBoundingClientRect());
}

export type ElementChildInput = Element | { element: Element; label?: string; ink?: boolean };

function labeledElement(input: ElementChildInput, fallback: string) {
  if (input instanceof Element) {
    return { element: input, label: fallback, ink: undefined as boolean | undefined };
  }
  return { element: input.element, label: input.label ?? fallback, ink: input.ink };
}

export function evaluateElementCenterAlignment(
  parent: Element,
  children: readonly [ElementChildInput, ElementChildInput],
  options: CenterAlignmentOptions & { ink?: boolean } = {},
): CenterAlignmentReport {
  const first = labeledElement(children[0], "child-0");
  const second = labeledElement(children[1], "child-1");
  const ink = options.ink ?? false;

  return evaluateCenterAlignment(
    boxOfElement(parent),
    [
      { box: boxOfElement(first.element, { ink: first.ink ?? ink }), label: first.label },
      { box: boxOfElement(second.element, { ink: second.ink ?? ink }), label: second.label },
    ],
    options,
  );
}

export type OpticalAlignmentValues = {
  iconVisualCenterY: number;
  textBaselineY: number;
  textAscent: number;
  parentTop: number;
  parentBottom: number;
};

export type OpticalAlignmentReport = {
  tolerance: number;
  iconVisualCenterY: number;
  textBaselineY: number;
  textOpticalCenterY: number;
  parentMidY: number;
  iconToBaselineDelta: number;
  iconToTextOpticalDelta: number;
  iconToParentMidDelta: number;
  pass: boolean;
};

/**
 * Icon visual center vs text baseline (and the optical midpoint of the text
 * above that baseline). Pass when the painted icon center lines up with the
 * text optical center and with the parent midline.
 */
export function evaluateOpticalAlignment(
  values: OpticalAlignmentValues,
  options: Pick<CenterAlignmentOptions, "tolerance"> = {},
): OpticalAlignmentReport {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const textOpticalCenterY = values.textBaselineY - values.textAscent / 2;
  const parentMidY = (values.parentTop + values.parentBottom) / 2;
  const iconToBaselineDelta = values.iconVisualCenterY - values.textBaselineY;
  const iconToTextOpticalDelta = values.iconVisualCenterY - textOpticalCenterY;
  const iconToParentMidDelta = values.iconVisualCenterY - parentMidY;

  return {
    tolerance,
    iconVisualCenterY: values.iconVisualCenterY,
    textBaselineY: values.textBaselineY,
    textOpticalCenterY,
    parentMidY,
    iconToBaselineDelta,
    iconToTextOpticalDelta,
    iconToParentMidDelta,
    pass:
      Math.abs(iconToTextOpticalDelta) <= tolerance && Math.abs(iconToParentMidDelta) <= tolerance,
  };
}

function firstTextNode(root: Element): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if (node.textContent?.trim()) {
      return node as Text;
    }
    node = walker.nextNode();
  }
  return null;
}

function firstSvg(root: Element): SVGSVGElement | null {
  if (root instanceof SVGSVGElement) {
    return root;
  }
  return root.querySelector("svg");
}

function svgGeometryCenter(svg: SVGSVGElement): { x: number; y: number } {
  const fallback = svg.getBoundingClientRect();
  const mid = { x: fallback.left + fallback.width / 2, y: fallback.top + fallback.height / 2 };
  try {
    const box = svg.getBBox();
    const ctm = svg.getScreenCTM();
    if (!ctm || (box.width === 0 && box.height === 0)) {
      return mid;
    }
    const point = svg.createSVGPoint();
    point.x = box.x + box.width / 2;
    point.y = box.y + box.height / 2;
    const screen = point.matrixTransform(ctm);
    return { x: screen.x, y: screen.y };
  } catch {
    return mid;
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not rasterize SVG"));
    image.src = url;
  });
}

/** Painted-pixel centroid of the SVG, falling back to the tight path box. */
export async function measureIconVisualCenter(root: Element): Promise<{ x: number; y: number }> {
  const svg = firstSvg(root);
  if (!svg) {
    const box = boxOfElement(root, { ink: true });
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  const geometry = svgGeometryCenter(svg);
  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return geometry;
  }

  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(rect.width));
    clone.setAttribute("height", String(rect.height));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.style.color = getComputedStyle(svg).color;

    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    const image = await loadImage(url);
    const scale = 4;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width * scale));
    canvas.height = Math.max(1, Math.round(rect.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      return geometry;
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 16) {
          sumX += x;
          sumY += y;
          count += 1;
        }
      }
    }

    if (count === 0) {
      return geometry;
    }

    return {
      x: rect.left + (sumX / count + 0.5) / scale,
      y: rect.top + (sumY / count + 0.5) / scale,
    };
  } catch {
    return geometry;
  }
}

export function measureTextBaseline(root: Element): { baselineY: number; ascent: number } {
  const text = firstTextNode(root);
  if (!text) {
    const box = boxOfElement(root, { ink: true });
    return { baselineY: box.bottom, ascent: box.height };
  }

  const host = text.parentElement ?? root;
  const wrapper = document.createElement("span");
  wrapper.style.cssText = "display:inline;font:inherit;line-height:inherit";
  host.insertBefore(wrapper, text);
  wrapper.appendChild(text);

  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "display:inline-block;width:0;height:0;overflow:hidden;vertical-align:baseline;padding:0;border:0;margin:0";
  wrapper.appendChild(probe);
  const baselineY = probe.getBoundingClientRect().top;

  host.insertBefore(text, wrapper);
  wrapper.remove();

  const context = document.createElement("canvas").getContext("2d");
  if (!context) {
    return { baselineY, ascent: 0 };
  }

  context.font = getComputedStyle(host).font;
  const metrics = context.measureText(text.textContent?.trim() ?? "");
  const ascent = metrics.actualBoundingBoxAscent || metrics.fontBoundingBoxAscent || 0;
  return { baselineY, ascent };
}

export function measureIconVisualCenterSync(root: Element): { x: number; y: number } {
  const svg = firstSvg(root);
  if (!svg) {
    const box = boxOfElement(root, { ink: true });
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
  return svgGeometryCenter(svg);
}

export function evaluateElementOpticalAlignment(
  parent: Element,
  iconRoot: Element,
  textRoot: Element,
  options: Pick<CenterAlignmentOptions, "tolerance"> = {},
): OpticalAlignmentReport {
  const parentBox = boxOfElement(parent);
  const icon = measureIconVisualCenterSync(iconRoot);
  const text = measureTextBaseline(textRoot);
  return evaluateOpticalAlignment(
    {
      iconVisualCenterY: icon.y,
      textBaselineY: text.baselineY,
      textAscent: text.ascent,
      parentTop: parentBox.top,
      parentBottom: parentBox.bottom,
    },
    options,
  );
}
