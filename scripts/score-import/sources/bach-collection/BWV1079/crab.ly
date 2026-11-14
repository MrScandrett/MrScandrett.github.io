\version "2.26.0"
% automatically converted by musicxml2ly from /tmp/crab.musicxml
\pointAndClickOff

\include "articulate.ly"

%% additional definitions required by the score:
D = \tweak Stem.direction #DOWN \etc
U = \tweak Stem.direction #UP \etc


\header {
  title = \markup \normal-text \normalsize \fontsize #-1.499 "- # -"
  "id: software" = "MuseScore Studio 4.6.5"
  "id: encoding-date" = "2026-11-13"
}
#(set-global-staff-size 20.030740157480313)
\paper {
  paper-width = 21.59\cm
  paper-height = 27.94\cm
  top-margin = 1.5\cm
  bottom-margin = 1.5\cm
  left-margin = 1.5\cm
  right-margin = 1.5\cm
  indent = 1.66\cm
  short-indent = 0.92\cm
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
PartPOneVoiceOne = \relative c' {
  \clef "treble" \key es \major \U c2 ^\markup \fontsize #3.017
  "Canon a 2 cancrizans (3a)" \U es2 | % 1
  \U g2 \U as2 ^\markup \fontsize #7.126 "MUSICALISCHES OPFER" ^\markup \concat
  { \bold "J. S. Bach " \bold " BWV 1079" } ^\markup \fontsize #2.704
  "Krebs Canon" | % 2
  \U b,2 r4 \U g'4 ~ \break | % 3
  \U g4 \U ges2 \U f4 ~ \break | % 4
  \U f4 \U e2 \U es4 ~ | % 5
  \U es4 \U d4 \U des4 \U c4 | % 6
  \U b4 \U g4 \U c4 \U f4 \break | % 7
  \U es2 \U d2 \break | % 8
  \U c2 \U es2 | % 9

  \barNumberCheck #10
  \U g8 [ \U f8 \U g8 \U c8 ] \U g8 [ \U es8 \U d8 \U es8 ] | % 10
  \U f8 [ \U g8 \U a8 \U b8 ] \U c8 [ \U es,8 \U f8 \U g8 ] \pageBreak | % 11
  \U as8 [ \U d,8 \U es8 \U f8 ] \U g8 [ \U f8 \U es8 \U d8 ] \break | % 12
  \U es8 [ \U f8 \U g8 \U as8 ] \U bes8 [ \U as8 \U g8 \U f8 ] | % 13
  \U g8 [ \U as8 \U bes8 \U c8 ] \U des8 [ \U bes8 \U as8 \U g8 ] | % 14
  \D a8 [ \D b8 \D c8 \D d8 ] \D es8 [ \D c8 \D b8 \D a8 ] \break | % 15
  \D b8 [ \D c8 \D d8 \D es8 ] \D f8 [ \D d8 \D g,8 \D d'8 ] | % 16
  \D c8 [ \D d8 \D es8 \D f8 ] \D es8 [ \D d8 \D c8 \D b8 ] | % 17
  \D c4 \U g4 \U es4 \U c4 \bar "|."
}

PartPTwoVoiceOne = \relative c' {
  \clef "treble" \key es \major \U c4 \U es4 \U g4 \D c4 | % 1
  \D b8 [ \D c8 \D d8 \D es8 ] \D f8 [ \D es8 \D d8 \D c8 ] | % 2
  \D d8 [ \D g,8 \D d'8 \D f8 ] \D es8 [ \D d8 \D c8 \D b8 ] \break | % 3
  \D a8 [ \D b8 \D c8 \D es8 ] \D d8 [ \D c8 \D b8 \D a8 ] \break | % 4
  \U g8 [ \U as8 \U bes8 \U des8 ] \U c8 [ \U bes8 \U as8 \U g8 ] | % 5
  \U f8 [ \U g8 \U as8 \U bes8 ] \U as8 [ \U g8 \U f8 \U es8 ] | % 6
  \U d8 [ \U es8 \U f8 \U g8 ] \U f8 [ \U es8 \U d8 \U as'8 ] \break | % 7
  \U g8 [ \U f8 \U es8 \U c'8 ] \U b8 [ \U a8 \U g8 \U f8 ] \break | % 8
  \U es8 [ \U d8 \U es8 \U g8 ] \U c8 [ \U g8 \U f8 \U g8 ] | % 9

  \barNumberCheck #10
  \U es2 \U c2 | % 10
  \U d2 \U es2 \pageBreak | % 11
  \U f4 \U c4 \U g4 \U b4 \break | % 12
  \U c4 \U des4 \U d4 \U es4 ~ | % 13
  \U es4 \U e2 \U f4 ~ | % 14
  \U f4 \U ges2 \U g4 ~ \break | % 15
  \U g4 r4 \U b,2 | % 16
  \U as'2 ^\markup \fontsize #-2.737
  "JK982.06.10 http://icking-music-archive.org / www.jk-klassik.de" \U g2 | % 17
  \U es2 \U c2 \bar "|."
}


% The score definition
\score {
  <<
    \new StaffGroup <<
      \new Staff = "P1" <<
        \set Staff.instrumentName = "Violine 1"
        \set Staff.shortInstrumentName = "Vl. 1"
        \context Staff <<
          \mergeDifferentlyDottedOn
          \mergeDifferentlyHeadedOn
          \context Voice = "PartPOneVoiceOne" {
            \PartPOneVoiceOne
          }
        >>
      >>
      \new Staff = "P2" <<
        \set Staff.instrumentName = "Violine 2"
        \set Staff.shortInstrumentName = "Vl. 2"
        \context Staff <<
          \override Staff.BarLine.allow-span-bar = ##f
          \mergeDifferentlyDottedOn
          \mergeDifferentlyHeadedOn
          \context Voice = "PartPTwoVoiceOne" {
            \PartPTwoVoiceOne
          }
        >>
      >>
    >>
  >>
  \layout {}
  \midi {}
}