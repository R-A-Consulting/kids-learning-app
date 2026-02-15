import React, { useState, Component } from 'react'
import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'
import katex from 'katex'
import 'katex/contrib/mhchem/mhchem.js' // Enable \ce{} for chemistry notation -- must come after katex import
import { InlineMath, BlockMath } from 'react-katex'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

// Verify mhchem registered (logs once in dev)
if (typeof katex.__defineMacro === 'function' && !katex.__registeredMhchem) {
  katex.__registeredMhchem = true
}

// React Error Boundary for KaTeX rendering -- catches render-phase errors
class MathErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return <code className="text-xs text-red-600 bg-red-50 px-1 py-0.5 rounded">{this.props.fallback}</code>
    }
    return this.props.children
  }
}

// Safe wrappers for KaTeX that fall back to raw text on parse errors
function SafeInlineMath({ math }) {
  return (
    <MathErrorBoundary fallback={math}>
      <InlineMath math={math} />
    </MathErrorBoundary>
  )
}

function SafeBlockMath({ math }) {
  return (
    <MathErrorBoundary fallback={math}>
      <BlockMath math={math} />
    </MathErrorBoundary>
  )
}

// Convert LaTeX delimiters to standard format for remark-math
// Handles \( \) for inline math, \[ \] for display math,
// and wraps bare \ce{...} in $...$ so remark-math picks it up
function preprocessMath(text) {
  if (!text || typeof text !== 'string') return text || '';
  let result = text
    .replace(/\\\(/g, '$')      // \( -> $
    .replace(/\\\)/g, '$')      // \) -> $
    .replace(/\\\[/g, '$$')     // \[ -> $$
    .replace(/\\\]/g, '$$');    // \] -> $$

  // Wrap bare \ce{...} (not already inside $...$) in inline math delimiters
  // Matches \ce{...} that is NOT preceded by $ or \(
  result = result.replace(/(?<!\$)\\ce\{([^}]*)\}/g, '$\\ce{$1}$')

  return result;
}

