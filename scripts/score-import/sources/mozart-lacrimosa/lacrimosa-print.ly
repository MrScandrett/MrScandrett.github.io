\version "2.26.0"
% automatically converted by musicxml2ly from /tmp/mozart-lacrimosa/lacrimosa.musicxml
\pointAndClickOff

%% additional definitions required by the score:
hideNote =
  \tweak Dots.transparent ##t
  \tweak NoteHead.transparent ##t
  \tweak NoteHead.no-ledgers ##t
  \tweak Stem.transparent ##t
  \tweak Accidental.transparent ##t
  \tweak Rest.transparent ##t
  \tweak TabNoteHead.transparent ##t \etc

D = \tweak Stem.direction #DOWN \etc
U = \tweak Stem.direction #UP \etc


\header {
  composer = \markup \normal-text \normalsize \fontsize #0.786
  "W. A. Mozart / F. X. Süssmayr"
  title = \markup \normal-text \normalsize \fontsize #6.786
  "Lacrimosa - Requiem"
  subtitle = "Piano arrangement: TheoA · Requiem, K. 626"
  "id: software" = "MuseScore 2.0.3"
  "id: encoding-date" = "2016-06-13"
  "id: source" = "http://api.musescore.com/score/2275496"
}
\layout {
  \context {
    \Staff
    printKeyCancellation = ##f
  }
  \context {
    \Score
    autoBeaming = ##f
  }
}
PartPOneVoiceOne = {
  \clef "treble" \time 12/8 \key c \major \tweak direction #UP \tempo \markup
  \normal-text \concat { \fontsize #0.901 \bold Larghetto " " \normal-text
    \smaller { \fontsize #-2 \rhythm { 2 } \char ##x2009 = \char ##x2009 32 } }
  \oneVoice r8 \D cis''8 ( [ \D d''8 ) ] r8 \D a''8 ( [ \D bes''8 ) ] r8 \D d''8
  ( [ \D cis''8 ) ] r8 \D c'''8 ( [ \D bes''8 ) ] | % 1
  r8 \D a''8 ( [ \D d'''8 ) ] r8 \D bes''8 ( [ \D g''8 ) ] r8 \D e''8 ( [ \D f''8
  ) ] r8 \D a''8 ( [ \D cis''8 ) ] | % 2
  \U <f' ~ a' ~>4. \U <f' a'>8 [ \U <a' f''>8 \U <f' d''>8 ] \D <g' ~ bes' d''>4.
  ( \U <g' a' cis''>4 ) r8 | % 3
  \U <f' ~ a' ~>4. \U <f' a'>8 [ \U <a' f''>8 \U <f' d''>8 ] \D <g' ~ bes' d''>4.
  ( \U <g' a' cis''>4 ) r8 | % 4
  \U <f a d'>4 r8 \U <a cis' e'>4 r8 \U <a d' f'>4 r8 \U <c' e' g'>4 r8 | % 5
  \U <c' f' a'>4 r8 \U <e' gis' b'>4 r8 \U <e' a' c''>4 r8 \U <g' b' d''>4 r8 | % 6
  \D <g' c'' es''>4. \D <g' c'' e''>4. \D <f' c'' f''>4. \D <a' es'' fis''>4. | % 7
  \D <g' d'' g''>4. \D <gis' d'' f'' gis''!>4. \D <a' d'' f'' a''>4. \U <e' a'
    cis''>4 r8 | % 8
  \U <e' ~ g' ~ a' ~>4. \U <e' g' a'>8 [ \U <d' bes'>8 \U <cis' g' a'>8 ] \U <d'
    ~ f' ~ a' ~>4. \U <d' f' a'>8 [ \U <a' f''>8 \U <f' d''>8 ] | % 9

  \barNumberCheck #10
  \D <g' ~ bes' ~ cis'' ~>4. \U <g' ~ bes' cis''>8 [ \U <g' a' cis''>8 \U <g'
    cis'' e''>8 ] \U <f' ~ a' ~ e''>4. \U <f' a' d''>4. | % 10
  \D <es' ~ bes' ~ es''>4. \D <es' bes' es''>8 [ \D <bes' g''>8 \D <g' es''>8 ]
  \U <f' ~ a' ~ es''>4. \U <f' a' d''>4. | % 11
  \hideNote r2. \voiceOne \U e''4. ( \U d''4 ) a''8\rest | % 12
  \hideNote r2. \U f''4. ( \U e''4 ) a''8\rest | % 13
  \U e''4. ~ \U e''4 \U a'8 \hideNote r2. | % 14
  \oneVoice \U <f' as' b'>4. ( \U <f' as' c''>4. \U <f' as' d''>4. \U <f' as'
    d''>4. ) | % 15
  \U <f' as' d''>4. ( \U <f' as' c''>4. \U <f' as' b'>4. \U <f' as' b'>4. ) | % 16
  \U <f' g' b'>4. ( \U <e' g' c''>4. \U <e' g' d''>4. ) \voiceOne \U c''4 ( \U
  f''8 ) | % 17
  \U <d'' ~ f''>4. ( \U <d'' f''>8 [ \U d''8 \U b'!8 ) ] \U c''4. ~ ( \U c''8 [
  \U bes'8 \U g'8 ) ] | % 18
  \oneVoice \U f'8 \U f'8 ( [ \U f''8 ) ] r8 \U f'8 ( [ \U f''8 ) ] r8 \U f'8 (
  [ \U f''8 ) ] \D a'8 ( [ \D c''8 ) \D f''8 ] | % 19

  \barNumberCheck #20
  \voiceOne \U f''4. ~ ( \U f''8 ) [ \U d''8 \U b'!8 ] a''8\rest \U c'''8 ( [ \U
  a''8 ) ] c'''8\rest \U bes''8 ( [ \U g''8 ) ] | % 20
  f''8\rest \U e''8 [ \U f''8 ] a''8\rest \U cis'''8 [ \U d'''8 ] a''8\rest \U
  d''8 ( [ \U cis''!8 ) ] c'''8\rest \U a''8 ( [ \U a'8 ) ] | % 21
  \oneVoice \U <f' ~ a' ~>4. \U <f' a'>8 [ \U <a' f''>8 \U <f' d''>8 ] \D <g' ~
    bes' d''>4. ( \U <g' a' cis''>4 ) r8 | % 22
  \U <f' ~ a' ~>4. \U <f' a'>8 [ \U <a' f''>8 \U <f' d''>8 ] \D <g' ~ bes' d''>4.
  ( \U <g' a' cis''>4 ) r8 | % 23
  \U <f' a' d''>4. \D <a' c''!>4. \D <d'' bes'' d'''>4. \D <c'' fis'' a'' c'''>4.
  | % 24
  \D <bes' g'' bes''>4. \D <a' es'' a''>4. \D <g' bes' e'' g''>4. \D <f' a' d''
    f''>4. | % 25
  r4. \U <d' f' bes' d''>4. \U <cis' e' a' c''>4. \U <d' f' a' d''>4. | % 26
  \U <e' a' cis'' e''>4. \D <f' a' d'' f''>4. \U <e' a' d'' e''>4. \U <e' a'
    cis'' e''>4. | % 27
  \voiceOne a''8\rest \U cis''8 [ \U d''8 ] a''8\rest \U g''8 [ \U fis''8 ] c'''8\rest
  \U bes''8 ( [ \U a''8 ) ] e'''8\rest \U d'''8 ( [ \U c'''8 ) ] | % 28
  \oneVoice <g' bes' d''>1. | % 29

  \barNumberCheck #30
  <fis' a' d''>1. }

PartPOneVoiceTwo = {
  \clef "treble" \time 12/8 \key c \major s2*9 s2*9 s2*9 s1*3 | % 11
  \oneVoice \D <f' a' d''>4. \D <f' a' d''>8 [ \D <a' f''>8 \D <g' e''!>8 ]
  \voiceTwo \D f'4. ~ \D f'8 [ \D bes'8 \D as'8 ] | % 12
  \oneVoice \D <f' ~ as' d'' ~>4. \D <f' g' d''>8 [ \D g''8 \D f''8 ] \voiceTwo
  \D g'4. ~ \D g'8 [ \D c''8 \D bes'8 ] | % 13
  \D <g' ~ bes' ~>4. \D <g' bes'>8 [ \D a'8 \D <e' g'>8 ] \oneVoice \D <e' g'
    a'>4. \U <d' f' a'>4. s1. s1. | % 16
  \hideNote r1 \hideNote r8 \voiceTwo \D f'4. | % 17
  \D <f' ~ bes'>4. \D <f' a'>4 \D <f' a'>8 \D <f' a'!>4. \D <e' g'>4 \D e'8 s1.
  | % 19

  \barNumberCheck #20
  e'8\rest \D f'8 [ \D bes'8 ] e'4\rest e'8\rest \D c''4. ~ \D c''8 [ \D bes'!8
  \D g'8 ] | % 20
  \D f'4 e'8\rest \D <a' d''>4 e'8\rest \D <g' bes'>4 e'8\rest \D <e' a'>4 e'8\rest
  s2*9 s2*9 | % 27
  \D <f' a' d''>4 g'8\rest \D <a' c''!>4 g'8\rest \D <c'' fis''>4 r8 \D <fis''
    a''>4 r8 }

PartPOneVoiceFive = {
  \clef "treble" \time 12/8 \key c \major \oneVoice \D <d' f'>4 r8 \D <f' a'>4 r8
  \D <e' g'>4 r8 \D <g' cis''>4 r8 | % 1
  \D <f' d''>4 r8 \D <g e'>4 r8 \D <f d'>4 r8 \D <a g'>4 r8 | % 2
  \clef "bass" \D d8 [ \D cis'8 ( \D d'8 ) ] \D f8 [ \D a8 ( \D bes8 ) ] \D e8 [
  \D d'8 ( \D cis'8 ) ] \D a,8 [ \D bes8 ( \D a8 ) ] | % 3
  \D d8 [ \D cis'8 ( \D d'8 ) ] \D f8 [ \D a8 ( \D bes8 ) ] \D e8 [ \D d'8 ( \D
  cis'8 ) ] \D a,8 [ \D bes8 ( \D a8 ) ] | % 4
  \U d,8 [ \U d8 ( \U a,8 ) ] \U a,,8 [ \U e8 ( \U a,8 ) ] \D d,8 [ \D f8 ( \D d8
  ) ] \U c,8 [ \U g8 ( \U c8 ) ] | % 5
  \D f,8 [ \D a8 ( \D f8 ) ] \D e,8 [ \D b8 ( \D e8 ) ] \D a,8 [ \D c'8 ( \D a8
  ) ] \D g,!8 [ \D d'8 ( \D g8 ) ] | % 6
  \D c8 [ \D c'8 ( \D g8 ) ] \D bes,8 [ \D c'8 ( \D g8 ) ] \D a,8 [ \D c'8 ( \D
  f8 ) ] \D c8 [ \D es'8 ( \D a8 ) ] | % 7
  \D b,8 [ \D d'8 ( \D g8 ) ] \D bes,8 [ \D d'8 ( \D gis8 ) ] \D a,8 [ \D d'8 (
  \D a8 ) ] \D a,8 [ \D cis'8 ( \D a8 ) ] | % 8
  \D cis8 [ \D a8 ( \D e8 ) ] \D a,8 [ \D a8 ( \D g8 ) ] \D d8 [ \D a8 ( \D f8 )
  ] \D a,8 [ \D d'8 ( \D a8 ) ] | % 9

  \barNumberCheck #10
  \D e8 [ \D bes8 ( \D g8 ) ] \D a,8 [ \D e'8 ( \D a8 ) ] \D f8 [ \D d'8 ( \D a8
  ) ] \D a,8 [ \D cis'8 ( \D d'8 ) ] | % 10
  \D g,8 [ \D bes8 ( \D es8 ) ] \D g,8 [ \D es'!8 ( \D bes8 ) ] \D as,8 [ \D es'8
  ( \D f8 ) ] \D as,8 [ \D d'8 ( \D bes8 ) ] | % 11
  \D a,!8 [ \D d'8 ( \D a8 ) ] \D a,8 [ \D d'8 ( \D a8 ) ] \D bes,8 [ \D bes!8 (
  \D f8 ) ] \D bes,8 [ \D d'8 ( \D bes8 ) ] | % 12
  \D b,8 [ \D d'8 ( \D as8 ) ] \D b,8 [ \D d'8 ( \D g8 ) ] \D c8 [ \D c'8 ( \D g8
  ) ] \D c8 [ \D e'8 ( \D c'8 ) ] | % 13
  \D cis8 [ \D e'8 ( \D bes8 ) ] \D cis8 [ \D e'8 ( \D a8 ) ] \D f8 [ \D d'8 (
  \D a8 ) ] \D d8 [ \D a8 ( \D f8 ) ] | % 14
  \voiceOne \U d8 [ \U f8 \U b8 ] \U c8 [ \U d8 \U c'8 ] \U b,8 [ \U f8 \U d'8 ]
  \U b,8 [ \U f8 \U b8 ] | % 15
  \oneVoice \D b,8 [ \D f8 \D d'8 ] \D c8 [ \D f8 \D c'8 ] \D des8 [ \D f8 \D b8
  ] \D des8 [ \D f8 \D b8 ] | % 16
  \D d!8 [ \D g8 \D b8 ] \D c8 [ \D g8 \D c'8 ] \D bes,8 [ \D g8 \D bes!8 ] \D
  a,8 [ \D f8 \D f8 ] | % 17
  \D bes,8 [ \D f8 \D bes!8 ] \D d8 [ \D f8 \D b8 ] \D c8 [ \D f8 \D c'8 ] \D c8
  [ \D g8 \D bes8 ] | % 18
  \D <f a>4 r8 \U <a, c es f>4 r8 \D <bes, d f>4 r8 \D <c es f>4 r8 | % 19

  \barNumberCheck #20
  \D <bes, d bes>4 r8 \D <d f as>4 r8 \D <c f a>4 r8 \D <c e bes>4 r8 | % 20
  \D <f a>4 r8 \U <f, f>4 r8 \U <e, e>4 r8 \U <a,, a,>4 r8 | % 21
  \D d8 [ \D cis'8 ( \D d'8 ) ] \D f8 [ \D a8 ( \D bes8 ) ] \D e8 [ \D d'8 ( \D
  cis'8 ) ] \D a,8 [ \D bes8 ( \D a8 ) ] | % 22
  \D d8 [ \D cis'8 ( \D d'8 ) ] \D f8 [ \D a8 ( \D bes8 ) ] \D e8 [ \D d'8 ( \D
  cis'8 ) ] \D a,8 [ \D bes8 ( \D a8 ) ] | % 23
  \D d8 [ \D cis'8 ( \D d'8 ) ] \D fis8 [ \D a8 ( \D d'8 ) ] \D g8 [ \D cis'8 (
  \D d'8 ) ] \D d8 [ \D a8 ( \D d'8 ) ] | % 24
  \D es8 [ \D bes8 ( \D es'!8 ) ] \D c8 [ \D <g a>8 ( \D es'8 ) ] \D cis8 [ \D
  <g bes>8 ( \D e'8 ) ] \D d8 [ \D a8 ( \D d'8 ) ] | % 25
  \D g,8 [ \D dis8 ( \D ges8 ) ] \U es,8 [ \U <bes, c>8 ( \U ges8 ) ] \U e,8 [
  \U <bes, des>8 ( \U g8 ) ] \U f,8 [ \U c8 ( \U f8 ) ] | % 26
  \D a,,8 [ \D e8 ( \D a8 ) ] \D a,8 [ \D f8 ( \D d'8 ) ] \D a,8 [ \D e8 ( \D a8
  ) ] \D a,,8 [ \D cis'8 ( \D e8 ) ] | % 27
  \U <d, d>4 r8 \U <d, d>4 r8 \U <d, d>4 r8 \U <d, d>4 r8 | % 28
  \D g,8 [ \D bes8 ( \D g8 ) ] \D d8 [ \D g'8 ( \D d'8 ) ] \D bes,!8 [ \D d'8 (
  \D bes8 ) ] \D g,8 [ \D bes8 ( \D g8 ) ] | % 29

  \barNumberCheck #30
  <d, d>1. }

PartPOneVoiceSix = {
  \clef "treble" \time 12/8 \key c \major s1*3 | % 2
  \clef "bass" s1. s2*9 s2*9 s2*9 s1*3 | % 14
  \D d4. \D c4. \D b,!4. \D b,4. s2*9 s2*9 s2*9 s2*9 }


% The score definition
\score {
  <<
    \new PianoStaff <<
      \set PianoStaff.instrumentName = "Piano"
      \set PianoStaff.shortInstrumentName = "Pno."
      \context Staff = "1" <<
        \mergeDifferentlyDottedOn
        \mergeDifferentlyHeadedOn
        \context Voice = "PartPOneVoiceOne" {
          \voiceOne \PartPOneVoiceOne
        }
        \context Voice = "PartPOneVoiceTwo" {
          \voiceTwo \PartPOneVoiceTwo
        }
      >>
      \context Staff = "2" <<
        \override Staff.BarLine.allow-span-bar = ##f
        \mergeDifferentlyDottedOn
        \mergeDifferentlyHeadedOn
        \context Voice = "PartPOneVoiceFive" {
          \voiceOne \PartPOneVoiceFive
        }
        \context Voice = "PartPOneVoiceSix" {
          \voiceTwo \PartPOneVoiceSix
        }
      >>
    >>
  >>
  \layout {}
  % To create MIDI output, uncomment the following line:
  % \midi { \tempo 4 = 64.0002 }
}

