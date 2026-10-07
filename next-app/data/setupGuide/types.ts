import { F1Setup } from '@/types/setup'
import { CornerPhase } from '@/data/setupParameters'

/**
 * Long-form knowledge about one setup parameter.
 * Values and ranges live in SetupParameterDefinition; this is only the
 * explanation. The matrix on the definition is the spine, and nothing here
 * may contradict it.
 */
export interface SetupGuide {
  id: keyof F1Setup

  /**
   * Plain English as cause → effect chains, no jargon. Each row is rendered
   * as chips joined by arrows. `tone` colours the row by slider direction;
   * `strength` dims or emphasises the final effect.
   */
  plain: Array<{
    steps: string[]
    tone?: 'higher' | 'lower'
    strength?: 'strong' | 'weak'
  }>

  /** If/then rules in plain English, rendered as rows under the plain text */
  rules?: Array<{ when: string; then: 'raise' | 'lower' | 'other'; do: string }>

  /** The physics, 2-4 short paragraphs. First paragraph is the one-idea core. */
  mechanism: string[]

  /** The single rule to carry away, one sentence */
  invariant: string

  /** Settings whose effect overlaps or opposes this one */
  interactsWith: Array<{
    id: keyof F1Setup
    /** How the two combine, one sentence */
    how: string
  }>

  /** What you feel in the car → which way to move this knob */
  symptoms: Array<{
    symptom: string
    phase: CornerPhase | 'straight'
    change: 'raise' | 'lower'
    /** Why this knob and not another, one clause */
    because: string
  }>

  /** Channels in the telemetry that show the effect */
  signals: Array<{
    channel: string
    look: string
  }>

  /** Where the setting breaks down or lies to you */
  failureModes: string[]

  /** Concrete track examples: what value, and why that track wants it */
  examples?: Array<{
    track: string
    /** Typical value or range in F1 25, as text so ranges are allowed */
    value: string
    /** 0..1 position of that value within the parameter's range, for the bar */
    position: number
    /** Character of the track that drives the choice */
    character: string
    why: string
  }>
}
