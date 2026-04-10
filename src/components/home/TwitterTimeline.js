'use client'

import { useEffect } from 'react'

export default function TwitterTimeline() {
  useEffect(() => {
    if (window.twttr?.widgets) {
      window.twttr.widgets.load()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://platform.twitter.com/widgets.js'
    script.async = true
    script.charset = 'utf-8'
    document.body.appendChild(script)
  }, [])

  return (
    <a
      className="twitter-timeline"
      data-theme="dark"
      data-height="600"
      href="https://twitter.com/MikeMatshAI"
    >
      Tweets by MikeMatshAI
    </a>
  )
}
