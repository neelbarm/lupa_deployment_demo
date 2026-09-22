import { useEffect, useMemo, useState } from "react";
import { fillPims, MODULE_MAP } from "../../content/modules";
import { moduleStatuses } from "../../logic/metrics";
import { moduleScore, QUIZ_GATE, quizScore, simScore } from "../../logic/scoring";
import { Link, useNav } from "../../router";
import { actions, useAppState } from "../../store";
import type { Stage, TrainingModule } from "../../types";
import { Icon } from "../icons";
import { Confetti, CountUp } from "../primitives";
import { Simulator, type SimResult } from "./Simulator";

const STAGES: { key: Stage; label: string }[] = [
  { key: "compare", label: "Old vs. Lupa" },
  { key: "lesson", label: "Lesson" },
  { key: "quiz", label: "Knowledge check" },
  { key: "sim", label: "Simulation" },
  { key: "result", label: "Result" },
];

interface Props {
  staffId?: string;
  moduleId: string;
  /** Preview mode (deployment team trying the module) records nothing. */
  preview?: boolean;
  backTo: string;
}

export function ModulePlayer({ staffId, moduleId, preview, backTo }: Props) {
  const state = useAppState();
  const { go } = useNav();
  const module = MODULE_MAP[moduleId];
  const staff = staffId ? state.staff.find((s) => s.id === staffId) : undefined;
  const clinic = staff ? state.clinics.find((c) => c.id === staff.clinicId) : state.clinics[0];
  const pims = clinic?.legacyPims ?? "your current PIMS";
  const statuses = staff ? moduleStatuses(state, staff) : [];
  const myStatus = statuses.find((m) => m.moduleId === moduleId);

  const [stage, setStageLocal] = useState<Stage>("compare");
  const [quizRes, setQuizRes] = useState<{ score: number; misses: string[] } | null>(null);
  const [simRes, setSimRes] = useState<SimResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  const record = !preview && !!staff;

  useEffect(() => {
    if (record) actions.startModule(staff!.id, moduleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, runKey]);

  function setStage(s: Stage) {
    setStageLocal(s);
    if (record && s !== "result") actions.setStage(staff!.id, moduleId, s);
    document.querySelector(".player")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  if (!module) return <div className="page">Module not found.</div>;

  if (staff && myStatus && !myStatus.unlocked && !preview) {
    const prev = statuses[statuses.indexOf(myStatus) - 1];
    return (
      <div className="page narrow">
        <div className="locked-card">
          <Icon name="lock" size={28} />
          <h2>{module.title} is locked</h2>
          <p>
            Pass <strong>{MODULE_MAP[prev.moduleId].title}</strong> first. Modules unlock in order so your clinic's rollout builds on
            what you already know.
          </p>
          <Link to={backTo} className="btn btn-primary">
            Back to my training
          </Link>
        </div>
      </div>
    );
  }

  const finalScore = quizRes && simRes ? moduleScore(quizRes.score, simScore(simRes.errors, simRes.hints)) : 0;
  const passed = finalScore >= module.passScore;
  const idxStatus = statuses.findIndex((m) => m.moduleId === moduleId);
  const nextId = statuses[idxStatus + 1]?.moduleId;

  function finishSim(r: SimResult) {
    setSimRes(r);
    const ss = simScore(r.errors, r.hints);
    const score = moduleScore(quizRes!.score, ss);
    if (record) {
      actions.submitAttempt({
        staffId: staff!.id,
        moduleId,
        startedAt: Date.now() - r.durationSec * 1000,
        finishedAt: Date.now(),
        quizScore: quizRes!.score,
        simScore: ss,
        score,
        passed: score >= module.passScore,
        errors: r.errors,
        hints: r.hints,
        durationSec: r.durationSec,
        mistakes: r.mistakes,
        quizMisses: quizRes!.misses,
      });
    }
    setTimeout(() => setStage("result"), 900);
  }

  function retake() {
    setQuizRes(null);
    setSimRes(null);
    setRunKey((k) => k + 1);
    setStageLocal("lesson");
  }

  const current = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="player">
      <header className="player-head">
        <Link to={backTo} className="back-link">
          <Icon name="back" size={16} /> {preview ? "Module library" : "My training"}
        </Link>
        <div className="player-title">
          <span className="eyebrow">
            {module.category} · ~{module.minutes} min · pass mark {module.passScore}%{preview ? " · Preview (not recorded)" : ""}
          </span>
          <h1>{module.title}</h1>
        </div>
        <ol className="stepper" aria-label="Module progress">
          {STAGES.map((s, i) => (
            <li key={s.key} className={i < current ? "is-done" : i === current ? "is-current" : ""}>
              <span>{i < current ? <Icon name="check" size={12} /> : i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>
      </header>

      {stage === "compare" && <Compare module={module} pims={pims} onNext={() => setStage("lesson")} />}
      {stage === "lesson" && <Lesson module={module} pims={pims} onNext={() => setStage("quiz")} reviewMistakes={simRes?.mistakes} />}
      {stage === "quiz" && (
        <Quiz
          key={runKey}
          module={module}
          onDone={(score, misses) => {
            const gate = score >= QUIZ_GATE;
            if (record) actions.recordQuiz(staff!.id, moduleId, score, gate);
            if (gate) {
              setQuizRes({ score, misses });
            }
            return gate;
          }}
          onContinue={() => setStage("sim")}
        />
      )}
      {stage === "sim" && (
        <Simulator
          key={runKey}
          module={module}
          clinicName={clinic?.name ?? "Your clinic"}
          onError={(i, e, instr) => record && actions.recordSimError(staff!.id, moduleId, i, e, instr)}
          onStep={(i, e) => record && actions.recordSimStep(staff!.id, moduleId, i, e)}
          onComplete={finishSim}
        />
      )}
      {stage === "result" && quizRes && simRes && (
        <Result
          module={module}
          quiz={quizRes.score}
          sim={simRes}
          final={finalScore}
          passed={passed}
          preview={preview}
          onRetake={retake}
          onNext={nextId && passed && !preview ? () => go(`/learn/${staff!.id}/m/${nextId}`) : undefined}
          onBack={() => go(backTo)}
        />
      )}
    </div>
  );
}

function Compare({ module, pims, onNext }: { module: TrainingModule; pims: string; onNext: () => void }) {
  return (
    <section className="player-body">
      <p className="lede">{module.summary}</p>
      <div className="compare">
        <div className="compare-col compare-old">
          <span className="eyebrow">How you do it today in {pims}</span>
          <ol>
            {module.oldWay.map((s, i) => (
              <li key={i}>{fillPims(s, pims)}</li>
            ))}
          </ol>
        </div>
        <div className="compare-arrow" aria-hidden="true">
          <Icon name="arrow" size={22} />
        </div>
        <div className="compare-col compare-new">
          <span className="eyebrow">How you'll do it in Lupa</span>
          <ol>
            {module.newWay.map((s, i) => (
              <li key={i}>{fillPims(s, pims)}</li>
            ))}
          </ol>
        </div>
      </div>
      <p className="impact">
        <Icon name="bolt" size={16} /> {module.impact}
      </p>
      <div className="player-actions">
        <button className="btn btn-primary" onClick={onNext}>
          Start the lesson <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  );
}

function Lesson({
  module,
  pims,
  onNext,
  reviewMistakes,
}: {
  module: TrainingModule;
  pims: string;
  onNext: () => void;
  reviewMistakes?: { stepId: string; clicked: string }[];
}) {
  const [read, setRead] = useState<boolean[]>(module.lesson.map(() => false));
  const all = read.every(Boolean);
  const missedSteps = [...new Set((reviewMistakes ?? []).map((m) => m.stepId))]
    .map((id) => module.sim.steps.find((s) => s.id === id))
    .filter(Boolean);
  return (
    <section className="player-body">
      {missedSteps.length > 0 && (
        <div className="review-box">
          <span className="eyebrow">Review before your retake</span>
          <p>Last time these steps tripped you up:</p>
          <ul>
            {missedSteps.map((s) => (
              <li key={s!.id}>
                <strong>{s!.instruction}</strong> ({s!.hint})
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="lesson-list">
        {module.lesson.map((l, i) => (
          <article key={i} className={`lesson-card ${read[i] ? "is-read" : ""}`}>
            <h3>{l.heading}</h3>
            <p>{fillPims(l.body, pims)}</p>
            <label className="check">
              <input
                id={`lesson-${module.id}-${i}`}
                type="checkbox"
                checked={read[i]}
                onChange={() => setRead(read.map((r, j) => (j === i ? !r : r)))}
              />
              Got it
            </label>
          </article>
        ))}
      </div>
      <div className="player-actions">
        <span className="fine">{all ? "Ready for the knowledge check." : "Tick each section once you've understood it."}</span>
        <button className="btn btn-primary" disabled={!all} onClick={onNext}>
          Take the knowledge check <Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  );
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Quiz({
  module,
  onDone,
  onContinue,
}: {
  module: TrainingModule;
  onDone: (score: number, misses: string[]) => boolean;
  onContinue: () => void;
}) {
  const [round, setRound] = useState(0);
  const orders = useMemo(
    () => module.quiz.map((q) => shuffle(q.options.map((_, i) => i))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [module.id, round],
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<null | { score: number; gate: boolean }>(null);
  const complete = module.quiz.every((q) => answers[q.id] !== undefined);

  function submit() {
    const misses = module.quiz.filter((q) => answers[q.id] !== q.correct).map((q) => q.id);
    const score = quizScore(module.quiz.length - misses.length, module.quiz.length);
    const gate = onDone(score, misses);
    setSubmitted({ score, gate });
  }

  function retry() {
    setAnswers({});
    setSubmitted(null);
    setRound((r) => r + 1);
  }

  return (
    <section className="player-body">
      <div className="quiz">
        {module.quiz.map((q, qi) => (
          <fieldset key={q.id + round} className="quiz-q" disabled={!!submitted}>
            <legend>
              <span className="num">{qi + 1}.</span> {q.prompt}
            </legend>
            {orders[qi].map((oi) => {
              const chosen = answers[q.id] === oi;
              const state = submitted ? (oi === q.correct ? "is-correct" : chosen ? "is-wrong" : "") : chosen ? "is-chosen" : "";
              return (
                <label key={oi} className={`quiz-opt ${state}`}>
                  <input
                    type="radio"
                    id={`q-${module.id}-${q.id}-${oi}`}
                    name={`${module.id}-${q.id}-${round}`}
                    checked={chosen}
                    onChange={() => setAnswers({ ...answers, [q.id]: oi })}
                  />
                  {q.options[oi]}
                </label>
              );
            })}
            {submitted && <p className={`quiz-explain ${answers[q.id] === q.correct ? "ok" : "no"}`}>{q.explain}</p>}
          </fieldset>
        ))}
      </div>
      <div className="player-actions">
        {!submitted && (
          <>
            <span className="fine">You need {QUIZ_GATE}% to unlock the hands-on simulation.</span>
            <button className="btn btn-primary" disabled={!complete} onClick={submit}>
              Submit answers
            </button>
          </>
        )}
        {submitted && submitted.gate && (
          <>
            <span className="score-chip good">Knowledge check: {submitted.score}%</span>
            <button className="btn btn-primary" onClick={onContinue}>
              Start the simulation <Icon name="play" size={15} />
            </button>
          </>
        )}
        {submitted && !submitted.gate && (
          <>
            <span className="score-chip crit">
              {submitted.score}%. You need {QUIZ_GATE}% to continue.
            </span>
            <button className="btn btn-primary" onClick={retry}>
              <Icon name="refresh" size={15} /> Retake knowledge check
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Result({
  module,
  quiz,
  sim,
  final,
  passed,
  preview,
  onRetake,
  onNext,
  onBack,
}: {
  module: TrainingModule;
  quiz: number;
  sim: SimResult;
  final: number;
  passed: boolean;
  preview?: boolean;
  onRetake: () => void;
  onNext?: () => void;
  onBack: () => void;
}) {
  const ss = simScore(sim.errors, sim.hints);
  const missed = [...new Set(sim.mistakes.map((m) => m.stepId))].map((id) => module.sim.steps.find((s) => s.id === id)!);
  return (
    <section className="player-body">
      {passed && <Confetti />}
      <div className={`result ${passed ? "is-pass" : "is-fail"}`}>
        <div className="result-score">
          <span className="eyebrow">{passed ? "Certified" : "Not yet"}</span>
          <strong className="num">
            <CountUp value={final} suffix="%" />
          </strong>
          <span className="fine">pass mark {module.passScore}%</span>
        </div>
        <div className="result-copy">
          <h2>{passed ? `You're certified on ${module.title}.` : "Almost. This one needs a retake."}</h2>
          <p>
            {passed
              ? preview
                ? "Preview only: nothing was recorded."
                : "Your deployment team at Lupa can see this now. The next module is unlocked."
              : `You need ${module.passScore}% to move on. Review the steps below, then retake. Only your best attempt counts toward certification.`}
          </p>
          <dl className="result-break">
            <div>
              <dt>Knowledge check</dt>
              <dd className="num">{quiz}%</dd>
            </div>
            <div>
              <dt>Workflow simulation</dt>
              <dd className="num">{ss}%</dd>
            </div>
            <div>
              <dt>Wrong moves</dt>
              <dd className="num">{sim.errors}</dd>
            </div>
            <div>
              <dt>Hints used</dt>
              <dd className="num">{sim.hints}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd className="num">
                {Math.floor(sim.durationSec / 60)}m {sim.durationSec % 60}s
              </dd>
            </div>
          </dl>
        </div>
      </div>
      {missed.length > 0 && (
        <div className="review-box">
          <span className="eyebrow">Where you went off-workflow</span>
          <ul>
            {missed.map((s) => (
              <li key={s.id}>
                <strong>{s.instruction}</strong> ({s.hint})
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="player-actions">
        {!passed && (
          <button className="btn btn-primary" onClick={onRetake}>
            <Icon name="refresh" size={15} /> Retake module
          </button>
        )}
        {passed && onNext && (
          <button className="btn btn-primary" onClick={onNext}>
            Next module <Icon name="arrow" size={16} />
          </button>
        )}
        {passed && (
          <button className="btn btn-quiet" onClick={onRetake}>
            Practise again
          </button>
        )}
        <button className="btn btn-quiet" onClick={onBack}>
          {preview ? "Back to library" : "Back to my training"}
        </button>
      </div>
    </section>
  );
}
