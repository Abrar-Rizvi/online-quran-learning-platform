import type { Element, ElementContent, Root } from "hast";
import Link from "next/link";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteImage } from "@/components/site-image";
import { localImagePath } from "@/lib/image-alts";
import { cn } from "@/lib/utils";

/*
 * Safe Markdown → React for blog posts (admin preview now, public pages later).
 *
 * - Raw HTML is never rendered: `skipHtml` drops it and there is no rehype-raw.
 * - react-markdown's default urlTransform blanks unsafe URLs (javascript:,
 *   data:, vbscript:…); the components below then render those as plain text.
 * - A synchronous component with no hooks, so it works in Server Components
 *   and inside client components (the editor's Preview) alike.
 */

const EXTERNAL = /^https?:\/\//i;
/** Site-relative ("/courses"), but not protocol-relative ("//host"). */
const INTERNAL = /^\/(?!\/)/;

/** Drops react-markdown's `node` (the syntax-tree node) so it isn't spread onto the DOM element. */
function omitNode<T extends ExtraProps>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

const LETTER = /\p{L}/u;
const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

/** Whether the first letter in a block is Arabic script (Arabic, Urdu, Persian…). Also used by the chat replies. */
export function startsWithArabic(node: Element | undefined): boolean {
  const walk = (children: ElementContent[]): boolean | null => {
    for (const child of children) {
      if (child.type === "text") {
        const letter = child.value.match(LETTER)?.[0];
        if (letter) return ARABIC_SCRIPT.test(letter);
      } else if (child.type === "element") {
        const found = walk(child.children);
        if (found !== null) return found;
      }
    }
    return null;
  };
  return node ? walk(node.children) === true : false;
}

/**
 * Blocks get dir="auto" so the browser picks the direction from their first
 * strong character; blocks that start in Arabic script also get `md-arabic`
 * (Arabic font, larger size). A class rather than CSS :dir(rtl), because
 * Tailwind v4's CSS compiler rewrites :dir() into a :lang() list, which
 * dir="auto" never matches.
 */
function blockClass(node: Element | undefined, className: string | undefined) {
  return cn(className, startsWithArabic(node) && "md-arabic") || undefined;
}

/** The post title is the page's heading, so content headings start at h2 and stop at h4. */
const components: Components = {
  h1: (props) => <h2 dir="auto" {...omitNode(props)} />,
  h2: (props) => <h2 dir="auto" {...omitNode(props)} />,
  h3: (props) => <h3 dir="auto" {...omitNode(props)} />,
  h4: (props) => <h4 dir="auto" {...omitNode(props)} />,
  h5: (props) => <h4 dir="auto" {...omitNode(props)} />,
  h6: (props) => <h4 dir="auto" {...omitNode(props)} />,
  p: ({ node, className, ...props }) => <p dir="auto" className={blockClass(node, className)} {...props} />,
  li: ({ node, className, ...props }) => <li dir="auto" className={blockClass(node, className)} {...props} />,
  blockquote: ({ node, className, ...props }) => (
    <blockquote dir="auto" className={blockClass(node, className)} {...props} />
  ),

  a: ({ href, children, ...rest }) => {
    const props = omitNode(rest);
    const url = href ?? "";
    if (INTERNAL.test(url)) {
      const { title, ...linkProps } = props;
      const nofollow = title === "nofollow";
      return (
        <Link href={url} {...linkProps} title={nofollow ? undefined : title} rel={nofollow ? "nofollow" : undefined}>
          {children}
        </Link>
      );
    }
    if (EXTERNAL.test(url)) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    }
    if (/^(#|mailto:)/i.test(url)) {
      return (
        <a href={url} {...props}>
          {children}
        </a>
      );
    }
    // Unsafe (blanked by urlTransform) or ambiguous relative URLs: text only, no link.
    return <span>{children}</span>;
  },

  img: ({ src, alt }) => {
    if (typeof src !== "string" || !(EXTERNAL.test(src) || localImagePath(src))) return null;
    return <SiteImage as="img" src={src} alt={alt ?? ""} loading="lazy" decoding="async" />;
  },

  // Wide tables scroll inside their own box; focusable so keyboard users can scroll it too.
  table: (props) => (
    <div className="md-table" role="region" aria-label="Table" tabIndex={0}>
      <table {...omitNode(props)} />
    </div>
  ),
};

const remarkPlugins = [remarkGfm];

function headingText(children: ElementContent[]): string {
  return children.map((child) => {
    if (child.type === "text") return child.value;
    if (child.type !== "element") return "";
    if (child.tagName === "br") return " ";
    return headingText(child.children);
  }).join("");
}

/** Read the same HTML tree the renderer uses, before its heading components run. */
export function findMarkdownH1s(markdown: string) {
  const headings: { text: string; start: number; end: number }[] = [];
  function visit(tree: Root | Element) {
    for (const node of tree.children) {
      if (node.type !== "element") continue;
      if (node.tagName === "h1") {
        const start = node.position?.start.offset;
        const end = node.position?.end.offset;
        const text = headingText(node.children).replace(/\s+/g, " ").trim();
        if (text && start !== undefined && end !== undefined) headings.push({ text, start, end });
      } else {
        visit(node);
      }
    }
  }
  Markdown({
    children: markdown,
    remarkPlugins,
    rehypePlugins: [() => (tree: Root) => {
      visit(tree);
      // The caller only needs the headings, so skip building React elements.
      return { type: "root", children: [] } satisfies Root;
    }],
  });
  return headings;
}

export function MarkdownContent({
  children,
  className,
  h1Offset,
}: {
  children: string;
  className?: string;
  /** The source offset of the one H1 allowed in this Markdown fragment. */
  h1Offset?: number;
}) {
  const markdownComponents: Components = h1Offset === undefined ? components : {
    ...components,
    h1: ({ node, className, ...props }) => (
      node?.position?.start.offset === h1Offset
        ? <h1 dir="auto" className={blockClass(node, className)} {...props} />
        : <h2 dir="auto" className={className} {...props} />
    ),
  };

  return (
    <div className={cn("md-prose", className)}>
      <Markdown remarkPlugins={remarkPlugins} skipHtml components={markdownComponents}>
        {children}
      </Markdown>
    </div>
  );
}
