import Link from "next/link";
import Markdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { startsWithArabic } from "@/components/markdown/markdown-content";
import { classifyChatLink } from "@/lib/chat";
import { cn } from "@/lib/utils";

/*
 * Assistant replies as a small, safe Markdown subset (same rules as the blog renderer):
 * raw HTML is never rendered (`skipHtml`, no rehype-raw), unsafe URLs are blanked by
 * react-markdown's default urlTransform, and anything outside ALLOWED is unwrapped to text.
 */
const ALLOWED = ["p", "strong", "em", "ul", "ol", "li", "a", "br", "code", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "th", "td"];

function omitNode<T extends ExtraProps>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

const remarkPlugins = [remarkGfm];

const Heading: NonNullable<Components["h1"]> = ({ node, children }) => (
  <p dir="auto" className={cn("font-semibold", startsWithArabic(node) && "chat-arabic")}>
    {children}
  </p>
);

export function ChatReply({ text, onInternalLink }: { text: string; onInternalLink: () => void }) {
  const components: Components = {
    // Blocks pick their own direction; Urdu/Arabic blocks also get the Arabic font.
    p: ({ node, ...props }) => <p dir="auto" className={cn(startsWithArabic(node) && "chat-arabic")} {...props} />,
    li: ({ node, ...props }) => <li dir="auto" className={cn(startsWithArabic(node) && "chat-arabic")} {...props} />,
    // Headings are too loud in a chat bubble: shown as bold paragraphs.
    h1: Heading,
    h2: Heading,
    h3: Heading,
    h4: Heading,
    h5: Heading,
    h6: Heading,
    table: (props) => (
      <div className="chat-table" role="region" aria-label="Table" tabIndex={0}>
        <table {...omitNode(props)} />
      </div>
    ),
    a: ({ href, children }) => {
      const link = classifyChatLink(href);
      if (!link) return <span>{children}</span>;
      if (link.kind === "internal") {
        return (
          <Link href={link.path} onClick={onInternalLink}>
            {children}
          </Link>
        );
      }
      return (
        <a href={link.href} target="_blank" rel="noopener noreferrer">
          {children}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    },
  };

  return (
    <div className="chat-reply">
      <Markdown remarkPlugins={remarkPlugins} skipHtml allowedElements={ALLOWED} unwrapDisallowed components={components}>
        {text}
      </Markdown>
    </div>
  );
}
