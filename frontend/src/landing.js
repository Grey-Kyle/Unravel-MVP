import React, { useEffect, useRef, useState } from 'react';
import './landing.css';

/* Unravel landing page — the front door to the existing app.
   Uses only the setView prop passed from App.js. No new auth, API, or routing. */

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={'ul-reveal' + (shown ? ' is-shown' : '')}
      style={{ transitionDelay: delay + 'ms' }}
    >
      {children}
    </div>
  );
}

const K = ({ children }) => <span className="ul-k">{children}</span>;
const N = ({ children }) => <span className="ul-n">{children}</span>;
const F = ({ children }) => <span className="ul-f">{children}</span>;
const V = ({ children }) => <span className="ul-v">{children}</span>;
const Cm = ({ children }) => <span className="ul-c">{children}</span>;

function WindowBar({ label }) {
  return (
    <div className="ul-winbar">
      <span className="ul-dot ul-dot-r" />
      <span className="ul-dot ul-dot-y" />
      <span className="ul-dot ul-dot-g" />
      <span className="ul-winlabel">{label}</span>
    </div>
  );
}

function ChallengeCard() {
  const options = ['8', '9', '5', '11'];
  const correct = '8';
  const [picked, setPicked] = useState(null);
  return (
    <div className="ul-card ul-lift ul-challenge">
      <WindowBar label="challenge.js" />
      <div className="ul-cardhead">
        <span className="ul-mono ul-muted ul-xs">WHAT DOES THIS OUTPUT?</span>
        <span className="ul-pill">+18 EXP</span>
      </div>
      <pre className="ul-code">
        <code>
          <K>let</K> <V>x</V> = <N>5</N>;{'\n\n'}
          <K>for</K> (<K>let</K> <V>i</V> = <N>0</N>; <V>i</V> &lt; <N>3</N>; <V>i</V>++) {'{'}
          {'\n    '}
          <V>x</V> += <V>i</V>;{'\n'}
          {'}'}
          {'\n\n'}
          <F>console</F>.<F>log</F>(<V>x</V>);<span className="ul-caret" />
        </code>
      </pre>
      <div className="ul-cardfoot">
        <div className="ul-options">
          {options.map((o) => {
            const isPicked = picked === o;
            const cls = isPicked ? (o === correct ? ' is-right' : ' is-wrong') : '';
            return (
              <button key={o} type="button" className={'ul-option' + cls} onClick={() => setPicked(o)}>
                {o}
                {isPicked && <span>{o === correct ? '✓' : '✕'}</span>}
              </button>
            );
          })}
        </div>
        <p className="ul-mono ul-xs ul-muted ul-mt">
          {picked === null
            ? '// pick an answer to see if you cracked it'
            : picked === correct
            ? '// cracked it: 5 + 0 + 1 + 2 = 8'
            : '// not quite. trace the loop again.'}
        </p>
      </div>
    </div>
  );
}

const players = [
  { name: 'ByteHunter', exp: 2840 },
  { name: 'NullWalker', exp: 2510 },
  { name: 'CodeGhost', exp: 2270 },
  { name: 'LoopMaster', exp: 1940 },
  { name: 'Syntax', exp: 1720 },
];

