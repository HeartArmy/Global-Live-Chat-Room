'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChatMessage as ChatMessageType, ReplyInfo, ReactionMap } from '@/types/chat'
import { CornerUpRight, Pencil, Check, X } from 'lucide-react'
import { formatTimestamp, formatAbsolute } from '@/utils/timezone'
import { countryCodeToFlag } from '@/utils/geo'

interface ChatMessageProps {
  message: ChatMessageType
  currentUsername?: string
  currentUserCountry?: string
  index: number
  onReply?: (reply: ReplyInfo) => void
  onEdited?: (updated: ChatMessageType) => void
  onToggleReaction?: (id: string, emoji: string) => Promise<ReactionMap | undefined>
}

export default function ChatMessage({ message, currentUsername, currentUserCountry, index, onReply, onEdited, onToggleReaction }: ChatMessageProps) {
  const isCurrentUser = message.username === currentUsername
  const text = message.message
  const html = message.html
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const savingRef = useRef(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [topEmojis, setTopEmojis] = useState<string[] | null>(null)

  // Only treat as a standalone image message if the entire content is an image markdown or a direct image URL
  const imageMarkdownMatch = text.match(/^\s*!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)\s*$/)
  const directImageUrlMatch = text.match(/^\s*(https?:\/\/[^\s]+\.(?:png|jpe?g|webp|gif))\s*$/i)
  const imageUrl = imageMarkdownMatch?.[2] || directImageUrlMatch?.[1]
  const previewText = imageUrl ? 'Image' : (text.length > 120 ? text.slice(0, 120) + '…' : text)
  const makeReplyInfo = (): ReplyInfo => ({
    id: message._id || `${message.username}-${message.timestamp}`,
    username: message.username,
    preview: previewText,
    imageUrl: imageUrl || undefined,
  })
  // very small, safe renderer: escape HTML, basic markdown for images, **bold**, *italic*, __underline__, `code`, ```blocks```, lists, headers sizes, linkify, and \n -> <br />
  const renderHtml = useMemo(() => {
    const escape = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const linkify = (s: string) => s
      .replace(/(^|\s)(https?:\/\/[^\s]+)(?=\s|$)/gi, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="underline decoration-dotted text-blue-300 hover:text-blue-200">$2</a>')
      .replace(/(^|\s)(www\.[^\s]+)(?=\s|$)/gi, '$1<a href="http://$2" target="_blank" rel="noopener noreferrer" class="underline decoration-dotted text-blue-300 hover:text-blue-200">$2</a>')
      .replace(/(^|\s)((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})(?=\s|$)/gi, '$1<a href="http://$2" target="_blank" rel="noopener noreferrer" class="underline decoration-dotted text-blue-300 hover:text-blue-200">$2</a>')
    const md = (s: string) => {
      // images ![alt](url)
      s = s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (_m, alt, url) => `<img src="${url}" alt="${alt}" class="rounded-xl max-w-[280px] h-auto inline-block align-middle" />`)
      // code blocks (fenced)
      s = s.replace(/```([\s\S]*?)```/g, (_m, p1) => `<pre class="bg-black/10 dark:bg-white/10 rounded-md p-2 overflow-x-auto text-xs"><code>${p1}</code></pre>`)
      // inline code
      s = s.replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 rounded px-1 py-0.5 text-[0.85em]">$1</code>')
      // headers -> font-size
      s = s.replace(/^###\s+(.*)$/gim, '<span class="text-sm">$1</span>')
      s = s.replace(/^##\s+(.*)$/gim, '<span class="text-base">$1</span>')
      s = s.replace(/^#\s+(.*)$/gim, '<span class="text-lg font-semibold">$1</span>')
      // bold, italic, underline
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      s = s.replace(/\*(.+?)\*/g, '<em>$1</em>')
      s = s.replace(/__(.+?)__/g, '<u>$1</u>')
      // unordered lists (- or *)
      s = s.replace(/(^|\n)((?:[-*] .*(?:\n[-*] .*)+))/g, (_m, p1, p2) => {
        const items = String(p2).split(/\n/).map((line: string) => line.replace(/^[-*]\s+(.+)/, '<li>$1</li>')).join('')
        return `${p1}<ul class="list-disc ml-5">${items}</ul>`
      })
      // ordered lists (1. 2. ...)
      s = s.replace(/(^|\n)((?:\d+\. .*(?:\n\d+\. .*)+))/g, (_m, p1, p2) => {
        const items = String(p2).split(/\n/).map((line: string) => line.replace(/^\d+\.\s+(.+)/, '<li>$1</li>')).join('')
        return `${p1}<ol class="list-decimal ml-5">${items}</ol>`
      })
      return s
    }
    let safe = escape(text)
    safe = md(safe)
    safe = linkify(safe)
    safe = safe.replace(/\n/g, '<br />')
    return { __html: safe }
  }, [text])

  const EMOJIS = useMemo(() => ['❤️','😂','😊','👍','🔥','🎉'], [])
  const commonEmojis = useMemo(() => [
    '😀','😁','😂','🤣','😊','😉','😍','🥰','😘','😎','🤔','😅','😭','😴','🥳','🤯',
    '😤','😇','🙃','😐','🥲','😮','😬','🤗','❤️','🧡','💛','💚','💙','💜','🖤','🤍',
    '💯','✨','⭐','🌈','⚡','🔥','🎉','🎈','👍','👎','👏','🙌','🙏','💪','🤝','👋',
    '🍀','🌸','🌞','🌙','🌟','☁️','☕','🍰','🍕','🍔','🍟','🍣','🏆','🎵','📸','🧠'
  ], [])

  // Fetch user's frequently used emojis when opening the picker
  useEffect(() => {
    const run = async () => {
      if (!showEmojiPicker || !currentUsername) return
      try {
        const res = await fetch(`/api/emoji-usage?username=${encodeURIComponent(currentUsername)}&limit=16`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data?.top)) setTopEmojis(data.top)
        }
      } catch {}
    }
    run()
  }, [showEmojiPicker, currentUsername])

  const displayedEmojis = useMemo(() => {
    const base = topEmojis ? [...topEmojis] : []
    const set = new Set(base)
    for (const e of commonEmojis) {
      if (!set.has(e)) base.push(e)
      if (base.length >= 64) break
    }
    return base.length ? base : commonEmojis
  }, [topEmojis, commonEmojis])

  const canEdit = useMemo(() => {
    if (!isCurrentUser) return false
    const createdAt = new Date(message.timestamp)
    const ONE_HOUR = 60 * 60 * 1000
    return Date.now() - createdAt.getTime() <= ONE_HOUR
  }, [isCurrentUser, message.timestamp])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
      id={message._id || `${message.username}-${message.timestamp}`}
    >
      <div className={`group flex max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          className={`relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isCurrentUser 
              ? 'bg-pastel-blue text-gray-100 ml-2' 
              : 'bg-gradient-to-br from-pastel-lilac to-pastel-rose text-gray-100 mr-2'
          }`}
        >
          {message.username.charAt(0).toUpperCase()}
        </motion.div>
        
        {/* Message bubble */}
        <div className="flex flex-col">
          {/* Username + Country flag */}
          <div
            className={`flex items-center ${isCurrentUser ? 'justify-end' : 'justify-start'} gap-1 mb-1 text-xs text-gray-500`}
          >
            <span className="inline-flex items-center gap-1">
              <span className="font-medium text-gray-700 dark:text-gray-300">{message.username}</span>
              <span
                aria-hidden
                title={message.countryCode || undefined}
                className="leading-none"
              >
                {countryCodeToFlag(message.countryCode || (isCurrentUser ? currentUserCountry : undefined))}
              </span>
            </span>
            {/* Quick reactions on hover: left of the bubble */}
            {onToggleReaction && message._id && (
              <div className="pointer-events-none absolute top-1/2 -left-2 -translate-x-full -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="pointer-events-auto inline-flex items-center gap-1 bg-black/10 dark:bg-white/10 rounded-full px-1 py-0.5">
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={async () => {
                        const r = await onToggleReaction(message._id!, em)
                        if (r && onEdited) {
                          onEdited({ ...message, reactions: r })
                        }
                      }}
                      className="px-1.5 py-0.5 rounded-full border border-white/10 hover:bg-white/10 text-xs"
                      title={`React ${em}`}
                    >
                      <span>{em}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={`relative chat-bubble ${isCurrentUser ? 'chat-bubble-user' : 'chat-bubble-other'}`}>
            {message.replyTo && (
              <div className={`mb-2 text-xs rounded-lg p-2 ${isCurrentUser ? 'bg-white/20' : 'bg-black/5 dark:bg-white/10'} border border-black/5 dark:border-white/10`}>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(message.replyTo!.id)
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }}
                  className="w-full text-left"
                  title="Jump to replied message"
                >
                <div className="font-medium opacity-80">{message.replyTo.username}</div>
                <div className="flex items-center gap-2 opacity-70 truncate">
                  {message.replyTo.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={message.replyTo.imageUrl} alt="reply" className="w-8 h-8 rounded object-cover" />
                  )}
                  <span className="truncate">{message.replyTo.preview}</span>
                </div>
                </button>
              </div>
            )}
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  className="w-full rounded-md bg-transparent border border-white/20 p-2 text-sm"
                  value={draft}
                  rows={3}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex gap-2 text-xs">
                  <button
                    className="px-2 py-1 rounded bg-blue-600 text-white inline-flex items-center gap-1"
                    onClick={async () => {
                      if (savingRef.current) return
                      savingRef.current = true
                      try {
                        const res = await fetch('/api/messages', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: message._id, username: currentUsername, message: draft }),
                        })
                        if (res.ok) {
                          const updated = await res.json()
                          onEdited?.(updated)
                          setIsEditing(false)
                        }
                      } finally {
                        savingRef.current = false
                      }
                    }}
                    title="Save edits"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button className="px-2 py-1 rounded bg-gray-600 text-white inline-flex items-center gap-1" onClick={() => { setIsEditing(false); setDraft(text) }} title="Cancel editing">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="uploaded image"
                className="rounded-xl max-w-[280px] h-auto"
                loading="lazy"
              />
            ) : (
              html && html.trim().length > 0 ? (
                <div
                  className="leading-relaxed break-words overflow-x-hidden"
                  dangerouslySetInnerHTML={{ __html: (html || '')
                    // Images responsive
                    .replace(/<img\s/gi, '<img class="rounded-xl max-w-[70vw] sm:max-w-[280px] h-auto inline-block align-middle" ')
                    // Headings sizing
                    .replace(/<h1(\s|>)/gi, '<h1 class="text-2xl font-semibold"$1')
                    .replace(/<h2(\s|>)/gi, '<h2 class="text-base font-medium"$1')
                    .replace(/<h3(\s|>)/gi, '<h3 class="text-sm font-medium opacity-90"$1')
                  }}
                />
              ) : (
                <p className="text-sm leading-relaxed break-words overflow-x-hidden" dangerouslySetInnerHTML={renderHtml} />
              )
            )}
            {/* Metadata row inside bubble */}
            <div className={`mt-2 flex items-center justify-between text-[10px] opacity-70`}>
              <div className="flex items-center gap-2">
                {message.editedAt && <span title={`Edited ${formatAbsolute(new Date(message.editedAt))}`}>edited</span>}
              </div>
              <div className="flex items-center gap-1">
                {canEdit && !imageUrl && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-white/10"
                    title="Edit your message"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Metadata */}
          <div className={`relative flex items-center gap-2 mt-1 text-xs text-gray-400 ${
            isCurrentUser ? 'flex-row-reverse' : 'flex-row'
          }`}>
            <span title={formatAbsolute(new Date(message.timestamp))}>
              {formatTimestamp(new Date(message.timestamp))}
            </span>
            {message.editedAt && (
              <span title={`Edited ${formatAbsolute(new Date(message.editedAt))}`}>• edited</span>
            )}
            {onReply && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onReply(makeReplyInfo())}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-gray-400 hover:text-gray-100 hover:bg-pastel-gray/60 opacity-80 group-hover:opacity-100 transition"
                >
                  <CornerUpRight size={12} />
                  <span>Reply</span>
                </button>
              </>
            )}
            {/* Reactions */}
            {onToggleReaction && message._id && (
              <>
                <span>•</span>
                <div className="inline-flex items-center gap-1 relative">
                  {/* Show only emojis that currently have votes */}
                  {Object.entries(message.reactions || {})
                    .filter(([, users]) => (users || []).length > 0)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([em, users]) => {
                      const count = users.length
                      const mine = users.includes(currentUsername || '')
                      return (
                        <button
                          key={em}
                          type="button"
                          onClick={async () => {
                            const r = await onToggleReaction(message._id!, em)
                            if (r && onEdited) {
                              onEdited({ ...message, reactions: r })
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded-full border text-xs ${mine ? 'bg-white/20 border-white/30' : 'border-white/10 hover:bg-white/10'}`}
                          title={`React ${em}`}
                        >
                          <span className="mr-1">{em}</span>
                          <span>{count}</span>
                        </button>
                      )
                    })}

                  {/* Toggle for full emoji picker */}
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-full border border-white/10 hover:bg-white/10 text-xs"
                    onClick={() => setShowEmojiPicker(v => !v)}
                    title="More reactions"
                  >
                    +
                  </button>

                  {/* Quick reactions moved to bubble-left; keep + for more here */}

                  {showEmojiPicker && (
                    <div className="absolute z-50 bottom-6 right-0 p-2 w-64 bg-pastel-ink rounded-xl border border-pastel-gray drop-shadow-xl">
                      <div className="grid grid-cols-8 gap-1">
                        {displayedEmojis.map((em) => {
                          const count = (message.reactions?.[em] || []).length
                          const mine = (message.reactions?.[em] || []).includes(currentUsername || '')
                          return (
                            <button
                              key={em}
                              type="button"
                              className={`h-8 w-8 flex items-center justify-center rounded hover:bg-pastel-gray/60 text-lg ${mine ? 'ring-1 ring-white/40' : ''}`}
                              onClick={async () => {
                                const r = await onToggleReaction(message._id!, em)
                                if (r && onEdited) {
                                  onEdited({ ...message, reactions: r })
                                }
                              }}
                              aria-label={`React ${em}`}
                              title={count > 0 ? `${count} reaction${count === 1 ? '' : 's'}` : 'Add reaction'}
                            >
                              {em}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