// Custom code block component with syntax highlighting and copy button
const CodeBlock = ({ language, children, className }) => {
  const [copied, setCopied] = useState(false)
  const codeString = Array.isArray(children) 
    ? children.join('') 
    : String(children).replace(/\n$/, '')
  const languageName = language || 'text'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
      {/* Language label and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wide">
          {languageName}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Syntax highlighted code */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={languageName}
          style={oneLight}
          customStyle={{
            margin: 0,
            padding: '12px',
            fontSize: '11px',
            lineHeight: '1.5',
            background: 'transparent',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }}
          PreTag="div"
          codeTagProps={{
            style: {
              fontFamily: 'inherit',
            },
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export default function MessageFormatter({ children, className, inline = false }) {
  // Preprocess to convert \( \) and \[ \] delimiters to $ and $$
  const processedContent = preprocessMath(children);
  
  // For inline rendering, use span instead of div
  const Wrapper = inline ? 'span' : 'div';
  
  // Store inline flag for use in components
  const isInline = inline;
  
  return (
    <Wrapper className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, errorColor: '#dc2626' }]]}
        components={{
          // Paragraphs with proper spacing
          p: ({ children }) => {
            if (isInline) {
              return <span className="whitespace-pre-wrap inline leading-relaxed">{children}</span>;
            }
            return <span className="whitespace-pre-wrap block my-1.5 leading-relaxed">{children}</span>;
          },
          
          // Headings with better hierarchy
          h1: ({ children }) => (
            <h1 className="font-bold text-base mt-4 mb-2 first:mt-0 leading-tight">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-semibold text-sm mt-3 mb-1.5 first:mt-0 leading-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-semibold text-xs mt-2.5 mb-1 first:mt-0 leading-tight">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-medium text-xs mt-2 mb-1 first:mt-0 leading-tight">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="font-medium text-xs mt-2 mb-1 first:mt-0 leading-tight">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="font-medium text-xs mt-2 mb-1 first:mt-0 leading-tight">{children}</h6>
          ),
          
          // Text formatting
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800">{children}</em>
          ),
          
          // Code blocks with syntax highlighting
          code: ({ inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeString = Array.isArray(children) 
              ? children.join('') 
              : String(children).trim()
            
            if (inline) {
              // Subtle inline code styling - no border, lighter background
              return (
                <code className="bg-gray-50 text-gray-700 px-1 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              )
            }
            
            // Check if this is just a simple math expression or variable
            // (not actual code that should be in a code block)
            const isSingleLine = !codeString.includes('\n')
            const isShort = codeString.length < 50
            const hasCodePatterns = codeString.includes('{') || 
              codeString.includes('}') || 
              codeString.includes('function') ||
              codeString.includes('const') ||
              codeString.includes('let') ||
              codeString.includes('var') ||
              codeString.includes('class ') ||
              codeString.includes('import ') ||
              codeString.includes('=>') ||
              codeString.includes('()') ||
              (codeString.includes('=') && codeString.includes(';'))
            
            const isSimpleExpression = isSingleLine && isShort && !hasCodePatterns && !language
            
            // If it's a simple expression, render as inline text (not a code block)
            if (isSimpleExpression) {
              return (
                <span className="inline-block font-mono text-gray-800 mx-0.5">{codeString}</span>
              )
            }
            
            // Only render fancy CodeBlock if:
            // 1. Language is explicitly specified, OR
            // 2. Content has multiple lines and looks like code
            const hasMultipleLines = codeString.includes('\n')
            const looksLikeCode = hasMultipleLines && (
              codeString.includes('{') || 
              codeString.includes('}') || 
              codeString.includes('function') ||
              codeString.includes('const') ||
              codeString.includes('let') ||
              codeString.includes('var') ||
              codeString.includes('class ') ||
              codeString.includes('import ') ||
              (codeString.includes('=') && codeString.includes(';'))
            )
            
            // If no language and doesn't look like code, render as simple pre block
            if (!language && !looksLikeCode && !isSimpleExpression) {
              return (
                <pre className="bg-gray-50 p-2 rounded mt-1 mb-1 overflow-x-auto border border-gray-100">
                  <code className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                    {codeString}
                  </code>
                </pre>
              )
            }
            
            // Only show fancy CodeBlock for actual code with language or clear code patterns
            if (language || looksLikeCode) {
              return (
                <CodeBlock language={language || 'text'} className={className} {...props}>
                  {children}
                </CodeBlock>
              )
            }
            
            // Fallback: simple pre block
            return (
              <pre className="bg-gray-50 p-2 rounded mt-1 mb-1 overflow-x-auto border border-gray-100">
                <code className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                  {codeString}
                </code>
              </pre>
            )
          },
          
          // Blockquotes with better styling
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-400 pl-3 ml-2 my-2 italic text-gray-700 bg-blue-50 py-1.5 rounded-r">
              {children}
            </blockquote>
          ),
          
          // Lists with better spacing
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 my-2 marker:text-gray-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 my-2 marker:text-gray-500">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          
          // Tables with better styling
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="border-collapse border border-gray-300 text-xs w-full">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody>{children}</tbody>
          ),
          th: ({ children }) => (
            <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-300 px-3 py-2">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 transition-colors">{children}</tr>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="my-4 border-t border-gray-300" />
          ),
          
          // Math components with better spacing and error-safe rendering
          span: ({ className, children, ...props }) => {
            if (className?.includes('math-inline')) {
              return (
                <span className="inline-block mx-0.5">
                  <SafeInlineMath math={String(children)} />
                </span>
              )
            }
            if (className?.includes('math-display')) {
              return (
                <div className="my-3 overflow-x-auto">
                  <SafeBlockMath math={String(children)} />
                </div>
              )
            }
            return <span className={className} {...props}>{children}</span>
          },
          
          div: ({ className, children, ...props }) => {
            if (className?.includes('math-display')) {
              return (
                <div className="my-3 overflow-x-auto">
                  <SafeBlockMath math={String(children)} />
                </div>
              )
            }
            return <div className={className} {...props}>{children}</div>
          },
          
          // Pre tag handling (fallback for code blocks)
          pre: ({ children }) => {
            // Extract text content to check if it's a simple expression
            const child = React.Children.toArray(children)[0]
            const textContent = child?.props?.children 
              ? String(Array.isArray(child.props.children) ? child.props.children.join('') : child.props.children).trim()
              : ''
            
            // If it's a simple single-line expression, render without pre wrapper
            if (textContent && !textContent.includes('\n') && textContent.length < 50) {
              const hasCodePatterns = textContent.includes('{') || 
                textContent.includes('}') || 
                textContent.includes('function') ||
                textContent.includes('const') ||
                textContent.includes('let')
              
              if (!hasCodePatterns) {
                return <span className="inline-block font-mono text-gray-800 mx-0.5">{textContent}</span>
              }
            }
            
            return <>{children}</>
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </Wrapper>
  )
}
