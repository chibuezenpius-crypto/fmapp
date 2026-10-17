import { ChevronRight } from 'lucide-react'
import { buildInbox } from '../inboxMessages'
import { useSponsors } from '../../state/sponsors'
import { PLACEHOLDER_PORTRAIT } from '../../portrait'
import type { GameView } from '../../state/gameStore'
import type { NavActions } from '../navTypes'

/** Shows the most recent inbox message; tapping it opens the inbox. */
export default function BoardMessage({ game, nav }: { game: GameView; nav: NavActions }) {
  const { mail } = useSponsors()
  const messages = buildInbox(game, nav, mail)
  const latest = messages.find((item) => item.sender === 'Board')
  if (!latest) return null
  const heading = 'Board Message'
  return <button aria-label="Open inbox" className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-3xl border-0 bg-white p-3.5 text-left text-[#0b1f4d] shadow-[0_8px_24px_-16px_#0b1f4d66]" onClick={nav.onOpenInbox} type="button">
    <img alt="" className="size-12 shrink-0 rounded-full border-2 border-[#d5e1fa] object-cover" src={PLACEHOLDER_PORTRAIT} />
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <strong className="text-[13px]">{heading}</strong>
      <span className="text-[10px] font-bold text-[#6f84ad]">{latest.from}</span>
      <span className="line-clamp-2 text-[11px] text-[#475a85]">“{latest.detail}”</span>
    </span>
    <ChevronRight aria-hidden="true" className="shrink-0 text-[#0b4aa2]" size={18} />
    <span className="sr-only">{messages.length} messages</span>
  </button>
}
