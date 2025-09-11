import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'

export default function MessageFormatter({ children, className }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Keep text sizes consistent with existing chat
          p: ({ children }) => <span className="whitespace-pre-wrap">{children}</span>,
          h1: ({ children }) => <span className="font-semibold">{children}</span>,
          h2: ({ children }) => <span className="font-semibold">{children}</span>,
          h3: ({ children }) => <span className="font-medium">{children}</span>,
          h4: ({ children }) => <span className="font-medium">{children}</span>,
          h5: ({ children }) => <span className="font-medium">{children}</span>,
          h6: ({ children }) => <span className="font-medium">{children}</span>,
          strong: ({ children }) => <strong>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          code: ({ inline, children }) => 
            inline ? (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ) : (
              <pre className="bg-gray-100 p-2 rounded mt-1 mb-1 overflow-x-auto">
                <code className="text-xs font-mono">{children}</code>
              </pre>
            ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-2 ml-1 italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <table className="border-collapse border border-gray-300 mt-2 mb-2 text-xs">
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-2 py-1">
              {children}
            </td>
          ),
          // Handle math components
          span: ({ className, children }) => {
            if (className?.includes('math-inline')) {
              return <InlineMath math={children} />
            }
            if (className?.includes('math-display')) {
              return <BlockMath math={children} />
            }
            return <span className={className}>{children}</span>
          },
          div: ({ className, children }) => {
            if (className?.includes('math-display')) {
              return <BlockMath math={children} />
            }
            return <div className={className}>{children}</div>
          }
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
