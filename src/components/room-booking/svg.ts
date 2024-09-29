export function svgToDataUrl(svg: string): string {
  const encoded = svg
    .replace(
      "<svg",
      ~svg.indexOf("xmlns")
        ? "<svg"
        : '<svg xmlns="http://www.w3.org/2000/svg"',
    )
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/\{/g, "%7B")
    .replace(/\}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");

  return `url("data:image/svg+xml;utf8,${encoded}")`;
}
