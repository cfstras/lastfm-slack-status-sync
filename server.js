require('dotenv').config()

const { BOT_ENDPOINT, THEME, AUTO_REFRESH_SECS } = process.env
if (!BOT_ENDPOINT || !THEME) {
  console.error('Missing environment variables. Please read the README.md')
  process.exit(1)
}

const express = require('express')
const app = express()

const lastfm = require('./src/lastfm')
const slack = require('./src/slack')

function getStatusEmoji(nowPlaying) {
  if (THEME === 'lastfm') {
    if (nowPlaying) {
      return 'lastfm-scrobbling'
    } else {
      return 'lastfm'
    }
  }
  return 'notes'
}

function getPlayingText() {
  if (THEME === 'lastfm') return 'Scrobbling now'
  return 'Playing now'
}

function formatMostRecentTrack(mostRecentTrack) {
  const { name, artist, nowPlaying } = mostRecentTrack

  let statusText = `${name} — ${artist}`

  return statusText
}

function syncLastmSlackStatus() {
  return lastfm.getMostRecentTrack()
    .then(mostRecentTrack => {
      const statusText = formatMostRecentTrack(mostRecentTrack)
      const statusEmoji = getStatusEmoji(mostRecentTrack.nowPlaying)
      return slack.setStatus(statusText, statusEmoji)
    })
}

app.get('/', (request, response) => {
  response.sendStatus(200) // don't do anything just respond with a 200 (OK)
})

app.get(`/sync-${BOT_ENDPOINT}`, (request, response) => {
  syncLastmSlackStatus()
    .then(() => {
      response.sendStatus(200)
    })
    .catch(error => {
      console.error(error.stack)
      response.status(500).send('Something broke!')
    })
})

function run() {
    syncLastmSlackStatus()
    .catch(error => console.error(error))
}

if (AUTO_REFRESH_SECS) {
  run()
  setInterval(run, AUTO_REFRESH_SECS * 1000)
}

const listener = app.listen(process.env.PORT, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