function Leaderboard() {
  const ref = useRef(null);
  const [run, setRun] = useState(false);
  const [t, setT] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => e[0].isIntersecting && setRun(true), { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!run) return;
    let f = 0;
    const id = setInterval(() => {
      f += 1;
      setT(1 - Math.pow(1 - f / 48, 3));
      if (f >= 48) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [run]);
  return (
    <div ref={ref} className="ul-panel">
      <div className="ul-row-between ul-mb">
        <span className="ul-mono ul-xs ul-muted ul-caps">Leaderboard</span>
        <span className="ul-mono ul-xs ul-muted">EXP</span>
      </div>
      {players.map((p, i) => (
        <div key={p.name} className="ul-lbrow ul-lift">
          <span className={'ul-rank' + (i === 0 ? ' is-first' : i < 3 ? ' is-top' : '')}>{i + 1}</span>
          <div className="ul-grow">
            <span className="ul-mono ul-sm">{p.name}</span>
            <div className="ul-bar">
              <div style={{ width: run ? (p.exp / 2840) * 100 + '%' : '0%' }} />
            </div>
          </div>
          <span className="ul-mono ul-sm ul-primary">
            {Math.round(p.exp * t).toLocaleString()} <span className="ul-muted">EXP</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function Navbar({ setView }) {
  return (
    <header className="ul-nav">
      <div className="ul-container ul-navinner">
        <a href="#top" className="ul-brand">
          <span className="ul-logo">{'{ }'}</span>
          <span className="ul-display">Unravel</span>
        </a>
        <nav className="ul-navlinks">
          <a href="#how">How it works</a>
          <a href="#value">Challenge value</a>
          <a href="#leaderboard">Leaderboard</a>
          <a href="#create">Create</a>
        </nav>
        <div className="ul-navbtns">
          <button type="button" className="ul-btn ul-btn-ghost" onClick={() => setView('login')}>Login</button>
          <button type="button" className="ul-btn ul-btn-primary" onClick={() => setView('register')}>Sign Up</button>
        </div>
      </div>
    </header>
  );
}

function SectionHead({ tag, title, text }) {
  return (
    <Reveal>
      <div className="ul-sechead">
        <span className="ul-tag">{tag}</span>
        <h2 className="ul-h2">{title}</h2>
        {text && <p className="ul-lead">{text}</p>}
      </div>
    </Reveal>
  );
}

export default function Landing({ setView }) {
  const start = () => setView('register');

  return (
    <div className="unravel-landing" id="top">
      <Navbar setView={setView} />

      {/* Hero */}
      <section className="ul-hero">
        <div className="ul-herobg" />
        <div className="ul-grid-bg" />
        <div className="ul-container ul-herogrid">
          <div className="ul-fadeup">
            <span className="ul-tag">A competitive code-comprehension game</span>
            <h1 className="ul-h1">
              Can You <span className="ul-gradient">Unravel</span> the Code?
            </h1>
            <p className="ul-sub ul-mono">Read it. Trace it. Crack it.</p>
            <p className="ul-lead">
              Unravel turns code comprehension into a competitive game. Predict what the code does, solve
              challenges, earn EXP, and climb the leaderboard.
            </p>
            <div className="ul-ctas">
              <button type="button" className="ul-btn ul-btn-primary ul-btn-lg" onClick={start}>Start Unraveling →</button>
              <button type="button" className="ul-btn ul-btn-ghost ul-btn-lg" onClick={() => setView('login')}>I have an account</button>
            </div>
            <p className="ul-mono ul-xs ul-muted ul-mt">Improving code compregension</p>
          </div>
          <div className="ul-fadeup ul-float" style={{ animationDelay: '150ms' }}>
            <ChallengeCard />
          </div>
        </div>
      </section>

      {/* 1. What it is + 2. How solving works */}
      <section id="how" className="ul-section">
        <div className="ul-container">
          <SectionHead
            tag="01 / How it works"
            title="You don't write the code. You figure it out."
            text="Every challenge is a snippet of JavaScript. Your job is to read it, trace it in your head, and predict the result."
          />
          <div className="ul-steps">
            {[
              ['See the code', 'A short JavaScript snippet appears.'],
              ['Understand it', 'Trace variables, loops, and logic.'],
              ['Predict the output', 'Decide what it really does.'],
              ['Submit', 'Lock in your answer.'],
              ['Earn EXP', 'Correct answers earn EXP.'],
              ['Climb', 'Rise up the leaderboard.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 70}>
                <div className="ul-card ul-lift ul-step">
                  <span className="ul-mono ul-primary ul-xs">0{i + 1}</span>
                  <h3 className="ul-h3">{t}</h3>
                  <p className="ul-muted ul-sm">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Challenge value */}
      <section id="value" className="ul-section ul-alt">
        <div className="ul-container ul-split">
          <SectionHead
            tag="02 / Challenge value"
            title="The harder it is, the more it's worth."
            text="Every time someone fails a challenge, its value goes up. The trickiest snippets become the biggest prizes for whoever cracks them."
          />
          <Reveal delay={100}>
            <div className="ul-panel">
              {[
                ['Fresh challenge', '0 fails', 10],
                ['Getting tricky', '12 fails', 34],
                ['Notorious', '47 fails', 88],
              ].map(([label, fails, exp]) => (
                <div key={label} className="ul-valrow">
                  <div>
                    <div className="ul-sm">{label}</div>
                    <div className="ul-mono ul-xs ul-muted">{fails}</div>
                  </div>
                  <div className="ul-grow ul-bar ul-bar-lg">
                    <div style={{ width: exp + '%' }} />
                  </div>
                  <span className="ul-pill">{exp} EXP</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. EXP & leaderboard */}
      <section id="leaderboard" className="ul-section">
        <div className="ul-container ul-split">
          <SectionHead
            tag="03 / EXP & leaderboard"
            title="Every solve counts."
            text="Correct answers earn EXP. Your EXP decides your spot on the leaderboard. See how you stack up against other players."
          />
          <Reveal delay={100}>
            <Leaderboard />
          </Reveal>
        </div>
      </section>

      {/* 5. Create */}
      <section id="create" className="ul-section ul-alt">
        <div className="ul-container ul-split">
          <SectionHead
            tag="04 / Create"
            title="Think you can stump them?"
            text="Write your own code challenges and publish them for other players to solve. The more people fail it, the more it's worth."
          />
          <Reveal delay={100}>
            <div className="ul-card ul-lift">
              <WindowBar label="new_challenge.js" />
              <pre className="ul-code">
                <code>
                  <K>const</K> <V>a</V> = [<N>1</N>, <N>2</N>, <N>3</N>];{'\n'}
                  <K>const</K> <V>b</V> = <V>a</V>;{'\n'}
                  <V>b</V>.<F>push</F>(<N>4</N>);{'\n\n'}
                  <F>console</F>.<F>log</F>(<V>a</V>.<V>length</V>);{'\n'}
                  <Cm>{'// answer: 4'}</Cm>
                </code>
              </pre>
              <div className="ul-cardfoot ul-row-between">
                <span className="ul-mono ul-xs ul-muted">ready to publish</span>
                <span className="ul-pill">Publish</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 6. Progression */}
      <section id="progress" className="ul-section">
        <div className="ul-container">
          <SectionHead
            tag="05 / Progression"
            title="Track how sharp you're getting."
            text="Your profile keeps track of your EXP, the challenges you've solved, and the ones you've created."
          />
          <div className="ul-steps ul-steps-3">
            {[
              ['EXP', 'Your total earned from solving.'],
              ['Challenges solved', 'Every snippet you cracked.'],
              ['Challenges created', 'Your puzzles for others.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 80}>
                <div className="ul-card ul-lift ul-step">
                  <h3 className="ul-h3">{t}</h3>
                  <p className="ul-muted ul-sm">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="ul-section">
        <div className="ul-container">
          <Reveal>
            <div className="ul-final">
              <h2 className="ul-h2">Think you can read code?</h2>
              <p className="ul-lead">Prove it. Your first challenge is waiting.</p>
              <div className="ul-ctas ul-center">
                <button type="button" className="ul-btn ul-btn-primary ul-btn-lg" onClick={start}>Start Unraveling →</button>
                <button type="button" className="ul-btn ul-btn-ghost ul-btn-lg" onClick={() => setView('login')}>Login</button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="ul-footer">
        <div className="ul-container ul-row-between">
          <span className="ul-mono ul-xs ul-muted">{'{ }'} Unravel</span>
          <span className="ul-mono ul-xs ul-muted">Read it. Trace it. Crack it.</span>
        </div>
      </footer>
    </div>
  );
}
