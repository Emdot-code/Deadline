import StudioScene from './StudioScene.jsx'
import SafeView from './SafeView.jsx'
import DoorScreen from './DoorScreen.jsx'
import { Announcement, Countdown, DaemonLine, DaemonOverlay, EndScreen, ToolRow } from './Hud.jsx'
import { resetGame, useGame } from './game.js'

// The sunset behind the studio: a pale sun and three layers of soft dunes, like a landscape
// from Alto's Adventure or Journey.
function Landscape() {
  return (
    <div className="landscape" aria-hidden="true">
      <div className="sun" />
      <svg viewBox="0 0 1200 300" preserveAspectRatio="none">
        <path className="dune far" d="M0 170 C 180 110 320 120 480 150 S 820 90 1000 130 S 1150 150 1200 120 V300 H0 Z" />
        <path className="dune mid" d="M0 220 C 160 170 360 190 520 210 S 860 160 1040 190 S 1160 205 1200 190 V300 H0 Z" />
        <path className="dune near" d="M0 260 C 220 225 420 240 640 255 S 980 225 1200 245 V300 H0 Z" />
      </svg>
    </div>
  )
}

export default function App() {
  // the day starts at the studio doors; the studio itself is only built once you walk in,
  // so a new day always starts with everyone back at their desk
  const { phase } = useGame()

  return (
    <div className="app">
      <Landscape />
      {phase === 'door' ? (
        <DoorScreen />
      ) : (
        <>
          <SafeView label="The studio view" className="broken-studio">
            <StudioScene />
          </SafeView>
          <DaemonOverlay />
          <Countdown />
          <DaemonLine />
          <ToolRow />
          <Announcement />
          <EndScreen onRestart={resetGame} />
        </>
      )}
    </div>
  )
}
